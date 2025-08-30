import { AdminStats, AdminUser, AdminMemoryInfo } from '../types/admin.js';
import { Redis } from '../memory/redisClient.js';
import { langchainService } from '../ai/langchain.js';
import { whatsappConnection } from '../../connection/whatsapp.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

/**
 * Admin Statistics Manager
 * Provides system statistics and monitoring data for admin interface
 * Completely isolated from main bot functionality
 */
export class AdminStatsManager {
  private static instance: AdminStatsManager;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  public static getInstance(): AdminStatsManager {
    if (!AdminStatsManager.instance) {
      AdminStatsManager.instance = new AdminStatsManager();
    }
    return AdminStatsManager.instance;
  }

  /**
   * Get comprehensive system statistics
   */
  public async getSystemStats(): Promise<AdminStats> {
    try {
      const [serviceHealth, botStats, aiStats] = await Promise.all([
        this.getServiceHealth(),
        this.getBotStats(),
        this.getAIStats()
      ]);

      return {
        system: {
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          version: '2.0.0',
          nodeEnv: env.nodeEnv,
          memoryUsage: process.memoryUsage()
        },
        bot: botStats,
        ai: aiStats,
        services: serviceHealth
      };
    } catch (error) {
      logger.error('Failed to get system stats', { error: error as Error });
      throw error;
    }
  }

  /**
   * Get all active users with their information
   */
  public async getActiveUsers(): Promise<AdminUser[]> {
    try {
      // Get all conversations from Redis
      const conversations = await Redis.getAllConversations();
      const users: AdminUser[] = [];

      // Return empty array if no real conversations exist
      if (conversations.length === 0) {
        return [];
      }

      for (const conversation of conversations) {
        try {
          const userId = conversation.userId || conversation.id;
          if (!userId) continue;

          const isPaused = await Redis.isPaused(userId);
          const context = await Redis.getContext(userId);

          users.push({
            id: userId,
            phone: this.formatPhoneNumber(userId),
            name: conversation.name || undefined,
            status: isPaused ? 'paused' : 'active',
            lastMessage: conversation.lastMessage || 'N/A',
            lastActivity: conversation.lastActivity || new Date().toISOString(),
            messageCount: conversation.totalMessages || 0,
            isBlacklisted: false, // TODO: Implement blacklist functionality
            context: {
              messageCount: context.messages.length,
              conversationStarted: context.metadata.conversationStarted,
              lastReset: context.metadata.lastReset || context.metadata.conversationStarted
            }
          });
        } catch (userError) {
          logger.warn('Failed to get user data', { 
            userId: conversation.userId || conversation.id, 
            error: userError as Error 
          });
        }
      }

      return users.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    } catch (error) {
      logger.error('Failed to get active users', { error: error as Error });
      throw error;
    }
  }

  /**
   * Get memory information for specific user
   */
  public async getUserMemory(userId: string): Promise<AdminMemoryInfo | null> {
    try {
      const context = await Redis.getContext(userId);
      const memoryStats = langchainService.getMemoryStats();

      return {
        userId,
        phone: this.formatPhoneNumber(userId),
        memorySize: context.messages.length,
        messages: context.messages.map(msg => ({
          role: msg.fromMe ? 'assistant' : 'user',
          content: msg.body || '[media message]',
          timestamp: new Date(msg.timestamp).toISOString()
        })),
        lastActivity: new Date(Math.max(...context.messages.map(m => m.timestamp))).toISOString()
      };
    } catch (error) {
      logger.error('Failed to get user memory', { 
        userId, 
        error: error as Error 
      });
      return null;
    }
  }

  /**
   * Clear memory for specific user
   */
  public async clearUserMemory(userId: string, admin: string): Promise<boolean> {
    try {
      await Redis.clearContext(userId);
      langchainService.clearUserMemory(userId);
      
      logger.info('User memory cleared by admin', { userId, admin });
      return true;
    } catch (error) {
      logger.error('Failed to clear user memory', { 
        userId, 
        admin,
        error: error as Error 
      });
      return false;
    }
  }

  /**
   * Pause user
   */
  public async pauseUser(userId: string, duration: number, admin: string): Promise<boolean> {
    try {
      await Redis.pauseUser(userId, duration);
      
      logger.info('User paused by admin', { userId, duration, admin });
      return true;
    } catch (error) {
      logger.error('Failed to pause user', { 
        userId, 
        duration,
        admin,
        error: error as Error 
      });
      return false;
    }
  }

  /**
   * Resume user
   */
  public async resumeUser(userId: string, admin: string): Promise<boolean> {
    try {
      await Redis.resumeUser(userId);
      
      logger.info('User resumed by admin', { userId, admin });
      return true;
    } catch (error) {
      logger.error('Failed to resume user', { 
        userId, 
        admin,
        error: error as Error 
      });
      return false;
    }
  }

  /**
   * Bulk clear all memories
   */
  public async clearAllMemories(admin: string): Promise<number> {
    try {
      const users = await this.getActiveUsers();
      let clearedCount = 0;

      for (const user of users) {
        try {
          await this.clearUserMemory(user.id, admin);
          clearedCount++;
        } catch (error) {
          logger.warn('Failed to clear memory for user', { 
            userId: user.id, 
            error: error as Error 
          });
        }
      }

      logger.info('Bulk memory clear completed', { 
        totalUsers: users.length, 
        clearedCount, 
        admin 
      });

      return clearedCount;
    } catch (error) {
      logger.error('Failed to clear all memories', { 
        admin,
        error: error as Error 
      });
      throw error;
    }
  }

  /**
   * Get service health status
   */
  private async getServiceHealth(): Promise<AdminStats['services']> {
    try {
      const [whatsappHealth, langchainHealth, redisHealth] = await Promise.all([
        whatsappConnection.healthCheck().catch(() => ({ status: 'unhealthy' as const })),
        langchainService.healthCheck().catch(() => ({ status: 'unhealthy' as const })),
        Redis.healthCheck().catch(() => ({ status: 'unhealthy' as const }))
      ]);

      return {
        whatsapp: whatsappHealth.status,
        langchain: langchainHealth.status,
        redis: redisHealth.status
      };
    } catch (error) {
      logger.error('Failed to get service health', { error: error as Error });
      return {
        whatsapp: 'unhealthy',
        langchain: 'unhealthy',
        redis: 'unhealthy'
      };
    }
  }

  /**
   * Get bot-specific statistics
   */
  private async getBotStats(): Promise<AdminStats['bot']> {
    try {
      const conversations = await Redis.getAllConversations();
      
      // If no real conversations, return zero stats
      if (conversations.length === 0) {
        return {
          totalMessages: 0,
          totalUsers: 0,
          activeUsers: 0,
          messagesLast24h: 0
        };
      }
      
      const totalUsers = conversations.length;
      
      // Calculate active users (last activity within 24h)
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      let activeUsers = 0;
      let totalMessages = 0;
      let messagesLast24h = 0;

      for (const conversation of conversations) {
        const lastActivity = new Date(conversation.lastActivity || 0).getTime();
        
        if (lastActivity > oneDayAgo) {
          activeUsers++;
          messagesLast24h += conversation.recentMessages || 0;
        }
        
        totalMessages += conversation.totalMessages || 0;
      }

      return {
        totalMessages,
        totalUsers,
        activeUsers,
        messagesLast24h
      };
    } catch (error) {
      logger.error('Failed to get bot stats', { error: error as Error });
      return {
        totalMessages: 0,
        totalUsers: 0,
        activeUsers: 0,
        messagesLast24h: 0
      };
    }
  }

  /**
   * Get AI-specific statistics
   */
  private async getAIStats(): Promise<AdminStats['ai']> {
    try {
      // Get real AI metrics from LangChain service
      const aiStats = langchainService.getAIStats();
      
      // Return real AI stats or zeros if no data
      if (aiStats.totalTokens === 0) {
        return {
          totalTokens: 0,
          averageResponseTime: 0,
          successRate: 0
        };
      }
      
      return {
        totalTokens: aiStats.totalTokens,
        averageResponseTime: aiStats.averageResponseTime,
        successRate: aiStats.successRate
      };
    } catch (error) {
      logger.error('Failed to get AI stats', { error: error as Error });
      return {
        totalTokens: 0,
        averageResponseTime: 0,
        successRate: 0
      };
    }
  }


  /**
   * Format phone number for display
   */
  private formatPhoneNumber(userId: string): string {
    // Extract phone number from WhatsApp ID format
    const phone = userId.replace('@s.whatsapp.net', '');
    
    // Format Brazilian phone numbers
    if (phone.startsWith('55') && phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    
    return `+${phone}`;
  }
}

// Export singleton instance
export const adminStatsManager = AdminStatsManager.getInstance();