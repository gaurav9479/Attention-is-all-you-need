import express from "express";
import { getFiles, getFileContent } from "../controllers/fileController.js";

const router = express.Router();

router.get("/files", getFiles);
router.get("/file", getFileContent);

export default router;