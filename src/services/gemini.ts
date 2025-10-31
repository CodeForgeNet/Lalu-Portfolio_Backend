import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure the API key is loaded from environment variables
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default genAI;
