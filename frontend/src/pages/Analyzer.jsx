import { useState, useCallback, useEffect } from "react";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import { useLocation } from "react-router-dom";
import { fetchGraph, fetchMcpNode, queryMcp, cloneRepo, fetchTree, fetchFileContent, fetchSummary } from "../services/api";
import { getLayoutedElements } from "../utils/layout";

import Navbar from "../components/Layout/Navbar";
import SidebarLeft from "../components/Layout/SidebarLeft";
import InsightPanel from "../components/Panel/InsightPanel";
import StatusBar from "../components/Layout/StatusBar";
import GraphView from "../components/Graph/GraphView";
import CosmicGraphView from "../components/Graph/CosmicGraphView";

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
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mcpQuery, setMcpQuery] = useState("");

  // Auto-trigger analysis when dropped into this route from Home
  useEffect(() => {
    if (location.state?.repoUrl) {
      handleAnalyze(location.state.repoUrl);
    }
  }, [location.state?.repoUrl]);

  const handleAnalyze = async (repoUrl) => {
    setIsLoading(true);
    try {
      // 1. Clone Repo (Sequential lock - Required to get the repo name)
      const cloneData = await cloneRepo(repoUrl);
      const name = cloneData.repoName;
      setRepoName(name);

      // 2. Fetch EVERYTHING in pure parallel (Tree, Graph, and Initial Root MCP Analysis)
      const [treeData, graphData, initialMcp] = await Promise.all([
        fetchTree(name),
        fetchGraph(name),
        queryMcp(name, { query: "architecture entry point", limit: 3, mode: uiMode }).catch(() => null)
      ]);

      setTree(treeData);

      if (graphData) {
        let typedNodes = (graphData.nodes || []).map((n) => ({
          ...n,
          type: "custom",
        }));
        
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(typedNodes, graphData.edges || []);
        setNodes(lNodes);
        setEdges(lEdges);
        
        // Auto-populate the Insight panel with the baseline MCP overview of the entire app
        if (initialMcp) {
          setSelectedFile({ name: "Repository Architecture", path: "/" });
          setAnalysis(initialMcp);
        }
      }
    } catch (err) {
      console.error("Parallel analysis failed:", err);
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
    const nodeData = node.data || node;
    const nodeIdToFetch = nodeData.id || nodeData.path;
    if (!nodeIdToFetch) return;

    setSelectedFile({ name: nodeData.label || nodeData.name, path: nodeData.path });
    setIsAnalyzing(true);
    
    // Optimistic UI state
    setAnalysis({ summary: "Parallel engines running: Extracting structures & semantics..." });

    try {
      // Launch MCP Structural Sweep and LLM Semantic Reasoner concurrently
      const mcpPromise = fetchMcpNode(repoName, nodeIdToFetch, uiMode);
      
      let aiPromise = Promise.resolve(null);
      if (nodeData.path && nodeData.type !== 'function' && nodeData.type !== 'class') {
        aiPromise = fetchFileContent(nodeData.path, repoName)
          .then(async (codeResp) => await fetchSummary(nodeData.label || nodeData.name, codeResp.content))
          .catch(err => {
            console.error("AI Semantic backend degraded:", err);
            return null;
          });
      }

      // Merge results as they stream in
      mcpPromise.then(mcpPayload => {
        setAnalysis(prev => ({
          ...mcpPayload,
          summary: prev?.summary?.includes("Parallel") ? "Structural map locked. Waiting for semantics..." : prev?.summary || mcpPayload.summary
        }));
      }).catch(err => console.error("MCP Map fetch failed", err));

      aiPromise.then(aiSummary => {
        if (aiSummary && aiSummary.purpose) {
          setAnalysis(prev => ({
            ...(prev || {}),
            summary: aiSummary.purpose
          }));
        } else {
             setAnalysis(prev => ({
                ...(prev || {}),
                summary: prev?.summary?.includes("Waiting") ? (prev.summary_fallback || "No custom semantics found.") : prev?.summary
             }));
        }
      });

      await Promise.allSettled([mcpPromise, aiPromise]);

    } catch (err) {
      console.error("Parallel node analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [repoName, uiMode]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
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
          analysis={analysis} // this is now the rich MCP payload
          isLoading={isAnalyzing}
        />
      </div>

      <StatusBar 
        status={isLoading ? "Processing Repository..." : "System Ready"} 
        stats={{ repoName, totalFiles: nodes.filter(n => n.data?.type === 'file').length, totalFunctions: nodes.filter(n => n.data?.type === 'function').length }} 
      />
    </div>
  );
}
