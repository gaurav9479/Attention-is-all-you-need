import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import {
  fetchGraph,
  fetchFileContent,
  fetchSummary,
  cloneRepo,
  fetchTree,
  fetchImpactSimulation,
  queryMcp,
  fetchMcpNode,
  fetchChat,
  apiGetVirtualLayer,
  apiSaveVirtualLayer
} from "../services/api";
import { getLayoutedElements } from "../utils/layout";

import Navbar from "../components/Layout/Navbar";
import SidebarLeft from "../components/Layout/SidebarLeft";
import InsightPanel from "../components/Panel/InsightPanel";
import StatusBar from "../components/Layout/StatusBar";
import GraphView from "../components/Graph/GraphView";
import CosmicGraphView from "../components/Graph/CosmicGraphView";
import ChatBot from "../components/UI/ChatBot";

export default function Analyzer() {
  const location = useLocation();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [tree, setTree] = useState(null);
  const [repoName, setRepoName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState("all");
  const [uiMode, setUiMode] = useState(location.state?.uiMode || "normal"); // Inherit from Landing Screen

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [impactAnalysis, setImpactAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mcpQuery, setMcpQuery] = useState("");

  // Auto-trigger analysis when dropped into this route from Home
  useEffect(() => {
    if (location.state?.repoUrl) {
      handleAnalyze(location.state.repoUrl);
    }
  }, [location.state?.repoUrl]);
  const [isImpactLoading, setIsImpactLoading] = useState(false);
  const [impactChangeType, setImpactChangeType] = useState("modify");
  const [highlightNodeIds, setHighlightNodeIds] = useState([]);
  const [highlightEdgeIds, setHighlightEdgeIds] = useState([]);

  const runImpactSimulation = useCallback(
    async ({ nodeId, changeType = "modify" }) => {
      if (!repoName) return null;

      setIsImpactLoading(true);
      try {
        const impact = await fetchImpactSimulation({
          repo: repoName,
          nodeId: nodeId || null,
          changeType,
          maxDepth: 3,
          limit: 10,
        });

        setImpactAnalysis(impact);
        setHighlightNodeIds(impact?.ui_hints?.highlight_node_ids || []);
        setHighlightEdgeIds(impact?.ui_hints?.highlight_edge_ids || []);
        return impact;
      } finally {
        setIsImpactLoading(false);
      }
    },
    [repoName]
  );

  const [virtualNodes, setVirtualNodes] = useState([]);
  const [virtualEdges, setVirtualEdges] = useState([]);

  // Autosave Virtual Layer (Manual Architecture)
  useEffect(() => {
    if (!repoName || (virtualNodes.length === 0 && virtualEdges.length === 0)) return;
    const timer = setTimeout(() => {
      apiSaveVirtualLayer(repoName, virtualNodes, virtualEdges).catch(console.error);
    }, 2000);
    return () => clearTimeout(timer);
  }, [repoName, virtualNodes, virtualEdges]);

  const handleAnalyze = async (repoUrl) => {
    setIsLoading(true);
    try {
      const cloneData = await cloneRepo(repoUrl);
      const name = cloneData.repoName;
      setRepoName(name);

      const [treeData, graphData, initialMcp, vLayer] = await Promise.all([
        fetchTree(name),
        fetchGraph(name),
        queryMcp(name, { query: "architecture entry point", limit: 3, mode: uiMode }).catch(() => null),
        apiGetVirtualLayer(name).catch(() => ({ nodes: [], edges: [] }))
      ]);

      setTree(treeData);
      setVirtualNodes(vLayer.nodes || []);
      setVirtualEdges(vLayer.edges || []);

      if (graphData) {
        let typedNodes = (graphData.nodes || []).map((n) => ({
          ...n,
          type: "custom",
        }));
        
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(typedNodes, graphData.edges || []);
        
        // Final Merge: Scanned + Virtual (Deduplicated)
        const combinedNodes = [...lNodes, ...(vLayer.nodes || [])];
        const uniqueNodes = Array.from(new Map(combinedNodes.map(n => [n.id, n])).values());
        setNodes(uniqueNodes);

        const combinedEdges = [...lEdges, ...(vLayer.edges || [])];
        const uniqueEdges = Array.from(new Map(combinedEdges.map(e => [e.id, e])).values());
        setEdges(uniqueEdges);
        
        if (initialMcp) {
          setSelectedFile({ name: "Repository Architecture", path: "/" });
          setAnalysis({
            ...initialMcp,
            summary: `System topology mapped. Analyzed ${typedNodes.length} modules and ${graphData.edges?.length || 0} connections.`
          });
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMcpQuery = async (e) => {
    e.preventDefault();
    if (!mcpQuery.trim() || !repoName) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setSelectedFile({ name: `MCP Search: "${mcpQuery}"`, path: null });
    
    try {
      const payload = await queryMcp(repoName, {
        query: mcpQuery,
        limit: 12,
        mode: uiMode
      });
      setAnalysis(payload);
    } catch (err) {
      console.error("MCP Query failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onNodeClick = useCallback(async (_, node) => {
    // Determine the precise node ID (relative path) to synchronize perfectly with the MCP Engine backend
    const nodeData = node.data || node;
    const nodeIdToFetch = node.id || nodeData.id || nodeData.path;
    
    // Don't analyze virtual nodes with RAG unless we add support for it
    if (!nodeIdToFetch || nodeData.type === 'virtual') return;

    const fileData = { name: nodeData.label || nodeData.name, path: nodeData.path };
    setSelectedFile(fileData);
    setSelectedNodeId(node.id || null);
    setImpactChangeType("modify");
    setIsAnalyzing(true);
    setAnalysis(null);
    setImpactAnalysis(null);
    setHighlightNodeIds([]);
    setHighlightEdgeIds([]);

    try {
      const codeResp = await fetchFileContent(node.data.path, repoName);

      const [summary, impact] = await Promise.all([
        fetchChat(`Analyze this codebase node: ${node.data.label}`, `Analyze for context summary.`, codeResp.content, node.data.path),
        runImpactSimulation({ nodeId: node.id || null, changeType: "modify" }),
      ]);

      setAnalysis(summary);
    } catch (err) {
      console.error("Parallel node analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [repoName, runImpactSimulation]);

  const handleRunImpactSimulation = useCallback(
    async (nextChangeType) => {
      if (!selectedFile || !repoName) return;
      const type = nextChangeType || impactChangeType;
      setImpactChangeType(type);
      await runImpactSimulation({ nodeId: selectedNodeId, changeType: type });
    },
    [selectedFile, repoName, impactChangeType, selectedNodeId, runImpactSimulation]
  );

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => {
       const next = applyNodeChanges(changes, nds);
       // Sync back to virtual layer state if needed
       const virtuals = next.filter(n => n.data?.type === 'virtual');
       setVirtualNodes(virtuals);
       return next;
    }),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => {
       const next = applyEdgeChanges(changes, eds);
       const virtuals = next.filter(e => e.data?.type === 'manual');
       setVirtualEdges(virtuals);
       return next;
    }),
    []
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#0d0d0f] text-slate-200 overflow-hidden font-sans">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <SidebarLeft 
          tree={tree} 
          onSelect={(item) => onNodeClick(null, { data: { label: item.name, path: item.fullPath } })} 
          selectedPath={selectedFile?.path} 
        />
        
        <main className="flex-1 relative bg-[#09090b]">
           {/* Floating MCP Command Bar */}
           <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] w-[450px]">
             <form onSubmit={handleMcpQuery} className="relative group">
               <div className="absolute -inset-1 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-500 bg-blue-500"></div>
               <div className="relative flex items-center bg-slate-900 shadow-2xl border border-slate-700 rounded-xl overflow-hidden">
                 <div className="pl-4 text-blue-500">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 </div>
                 <input
                   type="text"
                   value={mcpQuery}
                   onChange={(e) => setMcpQuery(e.target.value)}
                   placeholder="Prompt the MCP (e.g. 'auth logic' or 'database routing')"
                   className="w-full bg-transparent border-none outline-none text-[13px] font-mono text-slate-200 px-3 py-3"
                 />
                 <button type="submit" className="px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400 hover:text-white transition-colors border-l border-slate-800 bg-slate-950/50 hover:bg-slate-800 h-full">Query</button>
               </div>
             </form>
           </div>

           <div className="absolute top-6 right-6 z-[100]">
             <button 
               onClick={() => setUiMode(m => m === 'normal' ? 'cosmic' : 'normal')}
               className="px-4 py-2 bg-slate-900/50 backdrop-blur-xl border border-white/10 text-slate-300 rounded-xl text-[10px] font-bold shadow-2xl hover:bg-slate-800 transition-colors uppercase tracking-widest"
             >
               Switch to {uiMode === 'normal' ? 'Cosmic 3D Mode' : 'Architect Mode'}
             </button>
           </div>
           
           {uiMode === 'normal' ? (
             <GraphView 
               nodes={nodes}
               edges={edges}
               loading={isLoading}
               levelFilter={levelFilter}
               onNodesChange={onNodesChange}
               onEdgesChange={onEdgesChange}
               onNodeClick={onNodeClick}
             />
           ) : (
             <CosmicGraphView 
               nodes={nodes}
               edges={edges}
               loading={isLoading}
               onNodeClick={(node) => onNodeClick(null, node)}
             />
           )}
        </main>

        <InsightPanel 
          selectedFile={selectedFile}
          analysis={analysis}
          impactAnalysis={impactAnalysis}
          impactType={impactChangeType}
          impactLoading={isImpactLoading}
          onRunImpactSimulation={handleRunImpactSimulation}
          isLoading={isAnalyzing}
        />
      </div>

      <StatusBar 
        status={isLoading ? "Processing Repository..." : "System Ready"} 
        stats={{ repoName, totalFiles: nodes.filter(n => n.data?.type === 'file').length, totalFunctions: nodes.filter(n => n.data?.type === 'function').length }} 
      />

      <ChatBot 
        repoName={repoName}
        selectedNode={selectedFile ? { ...selectedFile, id: selectedNodeId } : null}
        mode={uiMode}
      />
    </div>
  );
}
