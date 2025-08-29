import { config } from 'dotenv';
import { z } from 'zod';
import { EnvConfig, LogLevel } from '../types/index.js';

// Load environment variables
config();

// Zod schemas for validation
const LogLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
const NodeEnvSchema = z.enum(['development', 'production', 'test']);

const EnvSchema = z.object({
  // Node.js Environment
  NODE_ENV: NodeEnvSchema.default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  LOG_LEVEL: LogLevelSchema.default('info'),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().default('deepseek-chat'),
  OPENAI_MAX_TOKENS: z.string().transform(Number).pipe(z.number().int().positive()).default('2000'),
  OPENAI_TEMPERATURE: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.7'),

  // Groq Configuration (optional)
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('whisper-large-v3'),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
  REDIS_URL: z.string().optional(),

  // Bot Configuration
  BOT_NAME: z.string().default('WhatsApp AI Bot'),
  BOT_SESSION_NAME: z.string().default('whatsapp-session'),
  BOT_RECONNECT_INTERVAL: z.string().transform(Number).pipe(z.number().int().positive()).default('5000'),
  BOT_MAX_RECONNECT_ATTEMPTS: z.string().transform(Number).pipe(z.number().int().positive()).default('10'),

  // Message Configuration
  MESSAGE_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).default('30000'),
  AUDIO_MAX_SIZE: z.string().transform(Number).pipe(z.number().int().positive()).default('16777216'), // 16MB
  IMAGE_MAX_SIZE: z.string().transform(Number).pipe(z.number().int().positive()).default('5242880'), // 5MB
  MAX_CONTEXT_MESSAGES: z.string().transform(Number).pipe(z.number().int().positive()).default('10'),

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().int().positive()).default('60000'), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default('10'),

  // Cache TTL Configuration (in seconds)
  CACHE_TTL_CONTEXT: z.string().transform(Number).pipe(z.number().int().positive()).default('3600'),
  CACHE_TTL_PAUSE: z.string().transform(Number).pipe(z.number().int().positive()).default('3600'),
  CACHE_TTL_USER_STATE: z.string().transform(Number).pipe(z.number().int().positive()).default('7200'),

  // Optional PDF Configuration
  PDF_API_URL: z.string().optional(),
  PDF_API_KEY: z.string().optional(),
  
  // Cache Configuration
  USE_MEMORY_CACHE: z.string().optional(),

  // Logging Configuration
  LOG_FILE_PATH: z.string().default('logs/bot.log'),
  LOG_MAX_SIZE: z.string().transform(Number).pipe(z.number().int().positive()).default('10485760'), // 10MB
  LOG_MAX_FILES: z.string().transform(Number).pipe(z.number().int().positive()).default('5'),
});

// Validate and parse environment variables
let parsedEnv: z.infer<typeof EnvSchema>;

try {
  // Force reload environment variables
  delete require.cache[require.resolve('dotenv')];
  require('dotenv').config({ override: true });
  
  console.log('Environment variables reloaded:', {
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.substring(0, 20) + '...'
  });
  
  parsedEnv = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.errors
      .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
      .map(err => err.path.join('.'));
    
    const invalidVars = error.errors
      .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
      .map(err => `${err.path.join('.')}: ${err.message}`);

    let errorMessage = 'Environment validation failed:\n';
    
    if (missingVars.length > 0) {
      errorMessage += `\nMissing required variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}`;
    }
    
    if (invalidVars.length > 0) {
      errorMessage += `\nInvalid variables:\n${invalidVars.map(v => `  - ${v}`).join('\n')}`;
    }

    console.error(errorMessage);
    process.exit(1);
  }
  throw error;
}

// Build configuration object
export const env: EnvConfig = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  logLevel: parsedEnv.LOG_LEVEL,

  openai: {
    apiKey: parsedEnv.OPENAI_API_KEY,
    baseUrl: parsedEnv.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: parsedEnv.OPENAI_MODEL,
    maxTokens: parsedEnv.OPENAI_MAX_TOKENS,
    temperature: parsedEnv.OPENAI_TEMPERATURE,
  },

  groq: {
    apiKey: parsedEnv.GROQ_API_KEY || '',
    model: parsedEnv.GROQ_MODEL,
  },

  redis: {
    host: parsedEnv.REDIS_HOST,
    port: parsedEnv.REDIS_PORT,
    password: parsedEnv.REDIS_PASSWORD,
    db: parsedEnv.REDIS_DB,
    url: parsedEnv.REDIS_URL || (parsedEnv.USE_MEMORY_CACHE ? '' : `redis://${parsedEnv.REDIS_HOST}:${parsedEnv.REDIS_PORT}`),
  },

  bot: {
    name: parsedEnv.BOT_NAME,
    sessionName: parsedEnv.BOT_SESSION_NAME,
    reconnectInterval: parsedEnv.BOT_RECONNECT_INTERVAL,
    maxReconnectAttempts: parsedEnv.BOT_MAX_RECONNECT_ATTEMPTS,
    messageTimeout: parsedEnv.MESSAGE_TIMEOUT,
    audioMaxSize: parsedEnv.AUDIO_MAX_SIZE,
    imageMaxSize: parsedEnv.IMAGE_MAX_SIZE,
    maxContextMessages: parsedEnv.MAX_CONTEXT_MESSAGES,
  },

  cache: {
    contextTtl: parsedEnv.CACHE_TTL_CONTEXT,
    pauseTtl: parsedEnv.CACHE_TTL_PAUSE,
    userStateTtl: parsedEnv.CACHE_TTL_USER_STATE,
  },

  rateLimit: {
    windowMs: parsedEnv.RATE_LIMIT_WINDOW,
    maxRequests: parsedEnv.RATE_LIMIT_MAX_REQUESTS,
  },
};

// Validation functions
export function validateConfig(): boolean {
  try {
    // OpenAI API key validation
    if (!env.openai.apiKey || env.openai.apiKey.length < 10) {
      throw new Error('OpenAI API key is required');
    }

    // Test Groq API key format (only if provided)
    if (env.groq.apiKey && !env.groq.apiKey.startsWith('gsk_')) {
      throw new Error('Groq API key must start with "gsk_"');
    }

    // Validate Redis connection string if provided
    if (env.redis.url && env.redis.url.length > 0 && !env.redis.url.startsWith('redis://') && !env.redis.url.startsWith('rediss://')) {
      throw new Error('Redis URL must start with "redis://" or "rediss://"');
    }

    // Validate port ranges
    if (env.port < 1000 || env.port > 65535) {
      throw new Error('Port must be between 1000 and 65535');
    }

    if (env.redis.port < 1 || env.redis.port > 65535) {
      throw new Error('Redis port must be between 1 and 65535');
    }

    // Validate file sizes
    if (env.bot.audioMaxSize > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('Audio max size cannot exceed 50MB');
    }

    if (env.bot.imageMaxSize > 20 * 1024 * 1024) { // 20MB limit
      throw new Error('Image max size cannot exceed 20MB');
    }

    // Validate reasonable timeouts
    if (env.bot.messageTimeout < 5000 || env.bot.messageTimeout > 300000) { // 5s to 5min
      throw new Error('Message timeout must be between 5 seconds and 5 minutes');
    }

    return true;
  } catch (error) {
    console.error(`Configuration validation error: ${error}`);
    return false;
  }
}

// Environment helpers
export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';

// Redis connection helper
export function getRedisConfig() {
  const config: any = {
    host: env.redis.host,
    port: env.redis.port,
    db: env.redis.db,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };

  if (env.redis.password) {
    config.password = env.redis.password;
  }

  return config;
}

// OpenAI configuration helper
export function getOpenAIConfig() {
  return {
    apiKey: env.openai.apiKey,
    baseURL: env.openai.baseUrl,
    organization: undefined, // Add if needed
    maxRetries: 3,
    timeout: env.bot.messageTimeout,
  };
}

// Export specific configurations for easy access
export const {
  openai: openaiConfig,
  groq: groqConfig,
  redis: redisConfig,
  bot: botConfig,
  cache: cacheConfig,
  rateLimit: rateLimitConfig,
} = env;

// Initialize and validate configuration on import
if (!validateConfig()) {
  process.exit(1);
}

// Log configuration summary (without sensitive data)
console.log('Configuration loaded:', {
  nodeEnv: env.nodeEnv,
  port: env.port,
  logLevel: env.logLevel,
  botName: env.bot.name,
  redisHost: env.redis.host,
  redisPort: env.redis.port,
  openaiModel: env.openai.model,
  groqModel: env.groq.model,
});