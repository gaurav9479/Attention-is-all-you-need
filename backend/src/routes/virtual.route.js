import express from "express";
import { getVirtualLayer, saveVirtualLayer } from "../controllers/virtualController.js";

const router = express.Router();

router.get("/:repoName", getVirtualLayer);
router.post("/:repoName", saveVirtualLayer);

export default router;
