"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeSpeech = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
// A simple in-memory cache to store audio data
const audioCache = new Map();
const createHash = (text) => {
    return crypto_1.default.createHash("md5").update(text).digest("hex");
};
const synthesizeSpeech = async (text, language = "en-in", voice = "Eka", format = "32khz_16bit_stereo") => {
    const textHash = createHash(text);
    // Check cache first
    if (audioCache.has(textHash)) {
        return audioCache.get(textHash);
    }
    try {
        const response = await axios_1.default.post("http://api.voicerss.org/", new URLSearchParams({
            key: process.env.VOICERSS_API_KEY || "",
            src: text,
            hl: language,
            v: voice,
            r: "0",
            c: "MP3",
            f: format,
            b64: "true",
        }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        if (response.data.startsWith("ERROR")) {
            throw new Error(response.data);
        }
        // Cache the successful response
        audioCache.set(textHash, response.data);
        return response.data;
    }
    catch (error) {
        console.error("VoiceRSS API error:", error);
        throw new Error("Failed to synthesize speech.");
    }
};
exports.synthesizeSpeech = synthesizeSpeech;
