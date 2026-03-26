import Redis from "ioredis";

/**
 * Redis client using ioredis — works with any standard Redis (Redis Cloud, etc.)
 *
 * Set REDIS_URL in your Vercel env vars, e.g.:
 *   redis://default:password@host:port
 */
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

// Prevent multiple connections in dev (hot reload)
if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
