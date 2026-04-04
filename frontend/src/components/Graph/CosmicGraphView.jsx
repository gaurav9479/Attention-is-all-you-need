import { useRef, useMemo, useCallback, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import Loader from "../UI/Loader";

export default function CosmicGraphView({ nodes, edges, loading, onNodeClick }) {
  const fgRef = useRef();

  // Convert React Flow data to ForceGraph format
  const graphData = useMemo(() => {
    if (!nodes || nodes.length === 0) return { nodes: [], links: [] };

    const fgNodes = nodes.map(n => ({
      id: n.id,
      name: n.data?.label || "Unknown",
      group: n.data?.layer ?? 1,
      type: n.data?.type || 'file',
      path: n.data?.path || '',
      val: n.data?.layer === 0 ? 12 : (n.data?.layer === 1 ? 6 : 3),
      ...n.data
    }));

    const fgLinks = edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.data?.type || 'none',
      isRoot: e.id.startsWith('root-to-')
    }));

    return { nodes: fgNodes, links: fgLinks };
  }, [nodes, edges]);

  // Apply custom physics to spread the galaxy apart
  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion between nodes (default is usually around -30)
      fgRef.current.d3Force('charge').strength(-500);
      // Increase the resting distance of edges (default is 30)
      fgRef.current.d3Force('link').distance(120);
    }
  }, [graphData]);

  const getNodeColor = useCallback((node) => {
    switch(node.group) {
      case 0: return "#f59e0b"; // Gateway (Amber)
      case 1: return "#3b82f6"; // Structure (Blue)
      case 2: return "#10b981"; // Atomic (Emerald)
      default: return "#94a3b8";
    }
  }, []);

  const getLinkColor = useCallback((link) => {
    if (link.type === 'import') return "rgba(245, 158, 11, 0.5)"; // Amber
    if (link.type === 'hierarchy') return "rgba(16, 185, 129, 0.3)"; // Emerald
    if (link.isRoot) return "rgba(239, 68, 68, 0.2)"; // Red
    return "rgba(59, 130, 246, 0.1)"; // Blue
  }, []);

  // Custom 2D Canvas drawing for Glowing Stars + Text
  const renderNode = useCallback((node, ctx, globalScale) => {
    const color = getNodeColor(node);
    const radius = node.val;
    
    // Draw glowing star
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * globalScale;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw label
    const fontSize = 12 / globalScale;
    if (globalScale > 0.8) {
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(node.name, node.x, node.y + radius + (8 / globalScale));
    }
  }, [getNodeColor]);

  if (loading) {
    return <Loader text="Generating Cosmic Vector Matrix..." />;
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 bg-[#050505]">
        <p>No cosmic data available. Analyze a repository first.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative cursor-crosshair bg-[#050505] overflow-hidden">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={renderNode}
        linkColor={getLinkColor}
        linkWidth={link => (link.type === 'import' ? 1.5 : 0.5)}
        linkDirectionalParticles={link => (link.type === 'import' ? 3 : 0)}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={onNodeClick}
        backgroundColor="#050505"
      />
      <div className="absolute top-4 left-4 pointer-events-none">
        <h2 className="text-purple-400 font-bold tracking-widest uppercase text-xs animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
          Deep Cosmic Sector (2D Planar Mode)
        </h2>
        <p className="text-slate-500 text-[10px] mt-1">Due to WebGL constraints, running high-fidelity 2D simulation.</p>
        <p className="text-slate-500 text-[10px] mt-0.5">Click & Drag: Pan • Scroll: Zoom • Click Node: Analyze</p>
      </div>
    </div>
  );
}
