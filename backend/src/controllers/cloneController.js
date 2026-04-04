import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

const git = simpleGit();

export const cloneRepo = async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) return res.status(400).json({ error: "Missing repoUrl" });

  const repoName = repoUrl.split("/").pop().replace(".git", "");
  // Sticking with ./repos for consistency with other backend controllers
  const dir = `./repos/${repoName}`;

  try {
    if (!fs.existsSync("./repos")) fs.mkdirSync("./repos", { recursive: true });
    
    if (fs.existsSync(dir)) {
        return res.json({ status: "success", repoName, folder: dir });
    }

    await git.clone(repoUrl, dir);
    res.json({ status: "success", repoName, folder: dir });
  } catch (err) {
    console.error("Clone error:", err);
    res.status(500).json({ error: err.message });
  }
};