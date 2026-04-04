import { useMemo, useEffect, useState } from "react";
import ReactFlow, { Controls, Background, MiniMap, useReactFlow, ReactFlowProvider, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode";
import Loader from "../UI/Loader";

const NODE_TYPES = { custom: CustomNode };

function GraphInner({ nodes, edges, loading, search = "", levelFilter, onNodesChange, onEdgesChange, onNodeClick }) {
  const { fitView } = useReactFlow();
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const visibleNodes = useMemo(() => {
    const lowerSearch = (search || "").toLowerCase();
    return nodes.map((n) => {
      // Toggle hidden status based on search
      let isHidden = !n.data?.label?.toLowerCase().includes(lowerSearch);
      
      // Also apply level filter
      if (levelFilter === "files" && n.data?.type !== "file") {
        isHidden = true;
      }
      return { ...n, hidden: isHidden };
    });
  }, [nodes, search, levelFilter]);

  const visibleEdges = useMemo(() => {
    if (levelFilter === "files") return []; // No edges when only viewing files 
    
    return edges.map((edge) => {
      // Apply specialized styling for imports
      if (edge.data?.type === 'import') {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#f59e0b',
          },
        };
      }
      return edge;
    });
  }, [edges, levelFilter]);

  // Refit view smoothly when filtering changes massively
  useEffect(() => {
    setTimeout(() => {
       fitView({ duration: 800, padding: 0.2 });
    }, 50);
  }, [visibleNodes.length, levelFilter, fitView]);

  if (loading) {
    return <Loader text="Structuring Graph Landscape..." />;
  }

  const onEdgeMouseEnter = (evt, edge) => {
    if (edge.data?.type === 'import') {
       setTooltipPos({ x: evt.clientX, y: evt.clientY });
       setHoveredEdge(`${edge.source} imports ${edge.target}`);
    }
  };

  const onEdgeMouseLeave = () => {
    setHoveredEdge(null);
  };

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        nodeTypes={NODE_TYPES}
        fitView
        className="bg-slate-950"
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
      >
        <Background color="#334155" gap={16} />
        <Controls className="bg-slate-900 border-slate-700 fill-slate-300" />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data?.type === "file") return "#3b82f6";
            if (n.data?.type === "function") return "#22c55e";
            if (n.data?.type === "class") return "#a855f7";
            return "#475569";
          }}
          nodeStrokeWidth={3}
          nodeBorderRadius={4}
          maskColor="rgba(15, 23, 42, 0.7)"
          className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl"
        />
      </ReactFlow>

      {hoveredEdge && (
        <div 
          className="fixed z-[100] px-3 py-1.5 bg-slate-900 border border-amber-500/50 text-amber-500 text-[11px] font-bold rounded-md shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {hoveredEdge}
        </div>
      )}
    </div>
  );
}

// Need to wrap in ReactFlowProvider to use useReactFlow hooks deeply
export default function GraphView(props) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
