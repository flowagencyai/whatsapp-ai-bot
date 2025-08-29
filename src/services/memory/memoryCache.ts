// Simple in-memory cache implementation
class MemoryCache {
  private cache = new Map<string, { value: any; expiry?: number }>();
  private static instance: MemoryCache;

  public static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.cache.set(key, { value, expiry });
  }

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Cleanup expired keys
  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  constructor() {
    // Cleanup expired keys every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
}

export const memoryCache = MemoryCache.getInstance();