import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ----------------------------------------------------
// 1. SAMPLE DATA
// ----------------------------------------------------
const sampleData = {
  files: [
    { name: 'FileA', functions: ['a', 'b', 'c'] },
    { name: 'FileB', functions: ['d'] },
    { name: 'FileC', functions: ['e', 'f'] },
  ],
  calls: [
    { from: 'FileB.d', to: 'FileA.a' },
    { from: 'FileB.d', to: 'FileA.b' },
    { from: 'FileC.e', to: 'FileB.d' },
  ],
};

// ----------------------------------------------------
// 2. LAYOUT GENERATOR (Custom Tree/Trie Algorithm)
// ----------------------------------------------------
const generateTrieGraph = (data, collapsedNodes) => {
  const nodes = [];
  const edges = [];

  // LEVEL 0: ROOT
  const ROOT_ID = 'root';
  nodes.push({
    id: ROOT_ID,
    data: { label: 'Project Root', type: 'root', usageCount: 0 },
    position: { x: 0, y: 0 },
    style: {
      background: '#1e293b',
      color: '#f8fafc',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      padding: '12px 24px',
      fontWeight: 'bold',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
    },
    // Required to prevent collapse propagation if needed
    hidden: false 
  });

  // Layout Configurations
  const FILE_Y = 150;
  const FUNC_Y = 300;
  const FILE_X_SPACING = 300;
  const FUNC_X_SPACING = 100;

  const totalFiles = data.files.length;
  const startFileX = -((totalFiles - 1) * FILE_X_SPACING) / 2;

  data.files.forEach((file, fIndex) => {
    const fileId = `file-${file.name}`;
    const fileX = startFileX + fIndex * FILE_X_SPACING;

    // LEVEL 1: FILES
    nodes.push({
      id: fileId,
      data: { label: file.name, type: 'file' },
      position: { x: fileX, y: FILE_Y },
      style: {
        background: '#334155',
        color: '#bae6fd',
        border: '1px solid #0ea5e9',
        borderRadius: '6px',
        padding: '10px 20px',
      },
      hidden: collapsedNodes.has(ROOT_ID),
    });

    edges.push({
      id: `edge-${ROOT_ID}-${fileId}`,
      source: ROOT_ID,
      target: fileId,
      type: 'smoothstep',
      hidden: collapsedNodes.has(ROOT_ID),
    });

    // LEVEL 2: FUNCTIONS
    const totalFuncs = file.functions.length;
    const startFuncX = fileX - ((totalFuncs - 1) * FUNC_X_SPACING) / 2;

    file.functions.forEach((func, fnIndex) => {
      const funcId = `func-${file.name}.${func}`;
      
      // Calculate usage count based on calls targeting this function
      const usageCount = data.calls.filter(c => c.to === `${file.name}.${func}`).length;
      
      // Heatmap coloring based on usage
      let bg = '#0f172a';
      let border = '#64748b';
      if (usageCount > 1) { bg = '#450a0a'; border = '#ef4444'; } // Heat (Red)
      else if (usageCount === 1) { bg = '#422006'; border = '#f59e0b'; } // Warm (Orange)

      nodes.push({
        id: funcId,
        data: { label: func, type: 'function', usageCount, parent: fileId },
        position: { x: startFuncX + fnIndex * FUNC_X_SPACING, y: FUNC_Y },
        style: {
          background: bg,
          color: '#cbd5e1',
          border: `1px solid ${border}`,
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '12px',
        },
        hidden: collapsedNodes.has(ROOT_ID) || collapsedNodes.has(fileId),
      });

      edges.push({
        id: `edge-${fileId}-${funcId}`,
        source: fileId,
        target: funcId,
        type: 'smoothstep',
        hidden: collapsedNodes.has(ROOT_ID) || collapsedNodes.has(fileId),
      });
    });
  });

  // LEVEL 3+: DEPENDENCY CALLS (Cross-File Edges)
  data.calls.forEach((call, index) => {
    const sourceId = `func-${call.from}`;
    const targetId = `func-${call.to}`;
    
    // Find parent files to check if they are collapsed
    const sourceFile = `file-${call.from.split('.')[0]}`;
    const targetFile = `file-${call.to.split('.')[0]}`;

    edges.push({
      id: `call-${index}`,
      source: sourceId,
      target: targetId,
      type: 'step',
      animated: true,
      style: { stroke: '#a855f7', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
      hidden: collapsedNodes.has(ROOT_ID) || collapsedNodes.has(sourceFile) || collapsedNodes.has(targetFile),
    });
  });

  return { nodes, edges };
};

// ----------------------------------------------------
// 3. MAIN COMPONENT
// ----------------------------------------------------
function TrieGraphInner() {
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());

  // Generate dynamic layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return generateTrieGraph(sampleData, collapsedNodes);
  }, [collapsedNodes]);

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  // Sync state when collapsed nodes change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Expand / Collapse Interactivity
  const onNodeClick = useCallback((_, node) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id); // Expand
      } else {
        next.add(node.id); // Collapse
      }
      return next;
    });
    
    console.log(`[Node Clicked] ${node.data.type}: ${node.data.label}`, node.data);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#020617' }}>
      
      {/* HUD Info */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', fontFamily: 'sans-serif' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Trie Dependency Graph</h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click nodes to Expand/Collapse. Drag to pan.</p>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.1}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls style={{ background: '#0f172a', border: '1px solid #334155' }} />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data?.type === 'root') return '#3b82f6';
            if (n.data?.type === 'file') return '#0ea5e9';
            if (n.data?.usageCount > 0) return '#ef4444';
            return '#64748b';
          }}
          maskColor="rgba(2, 6, 23, 0.8)"
          style={{ background: '#0f172a', border: '1px solid #334155' }}
        />
      </ReactFlow>
    </div>
  );
}

export default function TrieGraph() {
  return (
    <ReactFlowProvider>
      <TrieGraphInner />
    </ReactFlowProvider>
  );
}
