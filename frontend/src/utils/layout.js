export const getLayoutedElements = (nodes, edges) => {
  const fileNodes = nodes.filter((n) => n.data.type === "file");
  const subNodes = nodes.filter((n) => n.data.type !== "file");

  // Lay out files in a grid (Level 0) wrapper every 6 files
  const FILES_PER_ROW = 6;
  const FILE_SPACING_X = 500;
  const ROW_SPACING_Y = 800; // Leave massive vertical space for children depth
  
  fileNodes.forEach((node, i) => {
    const row = Math.floor(i / FILES_PER_ROW);
    const col = i % FILES_PER_ROW;
    node.position = { x: col * FILE_SPACING_X, y: row * ROW_SPACING_Y };
    node.sourcePosition = "bottom";
    node.targetPosition = "top";
  });

  // Lay out functions/classes directly underneath their parent file (Level 1)
  subNodes.forEach((node) => {
    node.sourcePosition = "bottom";
    node.targetPosition = "top";

    const edge = edges.find((e) => e.target === node.id);
    if (edge) {
      const parentFile = fileNodes.find((n) => n.id === edge.source);
      if (parentFile) {
        // Find all siblings of this node
        const peers = subNodes.filter((n) => {
          const e = edges.find((ed) => ed.target === n.id);
          return e && e.source === parentFile.id;
        });
        const index = peers.findIndex((n) => n.id === node.id);

        // Branch out left and right under the parent
        const offsetMultiplier = Math.ceil(index / 2) * (index % 2 === 0 ? 1 : -1);
        const SPACING_X = 140;
        const SPACING_Y = 120 + Math.floor(index / 2) * 50;

        node.position = {
          x: parentFile.position.x + offsetMultiplier * SPACING_X,
          y: parentFile.position.y + SPACING_Y,
        };
      }
    }
  });

  return { nodes, edges };
};
