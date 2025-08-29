import pino, { Logger as PinoLogger } from 'pino';
import { LogLevel, LogContext } from '@/types';

class Logger {
  private logger: PinoLogger;
  private static instance: Logger;

  private constructor() {
    const logLevel = process.env.LOG_LEVEL as LogLevel || 'info';
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.logger = pino({
      level: logLevel,
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
              messageFormat: '{levelName} - {msg}',
              levelFirst: false,
              messageKey: 'msg',
            },
          }
        : undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label: string) {
          return { levelName: label.toUpperCase() };
        },
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      this.logger.fatal({ error }, 'Uncaught Exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.fatal(
        { reason, promise },
        'Unhandled Promise Rejection'
      );
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatContext(context?: LogContext): Record<string, unknown> {
    if (!context) return {};

    const formatted: Record<string, unknown> = {};

    if (context.userId) formatted.userId = context.userId;
    if (context.messageId) formatted.messageId = context.messageId;
    if (context.command) formatted.command = context.command;
    if (context.duration) formatted.duration = `${context.duration}ms`;
    if (context.error) formatted.error = context.error;
    if (context.metadata) formatted.metadata = context.metadata;

    return formatted;
  }

  public trace(message: string, context?: LogContext): void {
    this.logger.trace(this.formatContext(context), message);
  }

  public debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatContext(context), message);
  }

  public info(message: string, context?: LogContext): void {
    this.logger.info(this.formatContext(context), message);
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatContext(context), message);
  }

  public error(message: string, context?: LogContext): void {
    this.logger.error(this.formatContext(context), message);
  }

  public fatal(message: string, context?: LogContext): void {
    this.logger.fatal(this.formatContext(context), message);
  }

  // Convenience methods for common scenarios
  public messageReceived(messageId: string, userId: string, messageType: string): void {
    this.info('Message received', {
      messageId,
      userId,
      metadata: { messageType },
    });
  }

  public messageSent(messageId: string, userId: string): void {
    this.info('Message sent', {
      messageId,
      userId,
    });
  }

  public commandExecuted(command: string, userId: string, success: boolean, duration: number): void {
    this.info(`Command ${success ? 'executed successfully' : 'failed'}`, {
      userId,
      command,
      duration,
      metadata: { success },
    });
  }

  public userPaused(userId: string, duration: number): void {
    this.info('User conversation paused', {
      userId,
      metadata: { pauseDuration: duration },
    });
  }

  public userResumed(userId: string): void {
    this.info('User conversation resumed', {
      userId,
    });
  }

  public connectionReady(): void {
    this.info('WhatsApp connection established successfully');
  }

  public connectionLost(error: Error): void {
    this.error('WhatsApp connection lost', { error });
  }

  public connectionRestored(): void {
    this.info('WhatsApp connection restored');
  }

  public rateLimitExceeded(userId: string, resetTime: number): void {
    this.warn('Rate limit exceeded', {
      userId,
      metadata: { resetTime: new Date(resetTime).toISOString() },
    });
  }

  public mediaProcessing(mediaType: string, size: number, userId: string): void {
    this.debug('Processing media', {
      userId,
      metadata: { mediaType, size },
    });
  }

  public mediaProcessed(mediaType: string, duration: number, userId: string): void {
    this.info('Media processed successfully', {
      userId,
      duration,
      metadata: { mediaType },
    });
  }

  public aiRequest(model: string, tokens: number, userId: string): void {
    this.debug('AI request initiated', {
      userId,
      metadata: { model, tokens },
    });
  }

  public aiResponse(
    model: string,
    tokensUsed: number,
    duration: number,
    userId: string
  ): void {
    this.info('AI response received', {
      userId,
      duration,
      metadata: { model, tokensUsed },
    });
  }

  public transcriptionRequest(userId: string, audioSize: number): void {
    this.debug('Audio transcription requested', {
      userId,
      metadata: { audioSize },
    });
  }

  public transcriptionComplete(
    userId: string,
    duration: number,
    textLength: number
  ): void {
    this.info('Audio transcription completed', {
      userId,
      duration,
      metadata: { textLength },
    });
  }

  public imageAnalysisRequest(userId: string, imageSize: number): void {
    this.debug('Image analysis requested', {
      userId,
      metadata: { imageSize },
    });
  }

  public imageAnalysisComplete(
    userId: string,
    duration: number,
    resultLength: number
  ): void {
    this.info('Image analysis completed', {
      userId,
      duration,
      metadata: { resultLength },
    });
  }

  // Performance monitoring
  public startTimer(label: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`Timer [${label}] completed`, {
        metadata: { label, duration },
      });
      return duration;
    };
  }

  // Health check logging
  public healthCheck(status: 'healthy' | 'unhealthy', details?: Record<string, unknown>): void {
    const level = status === 'healthy' ? 'info' : 'error';
    this.logger[level]({ ...details }, `Health check: ${status}`);
  }

  // Cache operations
  public cacheHit(key: string, userId?: string): void {
    this.debug('Cache hit', {
      userId,
      metadata: { key },
    });
  }

  public cacheMiss(key: string, userId?: string): void {
    this.debug('Cache miss', {
      userId,
      metadata: { key },
    });
  }

  public cacheSet(key: string, ttl: number, userId?: string): void {
    this.debug('Cache set', {
      userId,
      metadata: { key, ttl },
    });
  }

  // Database operations
  public dbQuery(query: string, duration: number, success: boolean): void {
    this.debug(`Database query ${success ? 'completed' : 'failed'}`, {
      duration,
      metadata: { query: query.substring(0, 100), success },
    });
  }

  // Security events
  public suspiciousActivity(userId: string, reason: string, metadata?: Record<string, unknown>): void {
    this.warn('Suspicious activity detected', {
      userId,
      metadata: { reason, ...metadata },
    });
  }

  public userBlocked(userId: string, reason: string): void {
    this.warn('User blocked', {
      userId,
      metadata: { reason },
    });
  }

  public userUnblocked(userId: string): void {
    this.info('User unblocked', {
      userId,
    });
  }

  // Get the underlying Pino logger for advanced usage
  public getPinoLogger(): PinoLogger {
    return this.logger;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export type for dependency injection
export type { Logger };