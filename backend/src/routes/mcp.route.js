import express from "express";
import { getMcpNode, mcpHealth, queryMcp, simulateImpact } from "../controllers/mcpController.js";

const router = express.Router();

router.get("/mcp/health", mcpHealth);
router.get("/mcp/node", getMcpNode);
router.post("/mcp/query", queryMcp);
router.post("/mcp/impact", simulateImpact);

export default router;
