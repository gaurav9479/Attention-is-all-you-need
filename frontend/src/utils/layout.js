export const getLayoutedElements = (nodes, edges) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const fileNodes = nodes.filter((n) => n.data.type === "file");
  const subNodes = nodes.filter((n) => n.data.type !== "file");

  // 1. PROJECT ROOT
  const rootNode = {
    id: 'root-node',
    type: 'custom',
    position: { x: 400, y: 0 },
    data: { label: 'Repository Root', type: 'root' }
  };
  
  // 2. FILES (LEVEL 1)
  const FILE_SPACING_X = isMobile ? 300 : 450;
  const FILE_Y = 200;
  
  fileNodes.forEach((node, i) => {
    const totalFiles = fileNodes.length;
    const startX = 400 - ((totalFiles - 1) * FILE_SPACING_X) / 2;
    node.position = { x: startX + i * FILE_SPACING_X, y: FILE_Y };
    
    // Add edge from root to file
    edges.push({
        id: `root-to-${node.id}`,
        source: 'root-node',
        target: node.id,
        animated: true,
        style: { stroke: '#334155', strokeWidth: 1 }
    });
  });

  // 3. ATOMS (LEVEL 2) - Functions/Classes
  subNodes.forEach((node) => {
    const edge = edges.find((e) => e.target === node.id);
    if (edge) {
      const parentFile = fileNodes.find((n) => n.id === edge.source);
      if (parentFile) {
        const peers = subNodes.filter((n) => {
           const e = edges.find((ed) => ed.target === n.id);
           return e && e.source === parentFile.id;
        });
        const index = peers.findIndex((n) => n.id === node.id);

        const SPACING_X = 140;
        const SPACING_Y = 120 + Math.floor(index / 2) * 60;
        const offset = Math.ceil(index / 2) * (index % 2 === 0 ? 1 : -1);

        node.position = {
          x: parentFile.position.x + offset * SPACING_X,
          y: parentFile.position.y + SPACING_Y,
        };
      }
    }
  });

  return { nodes: [rootNode, ...nodes], edges };
};
