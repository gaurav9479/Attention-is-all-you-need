import { useMemo, useEffect, useState } from "react";
import ReactFlow, { Controls, Background, MiniMap, useReactFlow, ReactFlowProvider, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode";
import Loader from "../UI/Loader";

const NODE_TYPES = { custom: CustomNode };

function GraphInner({
  nodes,
  edges,
  loading,
  search = "",
  levelFilter,
  highlightNodeIds = [],
  highlightEdgeIds = [],
  onNodesChange,
  onEdgesChange,
  onNodeClick,
}) {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
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
  const [impactChain, setImpactChain] = useState({ nodes: new Set(), edges: new Set() });
  
  // Track expanded folder nodes.
  // We initialize with root-node and top-level folders expanded.
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root-node']));

  // Auto-expand top level folders when nodes are loaded
  useEffect(() => {
    if (nodes.length > 0) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        // Identify top-level folder IDs (parents are root-node)
        edges.forEach(e => {
          if (e.source === 'root-node' && e.id.includes('h:')) {
            next.add(e.target);
          }
        });
        return next;
      });
    }
  }, [nodes.length, edges]);

  // Parent Mapping for visibility check
  const parentMap = useMemo(() => {
    const map = new Map();
    // 1. Files/Symbols parents come from edges
    edges.forEach(e => {
       if (e.id.includes('h:') || e.id.includes('contains:')) {
          map.set(e.target, e.source);
       }
    });
    return map;
  }, [edges]);

  const toggleNodeExpansion = (nodeId) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    setExpandedNodes(next);
  };

  const handleNodeClick = (evt, node) => {
    if (node.data.type === 'folder' || node.id === 'root-node') {
       toggleNodeExpansion(node.id);
    }
    
    if (onNodeClick) onNodeClick(evt, node);

    // Impact simulation logic...
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
  };

  const visibleNodes = useMemo(() => {
    const lowerSearch = (search || "").toLowerCase();
    const hasImpact = impactChain.nodes.size > 1;

    return nodes.map((n) => {
      const nodeType = n.data?.type;
      
      // Visibility Check: All ancestors must be expanded
      let isAncestorCollapsed = false;
      let curr = parentMap.get(n.id);
      while (curr) {
         if (!expandedNodes.has(curr)) {
            isAncestorCollapsed = true;
            break;
         }
         curr = parentMap.get(curr);
      }

      const isImpactHighlighted = highlightNodeIds.includes(n.id);
      const label = n.data?.label || "";
      let isHidden = isAncestorCollapsed || !label.toLowerCase().includes(lowerSearch);
      
      if (levelFilter === "files" && nodeType !== "file" && nodeType !== "folder" && nodeType !== "root") {
        isHidden = true;
      }
      
      const isPartOfImpact = impactChain.nodes.has(n.id);
      
      return {
        ...n,
        hidden: isHidden,
        data: {
           ...n.data,
           isImpact: isPartOfImpact && hasImpact,
           isExpanded: expandedNodes.has(n.id)
        },
        style: {
          ...n.style,
          ...(isImpactHighlighted ? { border: "1px solid #f59e0b", boxShadow: "0 0 18px rgba(245,158,11,0.38)" } : {}),
          opacity: hasImpact ? (isPartOfImpact ? 1 : 0.15) : 1,
          filter: hasImpact ? (isPartOfImpact ? 'none' : 'grayscale(100%) blur(1px)') : 'none',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }
      };
    });
  }, [nodes, search, levelFilter, highlightNodeIds, impactChain, expandedNodes, parentMap]);

  const visibleEdges = useMemo(() => {
    const nodeVisibility = new Map(visibleNodes.map(n => [n.id, !n.hidden]));
    const hasImpact = impactChain.edges.size > 0;
    
    return edges.map((edge) => {
      const isPartOfImpact = impactChain.edges.has(edge.id);
      const isImport = edge.data?.type === 'import' || edge.id.startsWith('import:');
      const isHierarchy = edge.data?.type === 'hierarchy' || edge.id.includes('contains:') || edge.id.includes('h:');
      const isRootEdge = edge.id.startsWith('root-to-');
      const isEdgeHighlighted = highlightEdgeIds.includes(edge.id);

      // Hide edge if either node is hidden
      const isHidden = !nodeVisibility.get(edge.source) || !nodeVisibility.get(edge.target);

      let defaultStroke = '#3b82f6'; // Blue
      if (isImport) defaultStroke = '#f59e0b'; // Amber
      if (isHierarchy) defaultStroke = '#1e293b'; 
      if (isEdgeHighlighted) defaultStroke = '#ef4444';

      return {
        ...edge,
        hidden: isHidden,
        animated: isEdgeHighlighted || isPartOfImpact || isImport,
        style: { 
          ...edge.style,
          stroke: isEdgeHighlighted ? '#ef4444' : (hasImpact ? (isPartOfImpact ? defaultStroke : '#1e293b') : (edge.style?.stroke || defaultStroke)),
          opacity: hasImpact ? (isPartOfImpact ? 1 : 0.05) : (isHierarchy ? 0.3 : 0.8),
          strokeWidth: isEdgeHighlighted ? 2.8 : (hasImpact ? (isPartOfImpact ? 4 : 1) : 2),
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: isEdgeHighlighted ? '#ef4444' : (hasImpact ? (isPartOfImpact ? defaultStroke : '#1e293b') : defaultStroke) 
        },
      };
    });
  }, [edges, levelFilter, highlightEdgeIds, impactChain, visibleNodes]);

  // Refit view whenever major data changes
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
         fitView({ duration: 1000, padding: 0.2 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, levelFilter, fitView]);

  const onConnect = (params) => {
    onEdgesChange([{
      type: 'add',
      item: {
        ...params,
        id: `manual-${Date.now()}`,
        animated: true,
        data: { type: 'manual' },
        style: { stroke: '#6366f1' }, // Indigo for manual threads
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
      }
    }]);
  };

  const onPaneContextMenu = (evt) => {
    evt.preventDefault();
    const label = window.prompt("Enter Virtual Node Label:");
    if (!label) return;

    const id = `virtual-${Date.now()}`;
    const newNode = {
      id,
      type: 'custom',
      position: screenToFlowPosition({ x: evt.clientX, y: evt.clientY }),
      data: { label, type: 'virtual', layer: 3 }
    };
    onNodesChange([{ type: 'add', item: newNode }]);
  };

  const defaultEdgeOptions = useMemo(() => ({ 
    type: 'default',
    animated: true,
    style: { strokeWidth: 2 }
  }), []);

  if (loading) {
    return <Loader text="Assembling 3D Anti-Gravity Landscape..." />;
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#030407]">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={onPaneContextMenu}
        onNodeClick={handleNodeClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        nodeTypes={NODE_TYPES}
        connectionMode="loose"
        fitView
        className="react-flow-3d"
        proOptions={{ hideAttribution: true }}
        minZoom={0.01}
        maxZoom={4}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background color="#1e293b" gap={100} size={1} variant="dots" />
        {/* Custom Starfield Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '100px 100px' }} />
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50px 50px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '180px 180px' }} />
        
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
