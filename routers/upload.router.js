import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { uploadMedia } from "../controller/upload/upload-media.js";
import rateLimit from "express-rate-limit";
import { requireAdmin } from "../middleware/requireAdmin.js";

const uploadRouter = Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 uploads per 15 min
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /upload/media
 * form-data:
 *  - files: File | File[]
 */
uploadRouter.post(
  "/media",
  requireAdmin,
  uploadLimiter,
  upload.array("files", 6),
  uploadMedia
);

export default uploadRouter;
