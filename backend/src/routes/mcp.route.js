import express from "express";
import { getMcpNode, mcpHealth, queryMcp } from "../controllers/mcpController.js";

const router = express.Router();

router.get("/mcp/health", mcpHealth);
router.get("/mcp/node", getMcpNode);
router.post("/mcp/query", queryMcp);

export default router;
