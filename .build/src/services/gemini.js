"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSuggestions = generateSuggestions;
const generative_ai_1 = require("@google/generative-ai");
// Ensure the API key is loaded from environment variables
if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable not set.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
async function generateSuggestions(prompt) {
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await chatModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    // Assuming the response is a comma-separated list of questions
    return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
}
exports.default = genAI;
