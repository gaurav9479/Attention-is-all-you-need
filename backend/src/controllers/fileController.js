import fs from "fs";
import path from "path";

export function readFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!["node_modules", ".git", "dist", "build", "__pycache__", ".venv"].includes(file)) {
        readFiles(fullPath, filesList);
      }
    } else {
      filesList.push(fullPath);
    }
  });
  return filesList;
}

export const getFilesTree = (dirPath, rootDir) => {
  const stats = fs.statSync(dirPath);
  const name = path.basename(dirPath);
  const relativePath = path.relative(rootDir, dirPath);
  
  if (stats.isFile()) {
    return { name, path: relativePath, fullPath: dirPath, type: "file" };
  }
  
  const children = fs.readdirSync(dirPath)
      .filter(child => !["node_modules", ".git", "dist", "build", "__pycache__", ".venv"].includes(child))
      .map(child => getFilesTree(path.join(dirPath, child), rootDir));

  return {
    name,
    path: relativePath,
    fullPath: dirPath,
    type: "directory",
    children
  };
};

export function getTree(req, res) {
  try {
    const repoName = req.query.repo || "repo1";
    // Using ./repos/ as the base for now to keep local dev stable
    const baseDir = `./repos/${repoName}`; 
    if (!fs.existsSync(baseDir)) {
      // Fallback to local dir for testing if repo1 doesn't exist
      if (fs.existsSync("./repos/repo1")) {
         const tree = getFilesTree("./repos/repo1", "./repos/repo1");
         return res.json(tree);
      }
      return res.status(404).json({ error: "Repo not found" });
    }
    const tree = getFilesTree(baseDir, baseDir);
    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate file tree" });
  }
}

export function getFileContent(req, res) {
  const filePath = req.query.path;
  const repoName = req.query.repo || "repo1";

  try {
    // Basic security: ensure path doesn't escape repo dir
    const resolvedPath = path.resolve(filePath);
    const content = fs.readFileSync(resolvedPath, "utf-8");
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: `Cannot read file: ${filePath}` });
  }
}