import axios from "axios";

export const getSummary = async (req, res) => {
  try {
    const response = await axios.post("http://localhost:8001/summary", {
      code: req.body.code,
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "AI service failed" });
  }
};