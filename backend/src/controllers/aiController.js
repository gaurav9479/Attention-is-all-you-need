import axios from "axios";

const AI_API_URL = "http://127.0.0.1:8000/analyze";
const TIMEOUT_MS = 60000;    // 60 second timeout for extensive AI generation
const CODE_CHAR_LIMIT = 8000;

export const getSummary = async (req, res) => {
  const { filename, code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'code' field in request body" });
  }

  // Limit input
  const truncatedCode = code.slice(0, CODE_CHAR_LIMIT);

  try {
    const response = await axios.post(
      AI_API_URL,
      { filename: filename || "unknown", code: truncatedCode },
      { timeout: TIMEOUT_MS }
    );

    // Destructure specifically what the Python service now returns
    const { purpose, risk_score, warnings, functions, classes } = response.data;

    return res.json({ 
      purpose,
      risk_score,
      warnings: warnings || [],
      functions: functions || [],
      classes: classes || []
    });
  } catch (err) {
    console.error(`[AI] API call failed: ${err.message}`);
    
    return res.status(200).json({
      purpose: "AI service failed or timed out. Please try again.",
      risk_score: 0,
      warnings: ["Unable to fetch security warnings"],
      functions: [],
      classes: []
    });
  }
};

export const getChat = async (req, res) => {
  const { query, contextPrefix, code, filename, mode, repoName } = req.body;

  try {
    const response = await axios.post(
      "http://127.0.0.1:8000/chat",
      { query, context_prefix: contextPrefix || "", code: code || "", filename: filename || "", mode: mode || "json", repo_name: repoName || "" },
      { timeout: TIMEOUT_MS }
    );
    return res.json(response.data);
  } catch (err) {
    console.error(`[AI] Chat API failed: ${err.message}`);
    return res.status(500).json({ error: "Chat service unavailable." });
  }
};