import fs from "fs";
import path from "path";

// 📂 Get all files
export function readFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      if (!["node_modules", ".git"].includes(file)) {
        readFiles(fullPath, filesList);
      }
    } else {
      filesList.push(fullPath);
    }
  });

  return filesList;
}

// 📄 Get file content
export function getFileContent(req, res) {
  const filePath = req.query.path;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: "Cannot read file" });
  }
}