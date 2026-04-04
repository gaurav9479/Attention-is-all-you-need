import express from "express";
import { getTree, getFileContent } from "../controllers/fileController.js";

const router = express.Router();

router.get("/files", getTree);
router.get("/file", getFileContent);

export default router;