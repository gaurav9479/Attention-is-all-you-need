import { useState, useCallback, useEffect } from "react";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import {
  fetchGraph,
  fetchFileContent,
  fetchSummary,
  cloneRepo,
  fetchTree,
  fetchImpactSimulation,
} from "../services/api";
import { getLayoutedElements } from "../utils/layout";

import Navbar from "../components/Layout/Navbar";
import SidebarLeft from "../components/Layout/SidebarLeft";
import InsightPanel from "../components/Panel/InsightPanel";
import StatusBar from "../components/Layout/StatusBar";
import GraphView from "../components/Graph/GraphView";
import CosmicGraphView from "../components/Graph/CosmicGraphView";

export default function Analyzer() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [tree, setTree] = useState(null);
  const [repoName, setRepoName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState("all");
  const [uiMode, setUiMode] = useState("normal"); // Dual UI Mode State
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [impactAnalysis, setImpactAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const handleAnalyze = async (repoUrl, depth) => {
    setIsLoading(true);
    try {
      // 1. Clone
      const cloneData = await cloneRepo(repoUrl);
      const name = cloneData.repoName;
      setRepoName(name);

      // 2. Fetch Tree for Sidebar
      const treeData = await fetchTree(name);
      setTree(treeData);

      // 3. Fetch Graph
      const graphData = await fetchGraph(name);
      if (graphData) {
        let typedNodes = (graphData.nodes || []).map((n) => ({
          ...n,
          type: "custom",
        }));
        
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(typedNodes, graphData.edges || []);
        setNodes(lNodes);
        setEdges(lEdges);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const onNodeClick = useCallback(async (_, node) => {
    // For Cosmic Mode, node holds data directly or in .data
    const nodeData = node.data || node;
    if (!nodeData.path) return;

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
        fetchSummary(node.data.label, codeResp.content),
        runImpactSimulation({ nodeId: node.id || null, changeType: "modify" }),
      ]);

      setAnalysis(summary);
      if (!impact) {
        setImpactAnalysis(null);
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
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
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#0d0d0f] text-slate-200 overflow-hidden font-sans">
      <Navbar onAnalyze={handleAnalyze} isLoading={isLoading} uiMode={uiMode} onModeToggle={setUiMode} />
      
      <div className="flex flex-1 overflow-hidden">
        <SidebarLeft 
          tree={tree} 
          onSelect={(item) => onNodeClick(null, { data: { label: item.name, path: item.fullPath } })} 
          selectedPath={selectedFile?.path} 
        />
        
        <main className="flex-1 relative bg-[#09090b]">
           <GraphView 
             nodes={nodes}
             edges={edges}
             loading={isLoading}
             levelFilter={levelFilter}
             highlightNodeIds={highlightNodeIds}
             highlightEdgeIds={highlightEdgeIds}
             onNodesChange={onNodesChange}
             onEdgesChange={onEdgesChange}
             onNodeClick={onNodeClick}
           />
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
    </div>
  );
}
