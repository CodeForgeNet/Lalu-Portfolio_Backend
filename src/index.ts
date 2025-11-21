require("dotenv").config(); // Load environment variables

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import askRouter from "./routes/ask";
import ttsRouter from "./routes/tts";
import cacheRouter from "./routes/cache";

const app = express();
app.use(
  cors({
    origin: ["https://lalu-portfolio.vercel.app", "http://localhost:3000"],
  })
);
app.use(express.json());

// Middleware to check for the secret API key
const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const headerValue = req.headers["x-api-key"];
  const apiKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof apiKey === "string" && apiKey === process.env.API_SECRET_KEY) {
    next(); // API key is valid, proceed to the next middleware/route handler
  } else {
    res.status(401).json({ error: "Unauthorized" }); // Reject the request
  }
};

app.use(apiKeyMiddleware); // <-- Apply the API key middleware here

// Root endpoint
app.get("/", (req, res) => {
  res.send("Lalu Portfolio Backend — Phase 3");
});

// API routes
app.use("/api", askRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/cache", cacheRouter);

// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
export default app;
