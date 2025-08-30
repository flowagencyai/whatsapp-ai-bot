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

  // Global Bot Pause Management
  public async isBotPaused(): Promise<boolean> {
    try {
      const key = 'bot_global_pause';
      return await memoryCache.exists(key);
    } catch (error) {
      logger.error('Error checking global bot pause status', { error: error as Error });
      return false;
    }
  }

  public async pauseBot(duration: number): Promise<void> {
    try {
      const key = 'bot_global_pause';
      const pauseData = {
        pausedAt: Date.now(),
        resumeAt: Date.now() + duration,
        duration
      };
      
      await memoryCache.set(key, JSON.stringify(pauseData), Math.ceil(duration / 1000));
      logger.info('Bot paused globally', { durationMs: duration });
    } catch (error) {
      logger.error('Error setting global bot pause', { error: error as Error });
      throw error;
    }
  }

  public async resumeBot(): Promise<void> {
    try {
      const key = 'bot_global_pause';
      await memoryCache.del(key);
      logger.info('Bot resumed globally');
    } catch (error) {
      logger.error('Error removing global bot pause', { error: error as Error });
      throw error;
    }
  }

  // Global Bot Rate Limiting (Anti-Ban Protection)
  public async checkGlobalBotRateLimit(): Promise<{ allowed: boolean; resetTime: number; currentCount: number }> {
    try {
      const key = 'bot_global_rate_limit';
      const hourlyLimit = 100; // 100 messages per hour for the entire bot
      const windowMs = 60 * 60 * 1000; // 1 hour window
      
      const data = await memoryCache.get(key);
      const now = Date.now();
      
      if (!data) {
        // First message in the hour
        const rateLimitData = {
          count: 1,
          resetTime: now + windowMs,
          windowStart: now
        };
        
        await memoryCache.set(key, JSON.stringify(rateLimitData), Math.ceil(windowMs / 1000));
        
        return {
          allowed: true,
          resetTime: rateLimitData.resetTime,
          currentCount: 1
        };
      }
      
      const rateLimitData = JSON.parse(data);
      
      // Check if window has expired
      if (now > rateLimitData.resetTime) {
        // Reset window
        const newRateLimitData = {
          count: 1,
          resetTime: now + windowMs,
          windowStart: now
        };
        
        await memoryCache.set(key, JSON.stringify(newRateLimitData), Math.ceil(windowMs / 1000));
        
        return {
          allowed: true,
          resetTime: newRateLimitData.resetTime,
          currentCount: 1
        };
      }
      
      // Increment counter
      rateLimitData.count++;
      const allowed = rateLimitData.count <= hourlyLimit;
      
      // Update cache
      const ttl = Math.ceil((rateLimitData.resetTime - now) / 1000);
      await memoryCache.set(key, JSON.stringify(rateLimitData), ttl);
      
      return {
        allowed,
        resetTime: rateLimitData.resetTime,
        currentCount: rateLimitData.count
      };
      
    } catch (error) {
      logger.error('Error checking global bot rate limit', { error: error as Error });
      // Allow message on error to avoid blocking
      return {
        allowed: true,
        resetTime: Date.now() + (60 * 60 * 1000),
        currentCount: 0
      };
    }
  }

  public async getGlobalBotRateLimit(): Promise<{ currentCount: number; resetTime: number; limit: number }> {
    try {
      const key = 'bot_global_rate_limit';
      const hourlyLimit = 100;
      
      const data = await memoryCache.get(key);
      if (!data) {
        return {
          currentCount: 0,
          resetTime: Date.now() + (60 * 60 * 1000),
          limit: hourlyLimit
        };
      }
      
      const rateLimitData = JSON.parse(data);
      return {
        currentCount: rateLimitData.count || 0,
        resetTime: rateLimitData.resetTime || Date.now() + (60 * 60 * 1000),
        limit: hourlyLimit
      };
      
    } catch (error) {
      logger.error('Error getting global bot rate limit', { error: error as Error });
      return {
        currentCount: 0,
        resetTime: Date.now() + (60 * 60 * 1000),
        limit: 100
      };
    }
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
      const now = Date.now();
      const currentTime = new Date().toISOString();
      
      // Get existing metadata to preserve counters
      let existingData: any = {};
      try {
        const existing = await memoryCache.get(key);
        if (existing) {
          existingData = JSON.parse(existing);
        }
      } catch (err) {
        // Ignore parsing errors, start fresh
      }
      
      const metadata = {
        id: userId.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        userId: userId, // Add full userId for admin interface
        remoteJid: userId,
        name: this.formatUserName(userId),
        lastMessage: lastMessage.substring(0, 100),
        lastMessageTime: currentTime,
        lastActivity: currentTime,
        messageType,
        unreadCount: 0,
        isGroup: userId.includes('@g.us'),
        status: 'active',
        profilePicture: null,
        updatedAt: now,
        // Message counters
        totalMessages: (existingData.totalMessages || 0) + 1,
        recentMessages: this.calculateRecentMessages(existingData, now),
        // First conversation timestamp
        conversationStarted: existingData.conversationStarted || currentTime,
        // Track message types
        messageTypeCount: {
          ...existingData.messageTypeCount,
          [messageType]: (existingData.messageTypeCount?.[messageType] || 0) + 1
        }
      };
      
      await memoryCache.set(key, JSON.stringify(metadata), 86400); // 24 hours TTL
      
      // Add to conversation index
      this.conversationIndex.add(userId);
      
      logger.debug('Conversation metadata saved', { 
        userId, 
        messageType, 
        totalMessages: metadata.totalMessages 
      });
    } catch (error) {
      logger.error('Error saving conversation metadata', { userId, error: error as Error });
    }
  }
  
  private calculateRecentMessages(existingData: any, currentTime: number): number {
    const oneDayAgo = currentTime - (24 * 60 * 60 * 1000);
    const lastUpdate = existingData.updatedAt || currentTime;
    
    // If last update was more than 24h ago, reset counter
    if (lastUpdate < oneDayAgo) {
      return 1;
    }
    
    return (existingData.recentMessages || 0) + 1;
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
  
  // Test method to create sample conversations (dev only)
  public async createTestConversations(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;
    
    const testConversations = [
      {
        userId: '5511999999999@s.whatsapp.net',
        messages: ['Olá!', 'Como você está?', 'Obrigado pela resposta!']
      },
      {
        userId: '5511888888888@s.whatsapp.net', 
        messages: ['Preciso de ajuda', 'Sobre produtos naturais']
      },
      {
        userId: '5511777777777@s.whatsapp.net',
        messages: ['Bom dia!']
      }
    ];
    
    for (const conv of testConversations) {
      // Create conversation metadata
      await this.saveConversationMetadata(
        conv.userId,
        conv.messages[conv.messages.length - 1],
        'text'
      );
      
      // Create context with messages
      const context = {
        userId: conv.userId,
        messages: conv.messages.map((msg, idx) => ({
          body: msg,
          fromMe: idx % 2 === 1, // Alternate between user and bot
          timestamp: Date.now() - (conv.messages.length - idx) * 60000, // Spread over time
          id: `test_${idx}`,
          messageType: 'text' as const
        })),
        metadata: {
          conversationStarted: Date.now() - conv.messages.length * 60000,
          lastActivity: Date.now(),
          totalMessages: conv.messages.length
        }
      };
      
      await this.setContext(conv.userId, context);
    }
    
    logger.info('Test conversations created', { count: testConversations.length });
    
    // Simulate some AI interactions for the metrics
    const langchainService = await import('../ai/langchain');
    const service = langchainService.langchainService;
    
    // Simulate some metrics (artificially add to show working metrics)
    (service as any).metrics = {
      ...(service as any).metrics,
      totalTokens: 1250,
      totalRequests: 8,
      successfulRequests: 7,
      totalResponseTime: 12000 // 8 requests averaging 1.5s each
    };
    
    logger.info('Test AI metrics added');
  }
}

// Export singleton instance
export const Redis = RedisClient.getInstance();
export default Redis;