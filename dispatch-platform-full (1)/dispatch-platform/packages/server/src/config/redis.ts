/**
 * Redis Configuration
 * 
 * Used for:
 * - Session storage
 * - Cache layer
 * - Rate limiting
 * - Pub/Sub for WebSocket scaling
 * - Real-time location data
 * - Job queues
 */

import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;
let subscriberClient: Redis | null = null;
let publisherClient: Redis | null = null;

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<Redis> {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  if (!redisClient) {
    redisClient = new Redis(REDIS_CONFIG);

    redisClient.on('connect', () => {
      logger.debug('Redis connecting...');
    });

    redisClient.on('ready', () => {
      logger.debug('Redis ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', (delay: number) => {
      logger.info(`Redis reconnecting in ${delay}ms...`);
    });
  }

  await redisClient.connect();
  return redisClient;
}

/**
 * Get Redis client (lazy initialization)
 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_CONFIG);
  }
  return redisClient;
}

/**
 * Get subscriber client (separate connection for pub/sub)
 */
export function getSubscriber(): Redis {
  if (!subscriberClient) {
    subscriberClient = new Redis({ ...REDIS_CONFIG, maxRetriesPerRequest: null });
  }
  return subscriberClient;
}

/**
 * Get publisher client
 */
export function getPublisher(): Redis {
  if (!publisherClient) {
    publisherClient = new Redis(REDIS_CONFIG);
  }
  return publisherClient;
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

export class Cache {
  private prefix: string;

  constructor(prefix: string = 'cache:') {
    this.prefix = prefix;
  }

  private key(k: string): string {
    return `${this.prefix}${k}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const client = getRedis();
    const value = await client.get(this.key(key));
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as any;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const client = getRedis();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await client.setex(this.key(key), ttlSeconds, serialized);
    } else {
      await client.set(this.key(key), serialized);
    }
  }

  async delete(key: string): Promise<void> {
    const client = getRedis();
    await client.del(this.key(key));
  }

  async deletePattern(pattern: string): Promise<void> {
    const client = getRedis();
    const keys = await client.keys(this.key(pattern));
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = getRedis();
    const result = await client.exists(this.key(key));
    return result === 1;
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const client = getRedis();
    return client.incrby(this.key(key), by);
  }

  async expire(key: string, seconds: number): Promise<void> {
    const client = getRedis();
    await client.expire(this.key(key), seconds);
  }

  /**
   * Get or set pattern - fetch from cache, if not exists compute and store
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

// ============================================================================
// LOCATION CACHE (specialized for real-time tracking)
// ============================================================================

export class LocationCache {
  private static instance: LocationCache;
  private cache: Cache;

  private constructor() {
    this.cache = new Cache('location:');
  }

  static getInstance(): LocationCache {
    if (!LocationCache.instance) {
      LocationCache.instance = new LocationCache();
    }
    return LocationCache.instance;
  }

  /**
   * Store live location for a trip
   */
  async setLiveLocation(
    tripId: string,
    location: { latitude: number; longitude: number; speed: number; heading: number }
  ): Promise<void> {
    const client = getRedis();
    await client.hset(
      this.cache['key'](`live:${tripId}`),
      {
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        speed: location.speed.toString(),
        heading: location.heading.toString(),
        timestamp: Date.now().toString(),
      }
    );
    // Set expiry to 24 hours
    await client.expire(this.cache['key'](`live:${tripId}`), 86400);
  }

  /**
   * Get live location for a trip
   */
  async getLiveLocation(tripId: string): Promise<any | null> {
    const client = getRedis();
    const data = await client.hgetall(this.cache['key'](`live:${tripId}`));
    if (!data || !data.latitude) return null;
    return {
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      speed: parseFloat(data.speed),
      heading: parseFloat(data.heading),
      timestamp: parseInt(data.timestamp),
    };
  }

  /**
   * Store location history (for trip replay)
   */
  async addLocationHistory(
    tripId: string,
    location: { latitude: number; longitude: number; speed: number; heading: number }
  ): Promise<void> {
    const client = getRedis();
    const key = this.cache['key'](`history:${tripId}`);
    await client.zadd(
      key,
      Date.now(),
      JSON.stringify({ ...location, timestamp: Date.now() })
    );
    // Keep only last 7 days of history
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await client.zremrangebyscore(key, 0, cutoff);
    await client.expire(key, 7 * 24 * 60 * 60); // 7 days
  }

  /**
   * Get location history for a time range
   */
  async getLocationHistory(
    tripId: string,
    startTime: number,
    endTime: number = Date.now()
  ): Promise<any[]> {
    const client = getRedis();
    const key = this.cache['key'](`history:${tripId}`);
    const results = await client.zrangebyscore(key, startTime, endTime);
    return results.map((r) => JSON.parse(r));
  }

  /**
   * Get all active trips for a user (for fleet tracking)
   */
  async setUserActiveTrips(userId: string, tripIds: string[]): Promise<void> {
    const client = getRedis();
    const key = this.cache['key'](`user_trips:${userId}`);
    if (tripIds.length === 0) {
      await client.del(key);
      return;
    }
    await client.sadd(key, ...tripIds);
    await client.expire(key, 86400); // 24 hours
  }

  async getUserActiveTrips(userId: string): Promise<string[]> {
    const client = getRedis();
    const key = this.cache['key'](`user_trips:${userId}`);
    return client.smembers(key);
  }
}

// ============================================================================
// RATE LIMITER STORE (for distributed rate limiting)
// ============================================================================

export class RateLimitStore {
  private cache: Cache;

  constructor() {
    this.cache = new Cache('ratelimit:');
  }

  async check(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const client = getRedis();
    const fullKey = this.cache['key'](key);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Use Redis sorted set for sliding window
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(fullKey, 0, windowStart);
    pipeline.zcard(fullKey);
    pipeline.zadd(fullKey, now, `${now}-${Math.random()}`);
    pipeline.expire(fullKey, windowSeconds + 1);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) || 0;
    const remaining = Math.max(0, limit - count - 1);
    const resetTime = now + windowSeconds * 1000;

    return {
      allowed: count < limit,
      remaining,
      resetTime,
    };
  }

  async reset(key: string): Promise<void> {
    await this.cache.delete(key);
  }
}

// ============================================================================
// PUB/SUB for WebSocket scaling across multiple server instances
// ============================================================================

export class PubSub {
  private publisher: Redis;
  private subscriber: Redis;

  constructor() {
    this.publisher = getPublisher();
    this.subscriber = getSubscriber();
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, handler: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          handler(JSON.parse(msg));
        } catch (err) {
          logger.error('Error parsing pub/sub message:', err);
        }
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }
}

// ============================================================================
// DISCONNECT (cleanup)
// ============================================================================

export async function disconnectRedis(): Promise<void> {
  const promises: Promise<any>[] = [];
  if (redisClient) promises.push(redisClient.disconnect());
  if (subscriberClient) promises.push(subscriberClient.disconnect());
  if (publisherClient) promises.push(publisherClient.disconnect());
  await Promise.all(promises);
  redisClient = null;
  subscriberClient = null;
  publisherClient = null;
}

// Export for app usage
export { redisClient as redis };
