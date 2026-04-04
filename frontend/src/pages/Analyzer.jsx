import { useState, useCallback, useEffect } from "react";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import { fetchGraph, fetchFileContent, fetchSummary, cloneRepo, fetchTree } from "../services/api";
import { getLayoutedElements } from "../utils/layout";

import Navbar from "../components/Layout/Navbar";
import SidebarLeft from "../components/Layout/SidebarLeft";
import InsightPanel from "../components/Panel/InsightPanel";
import StatusBar from "../components/Layout/StatusBar";
import GraphView from "../components/Graph/GraphView";

export default function Analyzer() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [tree, setTree] = useState(null);
  const [repoName, setRepoName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState("all");
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    const fileData = { name: node.data.label, path: node.data.path };
    setSelectedFile(fileData);
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const codeResp = await fetchFileContent(node.data.path, repoName);
      const summary = await fetchSummary(node.data.label, codeResp.content);
      setAnalysis(summary);
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [repoName]);

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
      <Navbar onAnalyze={handleAnalyze} isLoading={isLoading} />
      
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
             onNodesChange={onNodesChange}
             onEdgesChange={onEdgesChange}
             onNodeClick={onNodeClick}
           />
        </main>

        <InsightPanel 
          selectedFile={selectedFile}
          analysis={analysis}
          isLoading={isAnalyzing}
        />
      </div>

      <StatusBar 
        status={isLoading ? "Processing Repository..." : "System Ready"} 
        stats={{ repoName, totalFiles: nodes.filter(n => n.data.type === 'file').length, totalFunctions: nodes.filter(n => n.data.type === 'function').length }} 
      />
    </div>
  );
}
