import dotenv from "dotenv";
dotenv.config(); // This must be the first line

import express from "express";
import cors from "cors";
import path from "path";
import askRouter from "./routes/ask";

const app = express();
app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.send("Lalu Portfolio Backend — Phase 1");
});

// API routes
app.use("/api/ask", askRouter);

// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
