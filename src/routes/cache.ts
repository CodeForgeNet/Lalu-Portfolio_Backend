import express from "express";
import { clearCache, getCacheStats } from "../services/cache";

const router = express.Router();

/**
 * GET /api/cache/stats
 * Get cache statistics including hit rate and total entries
 */
router.get("/stats", async (req, res) => {
    try {
        const stats = await getCacheStats();
        return res.json({ ...stats, status: "online" });
    } catch (err: any) {
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
        const entriesCleared = await clearCache();
        return res.json({
            message: "Cache cleared successfully",
            entriesCleared,
        });
    } catch (err: any) {
        console.error("Error clearing cache:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
});



export default router;
