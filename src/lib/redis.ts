import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client — works in Vercel serverless (REST-based, no TCP).
 *
 * Supports both:
 *   - Vercel KV (auto-provisioned):  KV_REST_API_URL / KV_REST_API_TOKEN
 *   - Standalone Upstash:            UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 */
export const redis = new Redis({
  url: (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!,
  token: (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!,
});
