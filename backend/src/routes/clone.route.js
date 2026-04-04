import express from "express";
import { cloneRepo } from "../controllers/cloneController.js";

const router = express.Router();

router.post("/clone", cloneRepo);

export default router;