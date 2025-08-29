import { RedisClient } from '@/services/memory/redisClient';
import { MessageContext, ProcessedMessage } from '@/types';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    ping: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    mGet: jest.fn(),
    multi: jest.fn(() => ({
      setEx: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
    info: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
  })),
}));

describe('RedisClient', () => {
  let redisClient: RedisClient;
  let mockRedis: any;

  beforeEach(() => {
    // Get fresh instance for each test
    redisClient = (RedisClient as any).getInstance();
    mockRedis = require('redis').createClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (RedisClient as any).instance = null;
  });

  describe('connection management', () => {
    it('should connect to Redis successfully', async () => {
      mockRedis.connect.mockResolvedValue(undefined);
      
      await redisClient.connect();
      
      expect(mockRedis.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockRedis.connect.mockRejectedValue(error);
      
      await expect(redisClient.connect()).rejects.toThrow('Redis connection failed');
    });

    it('should ping Redis successfully', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      
      const result = await redisClient.ping();
      
      expect(result).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalledTimes(1);
    });
  });

  describe('context management', () => {
    const userId = '5511999999999@s.whatsapp.net';
    const mockContext: MessageContext = {
      userId,
      messages: [],
      lastActivity: Date.now(),
      isPaused: false,
      metadata: {
        conversationStarted: Date.now(),
        totalMessages: 0,
      },
    };

    it('should set and get context successfully', async () => {
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(JSON.stringify(mockContext));

      await redisClient.setContext(userId, mockContext);
      const result = await redisClient.getContext(userId);

      expect(mockRedis.setEx).toHaveBeenCalled();
      expect(result).toEqual(mockContext);
    });

    it('should return null for non-existent context', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await redisClient.getContext(userId);

      expect(result).toBeNull();
    });

    it('should add message to context successfully', async () => {
      const message: ProcessedMessage = {
        id: 'msg_123',
        from: userId,
        fromMe: false,
        timestamp: Date.now(),
        body: 'Hello world',
        isForwarded: false,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockContext));
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await redisClient.addMessageToContext(userId, message);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(message);
      expect(result.metadata.totalMessages).toBe(1);
    });

    it('should clear context successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      await redisClient.clearContext(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`chat:${userId}:context`);
    });
  });

  describe('pause management', () => {
    const userId = '5511999999999@s.whatsapp.net';

    it('should check if user is not paused', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await redisClient.isPaused(userId);

      expect(result).toBe(false);
    });

    it('should check if user is paused', async () => {
      const futureTime = Date.now() + 60000;
      mockRedis.get.mockResolvedValue(futureTime.toString());

      const result = await redisClient.isPaused(userId);

      expect(result).toBe(true);
    });

    it('should handle expired pause', async () => {
      const pastTime = Date.now() - 60000;
      mockRedis.get.mockResolvedValue(pastTime.toString());
      mockRedis.del.mockResolvedValue(1);

      const result = await redisClient.isPaused(userId);

      expect(result).toBe(false);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should pause user successfully', async () => {
      const duration = 60000;
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(null); // No existing context

      await redisClient.pauseUser(userId, duration);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `chat:${userId}:pause`,
        60,
        expect.any(String)
      );
    });

    it('should resume user successfully', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.get.mockResolvedValue(null); // No existing context

      await redisClient.resumeUser(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`chat:${userId}:pause`);
    });
  });

  describe('rate limiting', () => {
    const userId = '5511999999999@s.whatsapp.net';

    it('should allow first request', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await redisClient.checkRateLimit(userId);

      expect(result.blocked).toBe(false);
      expect(result.requests).toBe(1);
    });

    it('should track multiple requests', async () => {
      mockRedis.get.mockResolvedValue('5');
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await redisClient.checkRateLimit(userId);

      expect(result.blocked).toBe(false);
      expect(result.requests).toBe(6);
    });

    it('should block after exceeding limit', async () => {
      mockRedis.get.mockResolvedValue('10'); // Assuming limit is 10

      const result = await redisClient.checkRateLimit(userId);

      expect(result.blocked).toBe(true);
      expect(result.requests).toBe(11);
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('used_memory:1024');

      const result = await redisClient.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.details.connected).toBeDefined();
      expect(result.details.pingTime).toBeDefined();
    });

    it('should return unhealthy status on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await redisClient.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toBe('Connection failed');
    });
  });

  describe('generic cache operations', () => {
    it('should get and set generic values', async () => {
      const key = 'test-key';
      const value = { test: 'data' };
      const serializedValue = JSON.stringify(value);

      mockRedis.get.mockResolvedValue(serializedValue);
      mockRedis.setEx.mockResolvedValue('OK');

      await redisClient.set(key, value, 60);
      const result = await redisClient.get(key);

      expect(mockRedis.setEx).toHaveBeenCalledWith(key, 60, serializedValue);
      expect(result).toEqual(value);
    });

    it('should check existence', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await redisClient.exists('test-key');

      expect(result).toBe(true);
    });

    it('should handle bulk operations', async () => {
      const keys = ['key1', 'key2'];
      const values = ['value1', 'value2'];

      mockRedis.mGet.mockResolvedValue(values);

      const result = await redisClient.mget(keys);

      expect(mockRedis.mGet).toHaveBeenCalledWith(keys);
      expect(result).toEqual(values);
    });
  });
});