import express from "express";
import cors from "cors";
import cloneRoute from "./src/routes/clone.route.js";
import fileRoute from "./src/routes/file.route.js";
import aiRoute from "./src/routes/ai.route.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", cloneRoute);
app.use("/api", fileRoute);
app.use("/api", aiRoute);

// Health check
app.get("/", (req, res) => {
    res.send("🚀 Backend running");
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🔥 Server running on http://localhost:${PORT}`);
});