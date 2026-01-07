import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { uploadMedia } from "../controller/upload/upload-media.js";

const uploadRouter = Router();

/**
 * POST /upload/media
 * form-data:
 *  - files: File | File[]
 */
uploadRouter.post(
  "/media",
  upload.array("files", 6),
  uploadMedia
);

export default uploadRouter;
