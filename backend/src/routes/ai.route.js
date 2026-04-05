import express from "express";
import { getSummary, getChat } from "../controllers/aiController.js";

const router = express.Router();

router.post("/summary", getSummary);
router.post("/chat", getChat);

export default router;