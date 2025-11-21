"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedisClient = closeRedisClient;
exports.isRedisAvailable = isRedisAvailable;
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
/**
 * Get or create a singleton Redis client instance
 * Returns null if Redis is not configured or connection fails
 */
function getRedisClient() {
    // Return existing client if already created
    if (redisClient !== null) {
        return redisClient;
    }
    // Check if Redis is configured
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || "6379");
    if (!host) {
        console.warn("Redis not configured (REDIS_HOST missing). Cache will be disabled.");
        return null;
    }
    try {
        const options = {
            host,
            port,
            lazyConnect: true,
            family: 4, // Force IPv4 (fixes common Upstash/Node.js issues)
            connectTimeout: 10000, // 10 seconds connection timeout
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        };
        // Add password if provided
        if (process.env.REDIS_PASSWORD) {
            options.password = process.env.REDIS_PASSWORD;
        }
        // Enable TLS for Upstash (required)
        if (process.env.REDIS_TLS === "true") {
            options.tls = {
                rejectUnauthorized: true, // Verify SSL certificate
            };
        }
        redisClient = new ioredis_1.default(options);
        // Handle connection events
        redisClient.on("error", (err) => {
            console.error("Redis connection error:", err.message);
            // Don't throw - just log the error and continue
        });
        redisClient.on("connect", () => {
            console.log("✅ Connected to Redis successfully");
        });
        redisClient.on("ready", () => {
            console.log("✅ Redis client ready");
        });
        redisClient.on("close", () => {
            console.warn("⚠️  Redis connection closed");
        });
        // Don't await connection - let it connect in background
        // This prevents blocking Lambda cold starts
        console.log("Redis client initialized (will connect on first use)");
        return redisClient;
    }
    catch (error) {
        console.error("Error creating Redis client:", error.message);
        console.warn("Cache will be disabled. App will continue without caching.");
        return null;
    }
}
/**
 * Close the Redis connection gracefully
 */
async function closeRedisClient() {
    if (redisClient) {
        try {
            await redisClient.quit();
            redisClient = null;
            console.log("Redis connection closed gracefully");
        }
        catch (error) {
            console.error("Error closing Redis connection:", error.message);
        }
    }
}
/**
 * Check if Redis is available and connected
 */
async function isRedisAvailable() {
    const client = getRedisClient();
    if (!client)
        return false;
    try {
        await client.ping();
        return true;
    }
    catch (error) {
        return false;
    }
}
exports.default = getRedisClient;
