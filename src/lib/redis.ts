import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client — works in Vercel serverless (REST-based, no TCP).
 *
 * Set these env vars in your Vercel project settings:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Get them free at https://console.upstash.com
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
