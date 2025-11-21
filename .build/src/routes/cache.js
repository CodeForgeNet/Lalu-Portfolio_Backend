"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cache_1 = require("../services/cache");
const router = express_1.default.Router();
/**
 * GET /api/cache/stats
 * Get cache statistics including hit rate and total entries
 */
router.get("/stats", async (req, res) => {
    try {
        const stats = await (0, cache_1.getCacheStats)();
        return res.json({ ...stats, status: "online" });
    }
    catch (err) {
        console.error("Error getting cache stats:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
/**
 * POST /api/cache/clear
 * Clear all cached entries
 */
router.post("/clear", async (req, res) => {
    try {
        const entriesCleared = await (0, cache_1.clearCache)();
        return res.json({
            message: "Cache cleared successfully",
            entriesCleared,
        });
    }
    catch (err) {
        console.error("Error clearing cache:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});
/**
 * GET /api/cache/dump
 * Dump all cached entries (DEBUG ONLY)
 */
router.get("/dump", async (req, res) => {
    try {
        const redis = require("../services/redis").default();
        if (!redis)
            return res.json({ error: "Redis not connected" });
        const keys = await redis.keys("cache:question:*");
        const data = {};
        for (const key of keys) {
            const value = await redis.get(key);
            data[key] = value ? JSON.parse(value) : null;
        }
        return res.json({ count: keys.length, keys, data });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
