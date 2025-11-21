import { getRedisClient } from "./redis";
import crypto from "crypto";

/**
 * Structure of a cached response
 */
interface CachedResponse {
  question: string;
  answer: string;
  embedding: number[];
  sources: any[];
  suggestions: string[];
  timestamp: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: string;
}

// In-memory stats (persists across requests in same process)
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Generate a hash for a question (for exact matching as fallback)
 */
function hashQuestion(question: string): string {
  return crypto
    .createHash("md5")
    .update(question.toLowerCase().trim())
    .digest("hex");
}

/**
 * Get cached response for a similar question using semantic search
 * Returns the cached response if a similar question is found above the threshold
 */
export async function getCachedResponse(
  question: string,
  questionEmbedding: number[]
): Promise<
  | { cached: true; response: CachedResponse; similarity: number }
  | { cached: false; similarity?: number }
> {
  const redis = getRedisClient();
  if (!redis) {
    return { cached: false };
  }

  try {
    const threshold = parseFloat(
      process.env.CACHE_SIMILARITY_THRESHOLD || "0.92"
    );

    // Get all cached question keys with timeout
    const keys = await Promise.race([
      redis.keys("cache:question:*"),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      )
    ]);

    if (keys.length === 0) {
      cacheMisses++;
      return { cached: false };
    }

    let bestMatch: CachedResponse | null = null;
    let bestSimilarity = 0;

    // Check each cached question for similarity
    for (const key of keys) {
      const cached = await redis.get(key);
      if (!cached) continue;

      try {
        const cachedData: CachedResponse = JSON.parse(cached);

        // Calculate similarity
        const similarity = cosineSimilarity(
          questionEmbedding,
          cachedData.embedding
        );

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = cachedData;
        }
      } catch (parseError) {
        console.error("Error parsing cached data:", parseError);
        continue;
      }
    }

    // Return best match if above threshold
    if (bestMatch && bestSimilarity >= threshold) {
      cacheHits++;
      console.log(
        `✅ Cache hit! Similarity: ${bestSimilarity.toFixed(2)} for question: "${question}"`
      );
      return { cached: true, response: bestMatch, similarity: bestSimilarity };
    }

    cacheMisses++;
    console.log(`❌ Cache miss for question: "${question}" (Max similarity: ${bestSimilarity.toFixed(2)})`);
    return { cached: false, similarity: bestSimilarity };
  } catch (error: any) {
    console.error("Error getting cached response:", error.message);
    cacheMisses++;
    return { cached: false, similarity: 0 };
  }
}

/**
 * Store a new question-answer pair in the cache
 */
export async function setCachedResponse(
  question: string,
  questionEmbedding: number[],
  response: {
    text: string;
    sources: any[];
    suggestions: string[];
  }
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const hash = hashQuestion(question);
    const key = `cache:question:${hash}`;

    const cachedData: CachedResponse = {
      question,
      answer: response.text,
      embedding: questionEmbedding,
      sources: response.sources,
      suggestions: response.suggestions,
      timestamp: Date.now(),
    };

    const ttl = parseInt(process.env.CACHE_TTL || "0");

    // Add timeout to prevent blocking
    await Promise.race([
      ttl > 0
        ? redis.setex(key, ttl, JSON.stringify(cachedData))
        : redis.set(key, JSON.stringify(cachedData)),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      )
    ]);

    console.log(
      ttl > 0
        ? `💾 Cached response for: "${question}" (expires in ${ttl}s)`
        : `💾 Cached response for: "${question}" (no expiration)`
    );
  } catch (error: any) {
    console.error("Error caching response:", error.message);
    // Don't throw - just log and continue
  }
}

/**
 * Clear all cached entries
 */
export async function clearCache(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) {
    return 0;
  }

  try {
    const keys = await redis.keys("cache:question:*");
    if (keys.length === 0) return 0;

    await redis.del(...keys);
    console.log(`🗑️  Cleared ${keys.length} cached entries`);

    // Reset stats
    cacheHits = 0;
    cacheMisses = 0;

    return keys.length;
  } catch (error: any) {
    console.error("Error clearing cache:", error.message);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const redis = getRedisClient();

  let totalEntries = 0;

  if (redis) {
    try {
      const keys = await redis.keys("cache:question:*");
      totalEntries = keys.length;
    } catch (error: any) {
      console.error("Error getting cache stats:", error.message);
    }
  }

  const totalRequests = cacheHits + cacheMisses;
  const hitRate =
    totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(2) : "0.00";

  return {
    totalEntries,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: `${hitRate}%`,
  };
}
