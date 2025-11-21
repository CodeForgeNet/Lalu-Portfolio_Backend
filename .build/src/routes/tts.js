"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tts_1 = require("../services/tts");
const router = express_1.default.Router();
router.post("/", async (req, res) => {
    try {
        const { text, language = "en-us", voice = "Linda", format = "32khz_16bit_stereo", } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }
        const audioData = await (0, tts_1.synthesizeSpeech)(text, language, voice, format);
        res.json({ audioData });
    }
    catch (error) {
        console.error("TTS endpoint error:", error);
        res.status(500).json({
            error: error?.message || "Failed to synthesize speech",
        });
    }
});
exports.default = router;
