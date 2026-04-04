import fs from "fs";
import path from "path";
import { readFiles } from "./fileController.js";

export function getGraph(req, res) {
  try {
    const repoName = req.query.repo || "repo1";
    const dir = `./repos/${repoName}`;
    if (!fs.existsSync(dir)) {
      // Fallback for local dev testing
      if (fs.existsSync("./repos/repo1")) {
         return getGraphInternal("./repos/repo1", res);
      }
      return res.json({ nodes: [], edges: [] });
    }
    return getGraphInternal(dir, res);
  } catch (err) {
     res.status(500).json({ error: "Failed to generate graph" });
  }
}

function getGraphInternal(dir, res) {
  try {
    const allFiles = readFiles(dir);

    const nodes = [];
    const edges = [];
    
    // Create a map for quick lookup of file relative paths
    const filePaths = new Set();
    allFiles.forEach(fp => {
       filePaths.add(path.relative(dir, fp));
    });

    allFiles.forEach((filePath) => {
      const relativePath = path.relative(dir, filePath);
      const fileId = relativePath; // Use relative path as a stable, unique ID
      const ext = path.extname(filePath);
      
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

        // 1. Detect Inter-file Imports/Requires
        const importRegex = /(?:import\s+(?:.*)\s+from\s+['"](.+?)['"])|(?:require\(['"](.+?)['"]\))/g;
        let importMatch;
        while ((importMatch = importRegex.exec(content)) !== null) {
          const rawPath = importMatch[1] || importMatch[2];
          if (rawPath && (rawPath.startsWith(".") || rawPath.startsWith("/"))) {
            const currentDir = path.dirname(relativePath);
            let targetPath = path.join(currentDir, rawPath);
            
            // Normalize path (handle moving backwards etc)
            targetPath = path.normalize(targetPath);
            if (targetPath.startsWith(".")) targetPath = targetPath.substring(2); // Remove leading ./ if any

            // Try common extensions if missing
            const lookups = [
              targetPath,
              targetPath + ".js",
              targetPath + ".jsx",
              targetPath + ".ts",
              targetPath + ".tsx",
              path.join(targetPath, "index.js"),
              path.join(targetPath, "index.ts")
            ];

            const foundMatch = lookups.find(p => filePaths.has(p));
            if (foundMatch && foundMatch !== fileId) {
              edges.push({
                id: `import-${fileId}->${foundMatch}`,
                source: fileId,
                target: foundMatch,
                label: "imports",
                data: { type: "import" }, // Mark as import for special frontend styling
              });
            }
          }
        }

        // 2. Detect Functions
        const funcRegex = /(?:function\s+([a-zA-Z0-9_]+))|(?:const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/g;
        let funcMatch;
        while ((funcMatch = funcRegex.exec(content)) !== null) {
          const funcName = funcMatch[1] || funcMatch[2];
          if (funcName) {
            const funcId = `${fileId}:${funcName}`; // Unique name within file
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

        // 3. Detect Classes
        const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
        let classMatch;
        while ((classMatch = classRegex.exec(content)) !== null) {
          const className = classMatch[1];
          if (className) {
            const classId = `${fileId}:class:${className}`;
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
