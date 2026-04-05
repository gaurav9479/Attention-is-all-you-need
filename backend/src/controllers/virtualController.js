import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPOS_DIR = path.join(__dirname, '..', '..', 'repos');

export const getVirtualLayer = async (req, res) => {
    const { repoName } = req.params;
    if (!repoName) return res.status(400).json({ error: "Missing repoName" });

    const filePath = path.join(REPOS_DIR, repoName, 'virtual_layer.json');
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return res.json(JSON.parse(data));
    } catch (err) {
        // If file doesn't exist, return empty layer
        return res.json({ nodes: [], edges: [] });
    }
};

export const saveVirtualLayer = async (req, res) => {
    const { repoName } = req.params;
    const { nodes, edges } = req.body;
    
    if (!repoName) return res.status(400).json({ error: "Missing repoName" });

    const repoPath = path.join(REPOS_DIR, repoName);
    const filePath = path.join(repoPath, 'virtual_layer.json');

    try {
        // Ensure repo dir exists
        await fs.mkdir(repoPath, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify({ nodes, edges }, null, 2));
        return res.json({ success: true });
    } catch (err) {
        console.error("Save virtual layer failed:", err);
        return res.status(500).json({ error: "Failed to save virtual layer" });
    }
};
