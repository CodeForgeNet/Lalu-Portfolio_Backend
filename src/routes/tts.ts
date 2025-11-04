import express from "express";
import { synthesizeSpeech } from "../services/tts";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      text,
      language = "en-us",
      voice = "Linda",
      format = "32khz_16bit_stereo",
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const audioData = await synthesizeSpeech(text, language, voice, format);

    res.json({ audioData });
  } catch (error: any) {
    console.error("TTS endpoint error:", error);
    res.status(500).json({
      error: error?.message || "Failed to synthesize speech",
    });
  }
});

export default router;
