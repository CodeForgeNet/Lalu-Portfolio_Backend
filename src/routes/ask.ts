import express from "express";
import genAI, { generateSuggestions } from "../services/gemini";
import { getIndex } from "../services/pinecone";
import path from "path";
import fs from "fs";
const router = express.Router();

const RESUME_PATH = path.resolve(__dirname, "../../frontend_data/resume.json");

function loadResumeSummary(): string {
  try {
    const raw = fs.readFileSync(RESUME_PATH, "utf8");
    const j = JSON.parse(raw);
    let txt = `${j.name}\n${j.role}\n${j.tagline || ""}\n${
      j.summary || ""
    }\n\nProjects:\n`;
    if (Array.isArray(j.projects)) {
      j.projects.forEach((p: any) => {
        txt += `- ${p.title}: ${p.summary}\n`;
      });
    }
    txt += `\nExperience:\n`;
    if (Array.isArray(j.experience)) {
      j.experience.forEach((exp: any) => {
        txt += `- ${exp.title} at ${exp.organization} (${
          exp.duration
        }): ${exp.details.join("; ")}\n`;
      });
    }
    txt += `\nPersonal Details:\n`;
    if (j.personal_details) {
      for (const key in j.personal_details) {
        if (Object.prototype.hasOwnProperty.call(j.personal_details, key)) {
          const detail = j.personal_details[key];
          txt += `- ${key.replace(/_/g, " ")}: ${
            Array.isArray(detail) ? detail.join(", ") : detail
          }\n`;
        }
      }
    }
    txt += `\nCertifications:\n`;
    if (Array.isArray(j.certifications)) {
      j.certifications.forEach((c: any) => {
        txt += `- ${c.title}: ${c.certificate_url}\n`;
      });
    }
    return txt;
  } catch (e) {
    console.error("Error loading resume summary:", e);
    return "";
  }
}

// New endpoint for initial suggestions
router.post("/suggest", async (req, res) => {
  try {
    const resumeSummary = loadResumeSummary();
    const prompt = `Based on the following resume summary, generate 3 concise and relevant follow-up questions that someone might ask. Each question should be on a new line. Do not number them.

Resume Summary:
${resumeSummary}

Questions:`;
    const suggestions = await generateSuggestions(prompt);
    return res.json({ suggestions });
  } catch (err: any) {
    console.error("Suggest error:", err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

router.post("/ask", async (req, res) => {
  const { question, topK = 4 } = req.body;
  if (!question) return res.status(400).json({ error: "question is required" });

  if (!process.env.PINECONE_INDEX) {
    return res.status(500).json({ error: "PINECONE_INDEX env required" });
  }

  try {
    // 1) create embedding for question with Gemini
    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });
    const embResult = await embeddingModel.embedContent(question);
    const qvec = embResult.embedding.values;

    const index = getIndex();
    const queryResponse = await index.query({
      topK: topK,
      vector: qvec,
      includeMetadata: true,
    });

    const matches = (queryResponse.matches || []).map((m: any) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata,
    }));

    // Build context text from matches
    const contextPieces: string[] = [];
    matches.forEach((mm: any) => {
      const md = mm.metadata || {};
      if (md.content) {
        contextPieces.push(md.content);
      } else {
        let title = md.title || md.projectId || mm.id;
        const type = md.type || "unknown";
        const piece = `${title} (${type})`;
        contextPieces.push(piece);
      }
    });

    // Also include a short resume summary as fallback context
    const resumeSummary = loadResumeSummary();
    const combinedContext = `Resume Summary:\n${resumeSummary}\n\nRelevant items:\n${contextPieces.join(
      "\n\n"
    )}`;

    // 3) build prompt for Gemini
    const systemPrompt =
      process.env.SYSTEM_PROMPT ||
      "You are Lalu's AI twin. Use the provided context to answer in first-person concisely.";

    const fullPrompt = `
      ${systemPrompt}

      Context:
      ${combinedContext}

      Question: ${question}

      Answer as Lalu in first-person. For project-related questions, start with: "For my **[Project Name]** project, I developed a system that [brief description]. Here's a quick overview:" followed by a bulleted list of key features/technologies. If asked about certifications, refer to the 'Certifications' section in the provided context. Keep it concise.
    `;

    // 4) call Gemini chat completions
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await chatModel.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // 5) Generate follow-up suggestions
    const suggestionPrompt = `Based on the user's question: "${question}" and the provided answer, generate 3 concise and relevant follow-up questions. Each question should be on a new line. Do not number them.

Answer: ${text}

Questions:`;
    const suggestions = await generateSuggestions(suggestionPrompt);

    // Return assistant text and metadata about matches (as sources) and suggestions
    return res.json({
      text,
      sources: matches.map((m: any) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata,
        text: m.metadata.content,
      })),
      suggestions,
    });
  } catch (err: any) {
    console.error("Ask error:", err);

    // Check if the error is a quota/rate limit error from Google API
    // This is a common way to check, but might need adjustment based on the exact error structure
    const isQuotaError =
      err.toString().includes("429") ||
      err.status === 429 ||
      (err.cause && err.cause.status === 429);

    if (isQuotaError) {
      return res.status(429).json({
        error: "QUOTA_EXCEEDED",
        message: "The daily API quota has been exceeded. Please try again tomorrow.",
      });
    }

    return res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;
