import axios from "axios";

const apiClient = axios.create({
  baseURL: `http://${window.location.hostname}:3001/api`,
});

export const cloneRepo = async (repoUrl) => {
  const { data } = await apiClient.post("/clone", { repoUrl });
  return data;
};

export const fetchGraph = async () => {
  const { data } = await apiClient.get("/graph");
  return data;
};

export const fetchFileContent = async (path) => {
  const { data } = await apiClient.get(`/file?path=${encodeURIComponent(path)}`);
  return data;
};

export const fetchSummary = async (filename, code) => {
  const { data } = await apiClient.post("/summary", { filename, code });
  return data;
};
