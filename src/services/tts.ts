import axios from "axios";
import crypto from "crypto";

// A simple in-memory cache to store audio data
const audioCache = new Map<string, string>();

const createHash = (text: string): string => {
  return crypto.createHash("md5").update(text).digest("hex");
};

export const synthesizeSpeech = async (
  text: string,
  language: string = "en-in",
  voice: string = "Eka",
  format: string = "32khz_16bit_stereo"
): Promise<string> => {
  const textHash = createHash(text);

  // Check cache first
  if (audioCache.has(textHash)) {
    return audioCache.get(textHash)!;
  }

  try {
    const response = await axios.post(
      "http://api.voicerss.org/",
      new URLSearchParams({
        key: process.env.VOICERSS_API_KEY || "",
        src: text,
        hl: language,
        v: voice,
        r: "0",
        c: "MP3",
        f: format,
        b64: "true",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data.startsWith("ERROR")) {
      throw new Error(response.data);
    }

    // Cache the successful response
    audioCache.set(textHash, response.data);

    return response.data;
  } catch (error) {
    console.error("VoiceRSS API error:", error);
    throw new Error("Failed to synthesize speech.");
  }
};
