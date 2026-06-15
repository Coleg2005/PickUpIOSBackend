import { Router } from "express";
import multer from "multer";
import path from "path";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/pfp/:userid", async (req, res) => {
  try {
    const { userid } = req.params;
    const user = await User.findById(userid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const picture = user.profile?.picture;

    if (!picture) {
      return res.status(404).json({ error: "Profile picture not found" });
    }

    if (picture.startsWith("http://") || picture.startsWith("https://")) {
      return res.redirect(picture);
    }

    return res.sendFile(path.resolve(process.cwd(), picture));
  } catch (err) {
    console.error("Profile picture fetch error:", err);
    res.status(500).json({ error: "Failed to load profile picture" });
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userid } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });
    if (!userid) return res.status(400).json({ error: "No user id provided" });

    const user = await User.findById(userid);
    if (!user) return res.status(400).json({ error: "User not found" });

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "profile-pictures" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(file.buffer);
    });

    if (!result?.secure_url) {
      return res.status(500).json({ error: "Cloudinary upload failed" });
    }

    // Save new image URL
    user.profile.picture = result.secure_url;
    await user.save();

    res.status(201).json({
      message: "Picture uploaded successfully",
      url: result.secure_url,
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;