import multer from "multer";

const storage = multer.diskStorage({
  filename: (_, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB (supports long phone videos)
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported file type"), false);
  },
});
