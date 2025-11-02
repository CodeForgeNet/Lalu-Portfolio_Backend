// import dotenv from "dotenv";
// dotenv.config();

// import express from "express";
// import cors from "cors";
// import askRouter from "./routes/ask";

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Root endpoint
// app.get("/", (req, res) => {
//   res.send("Lalu Portfolio Backend — Phase 1");
// });

// // API routes
// app.use("/api", askRouter);

// // Start server
// const port = process.env.PORT || 8080;
// app.listen(port, () => {
//   console.log(`Backend listening on http://localhost:${port}`);
// });

import express from "express";
import cors from "cors";
import askRouter from "./routes/ask";
import ttsRouter from "./routes/tts"; // Add this line

const app = express();
app.use(cors());
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
