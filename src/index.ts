import express from "express";
import cors from "cors";
import askRouter from "./routes/ask";
import ttsRouter from "./routes/tts";

const app = express();
app.use(cors({ origin: ['https://lalu-portfolio.vercel.app', 'http://localhost:3000'] }));
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.send("Lalu Portfolio Backend — Phase 3");
});

// API routes
app.use("/api", askRouter);
app.use("/api/tts", ttsRouter); // Add this line

// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
export default app;
