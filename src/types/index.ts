import { proto, WAMessage, WASocket, BaileysEventMap } from '@whiskeysockets/baileys';

// Bot Configuration Types
export interface BotConfig {
  name: string;
  sessionName: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageTimeout: number;
  audioMaxSize: number;
  imageMaxSize: number;
  maxContextMessages: number;
}

// Message Types
export interface ProcessedMessage {
  id: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  body?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  mediaCaption?: string;
  quotedMessage?: ProcessedMessage;
  isForwarded: boolean;
}

export interface MessageContext {
  userId: string;
  messages: ProcessedMessage[];
  lastActivity: number;
  isPaused: boolean;
  pausedUntil?: number;
  metadata: {
    userName?: string;
    userPhone?: string;
    conversationStarted: number;
    totalMessages: number;
  };
}

// Command Types
export enum CommandType {
  RESET = 'RESET',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  PDF = 'PDF',
  STATUS = 'STATUS',
  HELP = 'HELP'
}

export interface Command {
  type: CommandType;
  args?: string[];
  executedAt: number;
  userId: string;
}

// AI Service Types
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  confidence?: number;
}

export interface ImageAnalysisResult {
  description: string;
  objects?: string[];
  text?: string;
  confidence?: number;
}

// Redis Cache Types
export interface CacheKey {
  context: (userId: string) => string;
  pause: (userId: string) => string;
  userState: (userId: string) => string;
  rateLimiting: (userId: string) => string;
  rateLimit: (userId: string) => string;
}

export interface UserState {
  userId: string;
  status: 'active' | 'paused' | 'blocked';
  lastSeen: number;
  messageCount: number;
  rateLimitHits: number;
  preferences: {
    language?: string;
    notifications?: boolean;
  };
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDuration?: number;
}

export interface RateLimitStatus {
  requests: number;
  resetTime: number;
  blocked: boolean;
}

// Media Processing Types
export interface MediaProcessorConfig {
  maxSize: number;
  allowedFormats: string[];
  compressionQuality?: number;
}

export interface ProcessedMedia {
  buffer: Buffer;
  mimeType: string;
  size: number;
  originalName?: string;
  processedAt: number;
}

// Event Types
export interface BotEventMap {
  'message.received': [ProcessedMessage, MessageContext];
  'message.sent': [string, string]; // messageId, userId
  'command.executed': [Command, boolean]; // command, success
  'user.paused': [string, number]; // userId, duration
  'user.resumed': [string]; // userId
  'connection.ready': [WASocket];
  'connection.lost': [Error];
  'connection.restored': [WASocket];
  'rate.limit.exceeded': [string, RateLimitStatus]; // userId, status
  'error': [Error, string?]; // error, context
}

// Webhook Types (if needed for external integrations)
export interface WebhookPayload {
  event: keyof BotEventMap;
  data: unknown;
  timestamp: number;
  botId: string;
}

// Logger Types
export interface LogContext {
  userId?: string;
  messageId?: string;
  command?: string;
  duration?: number;
  durationMs?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
  textLength?: number;
  messageCount?: number;
  key?: string;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Environment Configuration Types
export interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  logLevel: LogLevel;
  
  // OpenAI/DeepSeek
  openai: {
    apiKey: string;
    baseUrl?: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Groq
  groq: {
    apiKey: string;
    model: string;
  };
  
  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    url: string;
  };
  
  // Bot
  bot: BotConfig;
  
  // Cache TTL
  cache: {
    contextTtl: number;
    pauseTtl: number;
    userStateTtl: number;
  };
  
  // Rate Limiting
  rateLimit: RateLimitConfig;
}

// Database Types (Prisma-compatible)
export interface User {
  id: string;
  phone: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  isBlocked: boolean;
  preferences: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  messageCount: number;
  status: 'active' | 'paused' | 'ended';
  context: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversationId: string;
  fromUser: boolean;
  content: string;
  mediaType?: string;
  mediaUrl?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Error Types
export class BotError extends Error {
  constructor(
    message: string,
    public code: string,
    public userId?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export class RateLimitError extends BotError {
  constructor(userId: string, resetTime: number) {
    super(
      `Rate limit exceeded for user ${userId}. Resets at ${new Date(resetTime).toISOString()}`,
      'RATE_LIMIT_EXCEEDED',
      userId,
      { resetTime }
    );
  }
}

export class MediaProcessingError extends BotError {
  constructor(message: string, mediaType: string, size?: number) {
    super(message, 'MEDIA_PROCESSING_ERROR', undefined, { mediaType, size });
  }
}

export class AIServiceError extends BotError {
  constructor(message: string, service: string, model?: string) {
    super(message, 'AI_SERVICE_ERROR', undefined, { service, model });
  }
}