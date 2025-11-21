import Redis from "ioredis";

let redisClient: Redis | null = null;

/**
 * Get or create a singleton Redis client instance
 * Returns null if Redis is not configured or connection fails
 */
export function getRedisClient(): Redis | null {
  // Return existing client if already created
  if (redisClient !== null) {
    return redisClient;
  }

  // Check if Redis is configured
  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT || "6379");

  if (!host) {
    console.warn(
      "Redis not configured (REDIS_HOST missing). Cache will be disabled."
    );
    return null;
  }

  try {
    const options: any = {
      host,
      port,
      lazyConnect: true,
      family: 4, // Force IPv4 (fixes common Upstash/Node.js issues)
      connectTimeout: 10000, // 10 seconds connection timeout
      retryStrategy: (times: number) => {
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

    redisClient = new Redis(options);

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
  } catch (error: any) {
    console.error("Error creating Redis client:", error.message);
    console.warn("Cache will be disabled. App will continue without caching.");
    return null;
  }
}

/**
 * Close the Redis connection gracefully
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log("Redis connection closed gracefully");
    } catch (error: any) {
      console.error("Error closing Redis connection:", error.message);
    }
  }
}

/**
 * Check if Redis is available and connected
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

export default getRedisClient;
