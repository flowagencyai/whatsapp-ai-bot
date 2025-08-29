import { 
  MessageContext, 
  UserState, 
  RateLimitStatus, 
  CacheKey,
  ProcessedMessage,
  BotError 
} from '../../types/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { memoryCache } from './memoryCache.js';

class RedisClient {
  private static instance: RedisClient;

  private constructor() {
    logger.info('Using in-memory cache (Redis disabled)');
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    logger.info('Memory cache initialized');
  }

  public async disconnect(): Promise<void> {
    logger.info('Memory cache disconnected');
  }

  public async isHealthy(): Promise<boolean> {
    return true;
  }

  // Context Management
  public async getContext(userId: string): Promise<MessageContext | null> {
    try {
      const key = this.buildKey('context', userId);
      const data = await memoryCache.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting context from cache', { userId, error: error as Error });
      return null;
    }
  }

  public async setContext(userId: string, context: MessageContext, ttlSeconds?: number): Promise<void> {
    try {
      const key = this.buildKey('context', userId);
      const ttl = ttlSeconds || env.cache.contextTtl;
      await memoryCache.set(key, JSON.stringify(context), ttl);
      
      logger.debug('Context saved to cache', { userId, messageCount: context.messages.length });
    } catch (error) {
      logger.error('Error setting context in cache', { userId, error: error as Error });
      throw new BotError('Failed to save context', 'CACHE_SET_ERROR');
    }
  }

  public async deleteContext(userId: string): Promise<void> {
    try {
      const key = this.buildKey('context', userId);
      await memoryCache.del(key);
      logger.debug('Context deleted from cache', { userId });
    } catch (error) {
      logger.error('Error deleting context from cache', { userId, error: error as Error });
    }
  }

  // User State Management
  public async getUserState(userId: string): Promise<UserState | null> {
    try {
      const key = this.buildKey('userState', userId);
      const data = await memoryCache.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting user state from cache', { userId, error: error as Error });
      return null;
    }
  }

  public async setUserState(userId: string, state: UserState, ttlSeconds?: number): Promise<void> {
    try {
      const key = this.buildKey('userState', userId);
      const ttl = ttlSeconds || env.cache.userStateTtl;
      await memoryCache.set(key, JSON.stringify(state), ttl);
    } catch (error) {
      logger.error('Error setting user state in cache', { userId, error: error as Error });
    }
  }

  // Pause Management
  public async isPaused(userId: string): Promise<boolean> {
    try {
      const key = this.buildKey('pause', userId);
      return await memoryCache.exists(key);
    } catch (error) {
      logger.error('Error checking pause status', { userId, error: error as Error });
      return false;
    }
  }

  public async setPause(userId: string, duration: number): Promise<void> {
    try {
      const key = this.buildKey('pause', userId);
      const pauseData = {
        userId,
        pausedAt: Date.now(),
        resumeAt: Date.now() + duration,
        duration
      };
      
      await memoryCache.set(key, JSON.stringify(pauseData), Math.ceil(duration / 1000));
      logger.info('User paused', { userId, durationMs: duration });
    } catch (error) {
      logger.error('Error setting pause', { userId, error: error as Error });
    }
  }

  public async removePause(userId: string): Promise<void> {
    try {
      const key = this.buildKey('pause', userId);
      await memoryCache.del(key);
      logger.info('User pause removed', { userId });
    } catch (error) {
      logger.error('Error removing pause', { userId, error: error as Error });
    }
  }

  // Rate Limiting
  public async getRateLimitStatus(userId: string): Promise<RateLimitStatus> {
    try {
      const key = this.buildKey('rateLimit', userId);
      const data = await memoryCache.get(key);
      
      if (!data) {
        return {
          requests: 0,
          resetTime: Date.now() + env.rateLimit.windowMs,
          blocked: false
        };
      }
      
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error getting rate limit status', { userId, error: error as Error });
      return { requests: 0, resetTime: Date.now() + env.rateLimit.windowMs, blocked: false };
    }
  }

  public async incrementRateLimit(userId: string): Promise<RateLimitStatus> {
    try {
      const key = this.buildKey('rateLimit', userId);
      const currentStatus = await this.getRateLimitStatus(userId);
      
      // Check if window has expired
      if (Date.now() > currentStatus.resetTime) {
        currentStatus.requests = 0;
        currentStatus.resetTime = Date.now() + env.rateLimit.windowMs;
        currentStatus.blocked = false;
      }
      
      currentStatus.requests++;
      currentStatus.blocked = currentStatus.requests > env.rateLimit.maxRequests;
      
      const ttl = Math.ceil((currentStatus.resetTime - Date.now()) / 1000);
      await memoryCache.set(key, JSON.stringify(currentStatus), ttl);
      
      return currentStatus;
    } catch (error) {
      logger.error('Error incrementing rate limit', { userId, error: error as Error });
      return { requests: 1, resetTime: Date.now() + env.rateLimit.windowMs, blocked: false };
    }
  }

  // Utility Methods
  public async flushAll(): Promise<void> {
    try {
      await memoryCache.clear();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Error clearing cache', { error: error as Error });
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      return await memoryCache.exists(key);
    } catch (error) {
      logger.error('Error checking key existence', { key, error: error as Error });
      return false;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await memoryCache.set(key, value, ttlSeconds);
  }

  public async get(key: string): Promise<string | null> {
    return await memoryCache.get(key);
  }

  public async del(key: string): Promise<void> {
    await memoryCache.del(key);
  }

  // Build cache keys
  private buildKey(type: keyof CacheKey, identifier: string): string {
    const keys: CacheKey = {
      context: (userId: string) => `chat_${userId}_context`,
      pause: (userId: string) => `pause_${userId}`,
      userState: (userId: string) => `user_${userId}_state`,
      rateLimit: (userId: string) => `rate_${userId}`
    };
    
    return keys[type](identifier);
  }

  // Additional methods for messageHandler compatibility
  public async checkRateLimit(userId: string): Promise<RateLimitStatus> {
    return this.incrementRateLimit(userId);
  }

  public async addMessageToContext(userId: string, message: ProcessedMessage): Promise<MessageContext> {
    try {
      let context = await this.getContext(userId);
      
      if (!context) {
        context = {
          userId,
          messages: [],
          metadata: {
            conversationStarted: Date.now(),
            lastActivity: Date.now(),
            totalMessages: 0,
          },
        };
      }

      // Add the new message
      context.messages.push(message);
      context.metadata.lastActivity = Date.now();
      context.metadata.totalMessages = context.messages.length;

      // Limit context size (keep last 10 messages)
      if (context.messages.length > 10) {
        context.messages = context.messages.slice(-10);
      }

      // Save updated context
      await this.setContext(userId, context);
      
      return context;
    } catch (error) {
      logger.error('Error adding message to context', { userId, error: error as Error });
      throw new BotError('Failed to add message to context', 'CONTEXT_UPDATE_ERROR');
    }
  }

  public async clearContext(userId: string): Promise<void> {
    return this.deleteContext(userId);
  }

  public async pauseUser(userId: string, duration: number): Promise<void> {
    return this.setPause(userId, duration);
  }

  public async resumeUser(userId: string): Promise<void> {
    return this.removePause(userId);
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const isHealthy = await this.isHealthy();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          cache: 'memory',
          connection: isHealthy ? 'connected' : 'disconnected',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  // Simple conversation index to track active conversations
  private conversationIndex = new Set<string>();

  // Conversation metadata management
  public async saveConversationMetadata(userId: string, lastMessage: string, messageType: 'text' | 'audio' | 'image' | 'unknown' = 'text'): Promise<void> {
    try {
      const key = `conversation_${userId}`;
      const metadata = {
        id: userId.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        remoteJid: userId,
        name: this.formatUserName(userId),
        lastMessage: lastMessage.substring(0, 100), // Limit message preview
        lastMessageTime: new Date().toISOString(),
        messageType,
        unreadCount: 0,
        isGroup: userId.includes('@g.us'),
        status: 'active',
        profilePicture: null,
        updatedAt: Date.now(),
      };
      
      await memoryCache.set(key, JSON.stringify(metadata), 86400); // 24 hours TTL
      
      // Add to conversation index
      this.conversationIndex.add(userId);
      
      logger.debug('Conversation metadata saved', { userId, messageType });
    } catch (error) {
      logger.error('Error saving conversation metadata', { userId, error: error as Error });
    }
  }

  private formatUserName(userId: string): string {
    if (userId.includes('@g.us')) {
      return 'Grupo WhatsApp';
    }
    
    // Extract phone number and format
    const phone = userId.replace('@s.whatsapp.net', '');
    if (phone.length === 13 && phone.startsWith('55')) {
      const ddd = phone.substring(2, 4);
      const number = phone.substring(4);
      if (number.length === 9) {
        return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
      }
    }
    return phone;
  }

  public async getAllConversations(): Promise<any[]> {
    try {
      const conversations = [];
      
      for (const userId of this.conversationIndex) {
        const key = `conversation_${userId}`;
        const data = await memoryCache.get(key);
        if (data) {
          const metadata = JSON.parse(data);
          conversations.push(metadata);
        }
      }
      
      // Sort by last message time (most recent first)
      conversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      
      logger.debug('Retrieved conversations', { count: conversations.length });
      return conversations;
    } catch (error) {
      logger.error('Error getting all conversations', { error: error as Error });
      return [];
    }
  }

  // Health check method
  public async ping(): Promise<string> {
    return 'PONG (Memory Cache)';
  }
}

// Export singleton instance
export const Redis = RedisClient.getInstance();
export default Redis;