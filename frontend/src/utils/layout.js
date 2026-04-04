export const getLayoutedElements = (nodes, edges) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // 1. Filter out any existing root nodes to prevent stacking
  const existingNodes = nodes.filter(n => n.id !== 'root-node');

  // Add REPOSITORY ROOT (Anchor)
  const rootNode = {
    id: 'root-node',
    type: 'custom',
    position: { x: 400, y: 0 },
    data: { label: 'Repository Root', type: 'root', layer: 0 }
  };

  const finalNodes = [rootNode, ...existingNodes];

  // VERTICAL LAYER CONSTANTS
  const LAYER_Y = {
    0: 160,   // Gateway (Root/Server)
    1: 520,   // Structure (Modules/Classes)
    2: 1000   // Atomic (Functions/Utils)
  };

  const CLUSTER_WIDTH = isMobile ? 380 : 580;
  const NODE_SPACING_X = 250;

  // Group nodes by their directory to create "Sectors"
  const sectors = {};
  finalNodes.forEach(node => {
     if (node.id === 'root-node') return;
     const dir = node.data?.path ? node.data.path.split('/').slice(0, -1).join('/') || 'root' : 'root';
     if (!sectors[dir]) sectors[dir] = [];
     sectors[dir].push(node);
  });

  const sectorNames = Object.keys(sectors);
  
  sectorNames.forEach((sectorName, sIndex) => {
    const sectorNodes = sectors[sectorName];
    const sectorXBase = sIndex * CLUSTER_WIDTH;

    const layerCounts = { 0: 0, 1: 0, 2: 0 };
    
    sectorNodes.forEach((node) => {
      const layer = node.data?.layer ?? 1;
      const xOffset = layerCounts[layer] * NODE_SPACING_X;
      
      node.position = {
        x: sectorXBase + xOffset - (CLUSTER_WIDTH / 2),
        y: LAYER_Y[layer] + (Math.random() * 25)
      };

      layerCounts[layer]++;

      // Auto-connect layer 0 nodes to the root
      if (layer === 0 && node.id !== 'root-node') {
        edges.push({
          id: `root-to-${node.id}`,
          source: 'root-node',
          target: node.id,
          animated: true,
          style: { stroke: '#1e293b', strokeWidth: 1, opacity: 0.2 }
        });
      }
    });
  });

  const styledEdges = edges.map(edge => {
    const isImport = edge.data?.type === 'import';
    const isHierarchy = edge.data?.type === 'hierarchy';
    const isRootEdge = edge.id.startsWith('root-to-');

    // High visibility neon colors for the "threads"
    let strokeColor = '#06b6d4'; // Cyan default
    if (isImport) strokeColor = '#f59e0b'; // Amber for imports
    if (isHierarchy) strokeColor = '#10b981'; // Emerald for functions/classes
    if (isRootEdge) strokeColor = '#ef4444'; // Red for root connections

    return {
      ...edge,
      animated: isImport || edge.animated,
      style: {
        stroke: strokeColor,
        strokeWidth: isImport ? 3 : 2.5,
        opacity: isRootEdge ? 0.7 : (isHierarchy ? 0.8 : 1),
        ...edge.style
      }
    };
  });

  return { nodes: finalNodes, edges: styledEdges };
};
