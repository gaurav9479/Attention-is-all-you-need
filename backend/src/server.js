import express from "express";
import cors from "cors";
import cloneRoute from "./routes/clone.route.js";
import fileRoute from "./routes/file.route.js";
import aiRoute from "./routes/ai.route.js";
import graphRoute from "./routes/graph.route.js";
import mcpRoute from "./routes/mcp.route.js";
import virtualRoute from "./routes/virtual.route.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", cloneRoute);
app.use("/api", fileRoute);
app.use("/api", aiRoute);
app.use("/api", graphRoute);
app.use("/api", mcpRoute);
app.use("/api/virtual", virtualRoute);

// Health check
app.get("/", (req, res) => {
    res.send("🚀 Backend running");
});

const PORT = 5005;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🔥 Server running on http://localhost:${PORT}`);
});