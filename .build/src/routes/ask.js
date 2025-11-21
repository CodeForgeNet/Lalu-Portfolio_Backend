"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gemini_1 = __importStar(require("../services/gemini"));
const pinecone_1 = require("../services/pinecone");
const cache_1 = require("../services/cache");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
const RESUME_PATHS = [
    path_1.default.resolve(process.cwd(), "frontend_data/resume.json"),
    path_1.default.resolve(__dirname, "../../frontend_data/resume.json"),
    path_1.default.resolve(__dirname, "../frontend_data/resume.json"),
    path_1.default.resolve(process.cwd(), "build/frontend_data/resume.json"),
    path_1.default.resolve(__dirname, "../../frontend/src/data/resume.json"),
];
function loadResumeSummary() {
    console.log("Current directory:", process.cwd());
    for (const resumePath of RESUME_PATHS) {
        console.log("Checking path:", resumePath);
        try {
            if (fs_1.default.existsSync(resumePath)) {
                console.log("Resume found at:", resumePath);
                const raw = fs_1.default.readFileSync(resumePath, "utf8");
                return raw;
            }
        }
        catch (e) {
            console.warn(`Could not load resume from ${resumePath}:`, e.message);
        }
    }
    console.error("No resume.json found in any of the specified paths.");
    return "";
}
// New endpoint for initial suggestions
router.post("/suggest", async (req, res) => {
    try {
        const resumeSummary = loadResumeSummary();
        let prompt;
        if (resumeSummary && resumeSummary.trim().length > 0) {
            prompt = `Based on the following resume summary, generate 3 concise and relevant follow-up questions that someone might ask. Each question should be on a new line. Do not number them.

Resume Summary:
${resumeSummary}

Questions:`;
        }
        else {
            // Fallback prompt when resume is not available in the runtime package
            console.warn("Resume summary not found; using fallback prompt for suggestions.");
            prompt = `Generate 3 concise and relevant follow-up questions that someone might ask when visiting a software engineer's portfolio website. Each question should be on a new line and focused on projects, technical skills, impact, or career goals. Do not number them.`;
        }
        const suggestions = await (0, gemini_1.generateSuggestions)(prompt);
        return res.json({ suggestions });
    }
    catch (err) {
        console.error("Suggest error:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
router.post("/ask", async (req, res) => {
    const { question, topK = 4 } = req.body;
    if (!question)
        return res.status(400).json({ error: "question is required" });
    if (!process.env.PINECONE_INDEX) {
        return res.status(500).json({ error: "PINECONE_INDEX env required" });
    }
    try {
        // 1) create embedding for question with Gemini
        const embeddingModel = gemini_1.default.getGenerativeModel({
            model: "text-embedding-004",
        });
        const embResult = await embeddingModel.embedContent(question);
        const qvec = embResult.embedding.values;
        // 2) Check cache for similar question
        const cacheResult = await (0, cache_1.getCachedResponse)(question, qvec);
        if (cacheResult.cached) {
            console.log(`⚡ Returning cached response (similarity: ${cacheResult.similarity.toFixed(2)})`);
            return res.json({
                text: cacheResult.response.answer,
                sources: cacheResult.response.sources,
                suggestions: cacheResult.response.suggestions,
                cached: true,
                similarity: cacheResult.similarity,
            });
        }
        // 3) Cache miss - proceed with RAG pipeline
        const index = (0, pinecone_1.getIndex)();
        const queryResponse = await index.query({
            topK: topK,
            vector: qvec,
            includeMetadata: true,
        });
        const matches = (queryResponse.matches || []).map((m) => ({
            id: m.id,
            score: m.score,
            metadata: m.metadata,
        }));
        // Build context text from matches
        const contextPieces = [];
        matches.forEach((mm) => {
            const md = mm.metadata || {};
            if (md.content) {
                contextPieces.push(md.content);
            }
            else {
                let title = md.title || md.projectId || mm.id;
                const type = md.type || "unknown";
                const piece = `${title} (${type})`;
                contextPieces.push(piece);
            }
        });
        // Also include a short resume summary as fallback context
        const resumeSummary = loadResumeSummary();
        const combinedContext = `Resume Summary:\n${resumeSummary}\n\nRelevant items:\n${contextPieces.join("\n\n")}`;
        // 3) build prompt for Gemini
        const systemPrompt = process.env.SYSTEM_PROMPT ||
            "You are Lalu's AI twin. Use the provided context to answer in first-person concisely.";
        const fullPrompt = `
      ${systemPrompt}

      Context:
      ${combinedContext}

      Question: ${question}

      Answer as Lalu in first-person. For project-related questions, start with: "For my **[Project Name]** project, I developed a system that [brief description]. Here's a quick overview:" followed by a bulleted list of key features/technologies. If asked about certifications, refer to the 'Certifications' section in the provided context. Keep it concise.
    `;
        // 4) call Gemini chat completions
        const chatModel = gemini_1.default.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await chatModel.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();
        // 5) Generate follow-up suggestions
        const suggestionPrompt = `Based on the user's question: "${question}" and the provided answer, generate 3 concise and relevant follow-up questions. Each question should be on a new line. Do not number them.

Answer: ${text}

Questions:`;
        const suggestions = await (0, gemini_1.generateSuggestions)(suggestionPrompt);
        // 6) Store in cache for future requests
        await (0, cache_1.setCachedResponse)(question, qvec, {
            text,
            sources: matches.map((m) => ({
                id: m.id,
                score: m.score,
                metadata: m.metadata,
                text: m.metadata.content,
            })),
            suggestions,
        });
        // Return assistant text and metadata about matches (as sources) and suggestions
        return res.json({
            text,
            sources: matches.map((m) => ({
                id: m.id,
                score: m.score,
                metadata: m.metadata,
                text: m.metadata.content,
            })),
            suggestions,
            cached: false,
        });
    }
    catch (err) {
        console.error("Ask error:", err);
        // Check if the error is a quota/rate limit error from Google API
        // This is a common way to check, but might need adjustment based on the exact error structure
        const isQuotaError = err.toString().includes("429") ||
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
exports.default = router;
