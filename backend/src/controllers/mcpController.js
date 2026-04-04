import { analyzeWithMcp, simulateImpactWithMcp } from "../services/mcpService.js";

export function queryMcp(req, res) {
  try {
    const { repo, repoPath, query, nodeId, limit, mode } = req.body || {};
    const payload = analyzeWithMcp({
      repoName: repo || "repo1",
      repoPath: repoPath || null,
      query: query || "",
      nodeId: nodeId || null,
      limit: Number(limit) > 0 ? Number(limit) : 12,
      mode: mode || "normal",
    });

    return res.json(payload);
  } catch (err) {
    console.error("[MCP] query failure:", err.message);
    return res.status(500).json({ error: "MCP query failed", detail: err.message });
  }
}

export function getMcpNode(req, res) {
  try {
    const repo = req.query.repo || "repo1";
    const nodeId = req.query.nodeId;

    if (!nodeId) {
      return res.status(400).json({ error: "Missing nodeId query parameter" });
    }

    const payload = analyzeWithMcp({
      repoName: repo,
      repoPath: req.query.repoPath || null,
      nodeId,
      query: "",
      limit: 12,
      mode: req.query.mode || "normal",
    });

    return res.json(payload);
  } catch (err) {
    console.error("[MCP] node failure:", err.message);
    return res.status(500).json({ error: "MCP node analysis failed", detail: err.message });
  }
}

export function mcpHealth(_req, res) {
  return res.json({ status: "ok", service: "mcp" });
}

export function simulateImpact(req, res) {
  try {
    const { repo, repoPath, nodeId, changeType, maxDepth, limit } = req.body || {};

    const payload = simulateImpactWithMcp({
      repoName: repo || "repo1",
      repoPath: repoPath || null,
      nodeId: nodeId || null,
      changeType: changeType || "modify",
      maxDepth: Number(maxDepth) > 0 ? Number(maxDepth) : 3,
      limit: Number(limit) > 0 ? Number(limit) : 10,
    });

    return res.json(payload);
  } catch (err) {
    console.error("[MCP] impact failure:", err.message);
    return res.status(500).json({ error: "MCP impact simulation failed", detail: err.message });
  }
}
