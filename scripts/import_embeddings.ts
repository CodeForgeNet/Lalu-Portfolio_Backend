#!/usr/bin/env ts-node
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import genAI from "../src/services/gemini";
import { getIndex } from "../src/services/pinecone";

// Load environment variables
dotenv.config();

const FRONTEND_RESUME = path.resolve(__dirname, "../frontend_data/resume.json");

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("Please set GOOGLE_API_KEY in .env");
    process.exit(1);
  }
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.error("Please set PINECONE_API_KEY and PINECONE_INDEX in .env");
    process.exit(1);
  }

  // Ensure frontend_data directory exists
  const frontendDataDir = path.resolve(__dirname, "../frontend_data");
  if (!fs.existsSync(frontendDataDir)) {
    fs.mkdirSync(frontendDataDir, { recursive: true });
  }

  // Check if resume file exists
  if (!fs.existsSync(FRONTEND_RESUME)) {
    console.error(`Resume file not found at ${FRONTEND_RESUME}`);
    console.error(
      "Please copy your resume.json from frontend to backend/frontend_data"
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(FRONTEND_RESUME, "utf8");
  const resume = JSON.parse(raw);

  const chunks: Array<{ id: string; text: string; metadata: any }> = [];

  // Root-level metadata
  const rootText = `${resume.name}\n${resume.role}\n${resume.tagline || ""}\n${resume.summary || ""}`;
  chunks.push({
    id: `resume-root-${hash(rootText)}`,
    text: rootText,
    metadata: {
      type: "resume",
      title: resume.name,
      content: rootText,
    },
  });

  // Projects as separate chunks
  if (Array.isArray(resume.projects)) {
    resume.projects.forEach((p: any) => {
      const text = `${p.title}\n${p.summary}\n${p.content || ""}`;
      chunks.push({
        id: `project-${p.id}-${hash(text)}`,
        text,
        metadata: {
          type: "project",
          projectId: p.id,
          title: p.title,
          summary: p.summary || "",
          content: p.content || "",
        },
      });
    });
  }

  // Experience as separate chunks
  if (Array.isArray(resume.experience)) {
    resume.experience.forEach((exp: any) => {
      const text = `${exp.title}\n${exp.organization}\n${exp.duration}\n${exp.details.join("\n")}`;
      chunks.push({
        id: `experience-${hash(text)}`,
        text,
        metadata: {
          type: "experience",
          title: exp.title,
          organization: exp.organization,
          duration: exp.duration,
          content: text,
        },
      });
    });
  }

  // Personal details as separate chunks
  if (resume.personal_details) {
    for (const key in resume.personal_details) {
      if (Object.prototype.hasOwnProperty.call(resume.personal_details, key)) {
        const detail = resume.personal_details[key];
        const text = `${key.replace(/_/g, ' ')}: ${Array.isArray(detail) ? detail.join(", ") : detail}`;
        chunks.push({
          id: `personal-${key}-${hash(text)}`,
          text,
          metadata: {
            type: "personal_detail",
            category: key,
            content: text,
          },
        });
      }
    }
  }

  console.log(`Preparing ${chunks.length} chunks for embedding...`);

  // Get Pinecone index and Gemini embedding model
  const index = getIndex();
  const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
  });

  // Batch upsert (pinecone expects vector array)
  const vectors: any[] = [];
  for (const c of chunks) {
    // Create embedding
    const result = await embeddingModel.embedContent(c.text);
    const embedding = result.embedding.values;
    vectors.push({
      id: c.id,
      metadata: c.metadata,
      values: embedding,
    });
    console.log("Prepared embedding for", c.id);
  }

  // Upsert to Pinecone (split into batches if necessary)
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    console.log(`Upserted batch ${i}-${i + batch.length}`);
  }

  console.log("Embeddings import complete.");
}

function hash(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
