import express from "express";
import { getSummary } from "../controllers/aiController.js";

const router = express.Router();

router.post("/summary", getSummary);

export default router;