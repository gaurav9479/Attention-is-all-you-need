import fs from "fs";
import path from "path";
import { readFiles } from "./fileController.js";

export function getGraph(req, res) {
  try {
    const dir = "./repos/repo1";
    if (!fs.existsSync(dir)) {
      return res.json({ nodes: [], edges: [] });
    }

    const allFiles = readFiles(dir);

    const nodes = [];
    const edges = [];
    let idCounter = 1;

    allFiles.forEach((filePath) => {
      // 1. Create a node for the file
      const fileId = `file-${idCounter++}`;
      const ext = path.extname(filePath);
      
      // Calculate a rough relative path for display
      const relativePath = path.relative(dir, filePath);
      
      nodes.push({
        id: fileId,
        type: "custom",
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        data: {
          label: path.basename(filePath),
          path: filePath,
          type: "file",
        },
      });

      // Simple regex extraction for functions and classes if it's JS/TS/JSX
      if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
        const content = fs.readFileSync(filePath, "utf-8");

        // Regex to match "function funcName" or "const funcName = () =>"
        const funcRegex = /(?:function\s+([a-zA-Z0-9_]+))|(?:const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/g;
        let funcMatch;
        while ((funcMatch = funcRegex.exec(content)) !== null) {
          const funcName = funcMatch[1] || funcMatch[2];
          if (funcName) {
            const funcId = `func-${idCounter++}`;
            nodes.push({
              id: funcId,
              type: "custom",
              position: { x: Math.random() * 800, y: Math.random() * 600 },
              data: {
                label: funcName,
                path: filePath,
                type: "function",
              },
            });
            edges.push({
              id: `edge-${fileId}-${funcId}`,
              source: fileId,
              target: funcId,
              animated: true,
              markerEnd: { type: "arrowclosed" },
            });
          }
        }

        // Regex to match "class ClassName"
        const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
        let classMatch;
        while ((classMatch = classRegex.exec(content)) !== null) {
          const className = classMatch[1];
          if (className) {
            const classId = `class-${idCounter++}`;
            nodes.push({
              id: classId,
              type: "custom",
              position: { x: Math.random() * 800, y: Math.random() * 600 },
              data: {
                label: className,
                path: filePath,
                type: "class",
              },
            });
            edges.push({
              id: `edge-${fileId}-${classId}`,
              source: fileId,
              target: classId,
              animated: true,
              markerEnd: { type: "arrowclosed" },
            });
          }
        }
      }
    });

    res.json({ nodes, edges });
  } catch (err) {
    console.error("Error generating graph:", err);
    res.status(500).json({ error: "Failed to generate graph" });
  }
}
