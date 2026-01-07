import fs from "fs";
import { cloudinary } from "../../utils/cloudinary.js";

export const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploads = await Promise.all(
      req.files.map(async (file) => {
        const isVideo = file.mimetype.startsWith("video");

        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: isVideo ? "video" : "image",
          folder: "foods",
        });

        fs.unlinkSync(file.path); // cleanup temp file

        return result.secure_url;
      })
    );

    return res.json({ urls: uploads });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};
