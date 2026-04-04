import simpleGit from "simple-git";
import fs from "fs";

const git = simpleGit();

export const cloneRepo = async (req, res) => {
  const { repoUrl } = req.body;
  const dir = "./repos/repo1";

  try {
    if (!fs.existsSync(dir)) {
      await git.clone(repoUrl, dir);
    }

    res.json({ status: "cloned" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};