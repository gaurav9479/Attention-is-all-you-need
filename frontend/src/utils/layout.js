export const getLayoutedElements = (nodes, edges) => {
  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const folderNodes = [];
  const hierarchyEdges = [];

  // 1. Root Node
  const rootNode = {
    id: 'root-node',
    type: 'custom',
    data: { label: 'Repository Root', type: 'root', layer: 0 }
  };
  nodeMap.set(rootNode.id, rootNode);

  // 2. Identify folders and create parent-child links
  nodes.forEach(node => {
     if (node.data?.type === 'file') {
        const pathParts = node.data.path.split('/');
        let currentParentId = 'root-node';
        let currentPath = '';

        for (let i = 0; i < pathParts.length - 1; i++) {
           const folderName = pathParts[i];
           currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
           const folderId = `folder:${currentPath}`;

           if (!nodeMap.has(folderId)) {
              const fNode = {
                 id: folderId,
                 type: 'custom',
                 data: { label: folderName.toUpperCase(), type: 'folder', path: currentPath, layer: 1 }
              };
              nodeMap.set(folderId, fNode);
              folderNodes.push(fNode);
              
              hierarchyEdges.push({
                 id: `h:${currentParentId}->${folderId}`,
                 source: currentParentId,
                 target: folderId,
                 data: { type: 'hierarchy' }
              });
           }
           currentParentId = folderId;
        }

        hierarchyEdges.push({
           id: `h:${currentParentId}->${node.id}`,
           source: currentParentId,
           target: node.id,
           data: { type: 'hierarchy' }
        });
     }
  });

  const finalNodes = [rootNode, ...folderNodes, ...nodes];
  const finalEdges = [...edges, ...hierarchyEdges];

  // 3. Wide Grid-Architectural Layout
  const NODES_PER_ROW = 6;
  const CELL_WIDTH = 450;
  const CELL_HEIGHT = 140;
  const LEVEL_SPACING = 240;

  const childrenMap = new Map();
  finalNodes.forEach(n => childrenMap.set(n.id, []));
  finalEdges.forEach(e => {
    if (e.data?.type === 'hierarchy' || e.id.includes('h:')) {
       const children = childrenMap.get(e.source) || [];
       if (!children.includes(e.target)) children.push(e.target);
       childrenMap.set(e.source, children);
    }
  });

  const subtreeHeights = {};
  const calculateSubtreeHeight = (nodeId) => {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      subtreeHeights[nodeId] = CELL_HEIGHT;
      return CELL_HEIGHT;
    }
    
    // Rows used by direct children
    const numRows = Math.ceil(children.length / NODES_PER_ROW);
    const childrenHeight = children.reduce((acc, childId) => acc + calculateSubtreeHeight(childId), 0);
    
    // Total height is the grid blocks of children
    const totalHeight = (numRows * CELL_HEIGHT) + LEVEL_SPACING;
    subtreeHeights[nodeId] = totalHeight;
    return totalHeight;
  };

  calculateSubtreeHeight('root-node');

  const positions = {};
  const assignPositions = (nodeId, startX, startY) => {
    positions[nodeId] = { x: startX, y: startY };

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    // Arrange children in a grid centered under the parent
    const gridStartY = startY + LEVEL_SPACING;
    
    children.forEach((childId, index) => {
      const row = Math.floor(index / NODES_PER_ROW);
      const col = index % NODES_PER_ROW;
      
      const gridX = startX + (col - (NODES_PER_ROW - 1) / 2) * CELL_WIDTH;
      const gridY = gridStartY + row * CELL_HEIGHT;
      
      assignPositions(childId, gridX, gridY);
    });
  };

  assignPositions('root-node', 0, 0);

  // Apply positions
  finalNodes.forEach(node => {
     if (positions[node.id]) {
        node.position = positions[node.id];
     } else {
        node.position = { x: Math.random() * 400, y: 1500 };
     }
  });

  // Final Styling of Edges
  const styledEdges = finalEdges.map(edge => {
    const isImport = edge.data?.type === 'import' || edge.id.startsWith('import:');
    const isHierarchy = edge.data?.type === 'hierarchy' || edge.id.includes('h:');
    
    let strokeColor = 'rgb(100, 116, 139)';
    if (isImport) strokeColor = 'rgb(245, 158, 11)';
    if (isHierarchy) strokeColor = 'rgb(59, 130, 246)';

    return {
      ...edge,
      animated: isImport,
      style: {
        stroke: strokeColor,
        strokeWidth: isImport ? 3 : 1.5,
        opacity: isHierarchy ? 0.3 : 0.8,
        ...edge.style
      }
    };
  });

  return { nodes: finalNodes, edges: styledEdges };
};
