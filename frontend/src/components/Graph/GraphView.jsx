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
  const [impactChain, setImpactChain] = useState({ nodes: new Set(), edges: new Set() });

  // Reset impact chain if nodes change (e.g. new repo)
  useEffect(() => {
    setImpactChain({ nodes: new Set(), edges: new Set() });
  }, [nodes.length]);

  const handleNodeClick = (evt, node) => {
    if (onNodeClick) onNodeClick(evt, node);

    const downstreamNodes = new Set([node.id]);
    const downstreamEdges = new Set();
    const queue = [node.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      edges.forEach(edge => {
        if (edge.source === currentId && !downstreamNodes.has(edge.target)) {
          downstreamNodes.add(edge.target);
          downstreamEdges.add(edge.id);
          queue.push(edge.target);
        }
      });
    }

    setImpactChain({ nodes: downstreamNodes, edges: downstreamEdges });

    // Focus camera on the found chain
    setTimeout(() => {
      const nodesToFit = nodes.filter(n => downstreamNodes.has(n.id));
      if (nodesToFit.length > 0) {
        fitView({ nodes: nodesToFit, duration: 800, padding: 0.3 });
      }
    }, 50);
  };

  const visibleNodes = useMemo(() => {
    const lowerSearch = (search || "").toLowerCase();
    const hasImpact = impactChain.nodes.size > 1;

    return nodes.map((n) => {
      const label = n.data?.label || "";
      const isHidden = !label.toLowerCase().includes(lowerSearch) || 
                       (levelFilter === "files" && n.data?.type !== "file");

      const isPartOfImpact = impactChain.nodes.has(n.id);
      
      return { 
        ...n, 
        hidden: isHidden,
        data: {
           ...n.data,
           isImpact: isPartOfImpact && hasImpact
        },
        style: {
          ...n.style,
          opacity: hasImpact ? (isPartOfImpact ? 1 : 0.15) : 1,
          filter: hasImpact ? (isPartOfImpact ? 'none' : 'grayscale(100%) blur(1px)') : 'none',
          transition: 'all 0.4s ease'
        }
      };
    });
  }, [nodes, search, levelFilter, impactChain]);

  const visibleEdges = useMemo(() => {
    if (levelFilter === "files") return []; 
    const hasImpact = impactChain.edges.size > 0;
    
    return edges.map((edge) => {
      const isPartOfImpact = impactChain.edges.has(edge.id);
      const isImport = edge.data?.type === 'import';
      const isHierarchy = edge.data?.type === 'hierarchy';
      const isRootEdge = edge.id.startsWith('root-to-');

      // High visibility neon default colors
      let defaultStroke = '#06b6d4'; // Cyan
      if (isImport) defaultStroke = '#f59e0b'; // Amber
      if (isHierarchy) defaultStroke = '#10b981'; // Emerald
      if (isRootEdge) defaultStroke = '#ef4444'; // Red

      return {
        ...edge,
        animated: isPartOfImpact || isImport,
        style: { 
          ...edge.style,
          stroke: hasImpact ? (isPartOfImpact ? defaultStroke : '#1e293b') : (edge.style?.stroke || defaultStroke),
          opacity: hasImpact ? (isPartOfImpact ? 1 : 0.05) : (edge.style?.opacity || 0.8),
          strokeWidth: hasImpact ? (isPartOfImpact ? 4 : 1) : (edge.style?.strokeWidth || 2.5),
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: hasImpact ? (isPartOfImpact ? defaultStroke : '#1e293b') : (edge.style?.stroke || defaultStroke) 
        },
      };
    });
  }, [edges, levelFilter, impactChain]);

  // Refit view whenever major data changes
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
         fitView({ duration: 1000, padding: 0.2 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, levelFilter, fitView]);

  if (loading) {
    return <Loader text="Assembling 3D Anti-Gravity Landscape..." />;
  }

  const onEdgeMouseEnter = (evt, edge) => {
    if (edge.data?.type === 'import') {
       setTooltipPos({ x: evt.clientX, y: evt.clientY });
       const source = edge.source.split('/').pop() || 'Module';
       const target = edge.target.split('/').pop() || 'Module';
       setHoveredEdge(`${source} imports ${target}`);
    }
  };

  const onEdgeMouseLeave = () => {
    setHoveredEdge(null);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#09090b]">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        nodeTypes={NODE_TYPES}
        fitView
        className="react-flow-3d"
        proOptions={{ hideAttribution: true }}
        minZoom={0.01}
        maxZoom={4}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#1e293b" gap={24} size={1} variant="lines" />
        <Controls className="bg-slate-900 border-slate-800 fill-slate-400" />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data?.layer === 0) return "#f59e0b";
            if (n.data?.layer === 1) return "#3b82f6";
            return "#22c55e";
          }}
          nodeStrokeWidth={3}
          nodeBorderRadius={8}
          maskColor="rgba(9, 9, 11, 0.8)"
          className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl"
        />
      </ReactFlow>

      {hoveredEdge && (
        <div 
          className="fixed z-[999] px-4 py-2 bg-slate-900 border-2 border-amber-500/50 text-amber-500 text-xs font-bold rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-15px] backdrop-blur-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {hoveredEdge}
          </div>
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
