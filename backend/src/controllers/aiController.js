import axios from "axios";

const AI_API_URL = "https://api.example.com/analyze";
const TIMEOUT_MS = 5000;    // 5 second timeout
const CODE_CHAR_LIMIT = 1000;

const FALLBACK_RESPONSE = {
  purpose: "Unknown",
  inputs: "Unknown",
  output: "Unknown",
  risk: "low",
  summary: "AI service unavailable",
};

export const getSummary = async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'code' field in request body" });
  }

  // Limit input to first 1000 characters
  const truncatedCode = code.slice(0, CODE_CHAR_LIMIT);

  console.log(`[AI] Calling external AI API → ${AI_API_URL} (${truncatedCode.length} chars)`);

  try {
    const response = await axios.post(
      AI_API_URL,
      { code: truncatedCode },
      { timeout: TIMEOUT_MS }
    );

    const { purpose, inputs, output, risk, summary } = response.data;

    return res.json({ purpose, inputs, output, risk, summary });
  } catch (err) {
    if (err.code === "ECONNABORTED") {
      console.error(`[AI] Request timed out after ${TIMEOUT_MS}ms`);
    } else {
      console.error(`[AI] API call failed: ${err.message}`);
    }

    return res.status(200).json(FALLBACK_RESPONSE);
  }
};