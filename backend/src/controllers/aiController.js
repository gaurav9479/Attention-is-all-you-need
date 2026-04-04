import axios from "axios";

const AI_API_URL = "http://127.0.0.1:8000/analyze";
const TIMEOUT_MS = 25000;    // 25 second timeout for extensive AI generation
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

    const { summary, risk_score, risk_reason, language } = response.data;
    
    // Map python structured output into frontend panel format
    let mappedRisk = "low";
    if (risk_score > 3) mappedRisk = "medium";
    if (risk_score > 6) mappedRisk = "high";

    return res.json({ 
      purpose: summary || "Successfully analyzed file.", 
      inputs: "N/A",
      output: language || "Unknown", 
      risk: mappedRisk
    });
  } catch (err) {
    console.error(`[AI] API call failed: ${err.message}`);
    
    return res.status(200).json({
      purpose: "AI service failed or timed out.",
      inputs: "N/A",
      output: "N/A",
      risk: "low"
    });
  }
};