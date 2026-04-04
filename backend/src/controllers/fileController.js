import fs from "fs";
import path from "path";


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

export function getFiles(req, res) {
  try {
    // Assuming everything is cloned into ./repos/repo1 as per your clone controller
    const allFiles = readFiles("./repos/repo1");
    res.json(allFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read files" });
  }
}

export function getFileContent(req, res) {
  const filePath = req.query.path;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: "Cannot read file" });
  }
}