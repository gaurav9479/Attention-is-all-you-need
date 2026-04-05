import axios from "axios";

const apiClient = axios.create({
  baseURL: `http://${window.location.hostname}:5005/api`,
});

export const cloneRepo = async (repoUrl) => {
  const { data } = await apiClient.post("/clone", { repoUrl });
  return data;
};

export const fetchGraph = async (repoName) => {
  const { data } = await apiClient.get(`/graph?repo=${repoName || ""}`);
  return data;
};

export const fetchTree = async (repoName) => {
  const { data } = await apiClient.get(`/files?repo=${repoName || ""}`);
  return data;
};

export const fetchFileContent = async (path, repoName) => {
  const { data } = await apiClient.get(`/file?path=${encodeURIComponent(path)}&repo=${repoName || ""}`);
  return data;
};

export const fetchSummary = async (filename, code) => {
  const { data } = await apiClient.post("/summary", { filename, code });
  return data;
};

export const fetchMcpNode = async (repoName, nodeId, mode = "normal") => {
  const { data } = await apiClient.get(`/mcp/node?repo=${repoName || ""}&nodeId=${encodeURIComponent(nodeId)}&mode=${mode}`);
  return data;
};

export const queryMcp = async (repoName, queryParams) => {
  const { data } = await apiClient.post("/mcp/query", { repo: repoName, ...queryParams });
  return data;
};

export const fetchImpactSimulation = async ({ repo, nodeId, changeType = "modify", maxDepth = 3, limit = 10 }) => {
  const { data } = await apiClient.post("/mcp/impact", {
    repo,
    nodeId,
    changeType,
    maxDepth,
    limit,
  });
  return data;
};

export const fetchChat = async (query, contextPrefix, code = "", filename = "", mode = "json", repoName = "") => {
  const { data } = await apiClient.post("/chat", { query, contextPrefix, code, filename, mode, repoName });
  return data;
};

export const apiGetVirtualLayer = async (repoName) => {
  const { data } = await apiClient.get(`/virtual/${repoName}`);
  return data;
};

export const apiSaveVirtualLayer = async (repoName, nodes, edges) => {
  const { data } = await apiClient.post(`/virtual/${repoName}`, { nodes, edges });
  return data;
};
