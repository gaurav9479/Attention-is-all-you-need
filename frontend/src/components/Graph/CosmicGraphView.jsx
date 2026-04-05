import { useRef, useMemo, useCallback, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
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
      val: n.data?.layer === 0 ? 15 : (n.data?.layer === 1 ? 8 : 4),
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
      fgRef.current.d3Force('charge').strength(-600);
      fgRef.current.d3Force('link').distance(150);
    }
  }, [graphData]);

  const getNodeColor = useCallback((node) => {
    if (node.type === 'virtual') return "#a855f7"; // Virtual (Purple)
    switch(node.group) {
      case 0: return "#f59e0b"; // Gateway (Amber)
      case 1: return "#3b82f6"; // Structure (Blue)
      case 2: return "#10b981"; // Atomic (Emerald)
      default: return "#6366f1"; // Indigo
    }
  }, []);

  // Custom 3D Node Rendering (Glowing Spheres)
  const nodeThreeObject = useCallback((node) => {
    const color = getNodeColor(node);
    const radius = node.val;
    
    const obj = new THREE.Group();
    
    // Core Sphere
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      emissive: color,
      emissiveIntensity: 1.5,
      shininess: 100
    });
    const sphere = new THREE.Mesh(geometry, material);
    obj.add(sphere);

    // Outer Glow / Halo
    const glowGeo = new THREE.SphereGeometry(radius * 1.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    obj.add(glow);

    return obj;
  }, [getNodeColor]);

  if (loading) {
    return <Loader text="Assembling Galactic Vector Matrix..." />;
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 bg-[#030407]">
        <p>No cosmic data available. Analyze a repository first.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative cursor-crosshair bg-[#030407] overflow-hidden">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeThreeObject={nodeThreeObject}
        nodeLabel={node => `<div class="bg-black/80 backdrop-blur-md border border-white/20 p-2 rounded text-xs">
          <div class="font-bold text-white">${node.name}</div>
          <div class="text-gray-400 mt-1">${node.type || 'module'}</div>
        </div>`}
        linkColor={link => {
            if (link.type === 'import') return "#6366f1"; // Solid Indigo
            if (link.type === 'hierarchy') return "rgba(16, 185, 129, 0.5)"; // Vibrant Emerald
            return "rgba(255, 255, 255, 0.2)";
        }}
        linkWidth={link => (link.type === 'import' ? 1.5 : 0.8)}
        linkDirectionalParticles={link => (link.type === 'import' ? 4 : 0)}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={() => "#6366f1"}
        onNodeClick={onNodeClick}
        backgroundColor="#030407"
        showNavInfo={false}
      />
      
      {/* HUD Overlays */}
      <div className="absolute top-8 left-8 pointer-events-none select-none">
        <h2 className="text-indigo-400 font-bold tracking-[0.3em] uppercase text-sm animate-pulse drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]">
          Cosmic Sector: Deep Space 3D
        </h2>
        <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
                <span className="text-[10px] text-slate-400 font-mono">GATEWAY</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                <span className="text-[10px] text-slate-400 font-mono">STRUCTURE</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                <span className="text-[10px] text-slate-400 font-mono">ATOMIC</span>
            </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 pointer-events-none bg-black/40 backdrop-blur-lg border border-white/10 p-4 rounded-xl">
        <p className="text-slate-400 text-[10px] font-mono leading-relaxed">
            [COMMANDS]<br/>
            LEFT CLICK: INSPECT NODE<br/>
            RIGHT CLICK + DRAG: ROTATE AXIS<br/>
            SCROLL: DEPTH NAV<br/>
            MIDDLE CLICK: PAN SPACE
        </p>
      </div>
    </div>
  );
}
