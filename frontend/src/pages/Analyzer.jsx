import { useState, useCallback, useEffect } from "react";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import { fetchGraph, fetchFileContent, fetchSummary } from "../services/api";
import { getLayoutedElements } from "../utils/layout";
import GraphView from "../components/Graph/GraphView";
import CodePanel from "../components/Panel/CodePanel";
import SummaryPanel from "../components/Panel/SummaryPanel";
import SearchBar from "../components/UI/SearchBar";

export default function Analyzer() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [levelFilter, setLevelFilter] = useState("all");

  const [selectedNode, setSelectedNode] = useState(null);
  const [panelData, setPanelData] = useState({
    code: null,
    summary: null,
    loadingCode: false,
    loadingSummary: false,
    error: null,
  });

  useEffect(() => {
    const loadGraph = async () => {
      setGraphLoading(true);
      try {
        const data = await fetchGraph();
        if (data) {
          let typedNodes = (data.nodes || []).map((n) => ({
            ...n,
            type: "custom",
          }));
          const graphEdges = data.edges || [];
          
          // Apply automatic layout just ONCE upon receiving data
          const { nodes: autoLayoutedNodes, edges: autoLayoutedEdges } = getLayoutedElements(typedNodes, graphEdges);
          
          setNodes(autoLayoutedNodes);
          setEdges(autoLayoutedEdges);
        }
      } catch (err) {
        console.error("Failed to load graph:", err);
      } finally {
        setGraphLoading(false);
      }
    };
    loadGraph();
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = useCallback(async (_, node) => {
    setSelectedNode(node);
    if (!node.data?.path) {
      setPanelData({ code: null, summary: null, loadingCode: false, loadingSummary: false, error: null });
      return;
    }

    setPanelData({ code: null, summary: null, loadingCode: true, loadingSummary: false, error: null });

    try {
      const codeData = await fetchFileContent(node.data.path);
      const codeStr = codeData.content || "No content returned";
      
      setPanelData(prev => ({ ...prev, code: codeStr, loadingCode: false, loadingSummary: true }));

      // Fetch AI Insight using real data
      const summaryData = await fetchSummary(node.data.path, codeStr);
      
      setPanelData(prev => ({ 
        ...prev, 
        summary: summaryData, 
        loadingSummary: false 
      }));

    } catch (err) {
      console.error(err);
      setPanelData(prev => ({ ...prev, loadingCode: false, loadingSummary: false, error: "Failed to fetch code or summary" }));
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* LEFT: GRAPH VIEWER */}
      <div className="flex-[65] relative flex flex-col border-r border-slate-800">
        <div className="absolute top-4 left-4 z-10 w-96 flex gap-2 shadow-lg rounded-lg bg-slate-900 border border-slate-700 p-1">
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 rounded bg-transparent px-3 py-1.5 text-sm text-slate-200 focus:outline-none placeholder:text-slate-500 min-w-0"
          />
          <div className="border-l border-slate-700 mx-1"></div>
          <select 
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-transparent text-sm text-slate-300 font-semibold focus:outline-none pr-2 cursor-pointer w-32"
          >
            <option value="all" className="bg-slate-900 text-slate-200 font-normal">All Depth</option>
            <option value="files" className="bg-slate-900 text-slate-200 font-normal">Files Only</option>
          </select>
        </div>

        <GraphView
          nodes={nodes}
          edges={edges}
          loading={graphLoading}
          search={search}
          levelFilter={levelFilter}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
        />
      </div>

      {/* RIGHT: INFO PANEL */}
      <div className="flex-[35] bg-slate-900 flex flex-col h-full overflow-hidden shadow-2xl z-20">
        <div className="p-5 border-b border-slate-800 bg-slate-900 shrink-0">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            Inspection Panel
          </h2>
          {selectedNode ? (
            <p className="text-sm text-slate-400 mt-1 truncate" title={selectedNode.data?.path || selectedNode.data?.label}>
              {selectedNode.data?.path || selectedNode.data?.label}
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Select a node to view details</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 scroll-smooth space-y-6">
          {!selectedNode ? (
             <div className="h-full flex items-center justify-center text-slate-500 text-sm italic text-center px-8">
               Click on any file or function node in the graph to analyze its code and AI summary.
             </div>
          ) : panelData.error ? (
              <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
                {panelData.error}
              </div>
          ) : (
            <>
              <CodePanel code={panelData.code} loading={panelData.loadingCode} />
              <SummaryPanel summary={panelData.summary} loading={panelData.loadingSummary} />
            </>
          )}
        </div>
      </div>

    </div>
  );
}
