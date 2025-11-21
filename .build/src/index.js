"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config(); // Load environment variables
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ask_1 = __importDefault(require("./routes/ask"));
const tts_1 = __importDefault(require("./routes/tts"));
const cache_1 = __importDefault(require("./routes/cache"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["https://lalu-portfolio.vercel.app", "http://localhost:3000"],
}));
app.use(express_1.default.json());
// Middleware to check for the secret API key
const apiKeyMiddleware = (req, res, next) => {
    const headerValue = req.headers["x-api-key"];
    const apiKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof apiKey === "string" && apiKey === process.env.API_SECRET_KEY) {
        next(); // API key is valid, proceed to the next middleware/route handler
    }
    else {
        res.status(401).json({ error: "Unauthorized" }); // Reject the request
    }
};
app.use(apiKeyMiddleware); // <-- Apply the API key middleware here
// Root endpoint
app.get("/", (req, res) => {
    res.send("Lalu Portfolio Backend — Phase 3");
});
// API routes
app.use("/api", ask_1.default);
app.use("/api/tts", tts_1.default);
app.use("/api/cache", cache_1.default);
// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});
exports.default = app;
