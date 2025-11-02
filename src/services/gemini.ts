import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure the API key is loaded from environment variables
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function generateSuggestions(prompt: string): Promise<string[]> {
  const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await chatModel.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  // Assuming the response is a comma-separated list of questions
  return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
}

export default genAI;
