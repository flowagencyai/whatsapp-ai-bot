import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { whatsappConnection } from './connection/whatsapp.js';
import { Redis } from './services/memory/redisClient.js';
import { messageHandler } from './handlers/messageHandler.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';
import { BotError } from './types/index.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { adminConfigManager } from './services/admin/configManager.js';

class WhatsAppBot {
  private app: express.Application;
  private server: any;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS configuration - Allow all origins in development
    this.app.use(cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));
    
    // Serve static files
    this.app.use(express.static(join(process.cwd(), 'public')));
    
    // Basic middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.debug(`${req.method} ${req.path}`, {
          metadata: {
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('user-agent'),
            ip: req.ip,
          }
        });
      });
      
      next();
    });

    // CORS headers for frontend
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Security headers
    this.app.use((req, res, next) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.getHealthStatus();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed', { error: error as Error });
        res.status(500).json({
          status: 'unhealthy',
          error: 'Health check failed',
        });
      }
    });

    // Status endpoint with detailed information
    this.app.get('/status', async (req, res) => {
      try {
        const whatsappHealth = await whatsappConnection.healthCheck();
        const redisHealth = await Redis.healthCheck();
        const handlerHealth = await messageHandler.healthCheck();

        res.json({
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          environment: env.nodeEnv,
          version: process.env.npm_package_version || '1.0.0',
          services: {
            whatsapp: whatsappHealth,
            redis: redisHealth,
            messageHandler: handlerHealth,
          },
          memory: process.memoryUsage(),
          pid: process.pid,
        });
      } catch (error) {
        logger.error('Status endpoint error', { error: error as Error });
        res.status(500).json({ error: 'Status check failed' });
      }
    });

    // Manual message endpoint (for testing)
    this.app.post('/send-message', async (req, res) => {
      try {
        const { to, message } = req.body;
        
        if (!to || !message) {
          return res.status(400).json({
            error: 'Missing required fields: to, message'
          });
        }

        const messageId = await whatsappConnection.sendMessage(to, message);
        
        res.json({
          success: true,
          messageId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Send message endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to send message',
          details: (error as Error).message,
        });
      }
    });

    // User management endpoints
    this.app.post('/users/:userId/pause', async (req, res) => {
      try {
        const { userId } = req.params;
        const { duration = env.cache.pauseTtl * 1000 } = req.body;
        
        await Redis.pauseUser(userId, duration);
        
        res.json({
          success: true,
          message: `User ${userId} paused for ${duration}ms`,
          pausedUntil: new Date(Date.now() + duration).toISOString(),
        });
      } catch (error) {
        logger.error('Pause user endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to pause user',
          details: (error as Error).message,
        });
      }
    });

    this.app.post('/users/:userId/resume', async (req, res) => {
      try {
        const { userId } = req.params;
        
        await Redis.resumeUser(userId);
        
        res.json({
          success: true,
          message: `User ${userId} resumed`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Resume user endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to resume user',
          details: (error as Error).message,
        });
      }
    });

    this.app.delete('/users/:userId/context', async (req, res) => {
      try {
        const { userId } = req.params;
        
        await Redis.clearContext(userId);
        
        res.json({
          success: true,
          message: `Context cleared for user ${userId}`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Clear context endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to clear context',
          details: (error as Error).message,
        });
      }
    });

    // QR Code endpoint for frontend
    this.app.get('/api/qr', async (req, res) => {
      try {
        const qrCode = whatsappConnection.getCurrentQR();
        const qrCodeVisual = whatsappConnection.getCurrentQRVisual();
        const qrCodeImage = whatsappConnection.getCurrentQRImage();
        const isConnected = whatsappConnection.isConnected();
        
        res.json({
          success: true,
          qrCode,
          qrCodeVisual,
          qrCodeImage,
          isConnected,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('QR Code endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to get QR code',
          details: (error as Error).message,
        });
      }
    });

    // Bot status endpoint for frontend
    this.app.get('/api/bot-status', async (req, res) => {
      try {
        const isConnected = whatsappConnection.isConnected();
        const qrCode = whatsappConnection.getCurrentQR();
        
        res.json({
          success: true,
          status: isConnected ? 'connected' : 'disconnected',
          qrAvailable: !!qrCode,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Bot status endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to get bot status',
          details: (error as Error).message,
        });
      }
    });

    // Global Bot Control endpoints
    this.app.post('/api/bot/pause', async (req, res) => {
      try {
        const { duration = env.cache.pauseTtl * 1000 } = req.body;
        
        await Redis.pauseBot(duration);
        
        res.json({
          success: true,
          message: `Bot paused globally for ${Math.round(duration / 60000)} minutes`,
          pausedUntil: new Date(Date.now() + duration).toISOString(),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Bot pause endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to pause bot',
          details: (error as Error).message,
        });
      }
    });

    this.app.post('/api/bot/resume', async (req, res) => {
      try {
        await Redis.resumeBot();
        
        res.json({
          success: true,
          message: 'Bot resumed globally',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Bot resume endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to resume bot',
          details: (error as Error).message,
        });
      }
    });

    // Disconnect WhatsApp endpoint
    this.app.post('/api/disconnect', async (req, res) => {
      try {
        await whatsappConnection.disconnect();
        
        res.json({
          success: true,
          message: 'WhatsApp disconnected successfully',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Disconnect endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to disconnect WhatsApp',
          details: (error as Error).message,
        });
      }
    });

    // Conversations endpoint for frontend dashboard
    this.app.get('/api/conversations', async (req, res) => {
      try {
        // Get real conversations from cache
        const conversations = await Redis.getAllConversations();
        
        res.json({
          success: true,
          conversations,
          total: conversations.length,
          timestamp: new Date().toISOString(),
          note: conversations.length === 0 
            ? "Bot está conectado! Envie uma mensagem no WhatsApp para ver conversas reais." 
            : undefined
        });
      } catch (error) {
        logger.error('Conversations endpoint error', { error: error as Error });
        res.status(500).json({
          error: 'Failed to get conversations',
          details: (error as Error).message,
        });
      }
    });

    // Get conversation messages endpoint
    this.app.get('/api/conversations/:userId/messages', async (req, res) => {
      try {
        const { userId } = req.params;
        const context = await Redis.getContext(userId);
        
        if (!context) {
          return res.json({
            success: true,
            messages: [],
            total: 0,
            userId,
            timestamp: new Date().toISOString(),
            note: "Nenhum contexto encontrado para este usuário."
          });
        }
        
        res.json({
          success: true,
          messages: context.messages,
          total: context.messages.length,
          userId,
          metadata: context.metadata,
          isPaused: context.isPaused,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Conversation messages endpoint error', { error: error as Error, userId: req.params.userId });
        res.status(500).json({
          error: 'Failed to get conversation messages',
          details: (error as Error).message,
        });
      }
    });

    // Test endpoint to create sample data (development only)
    this.app.post('/api/test/create-conversations', async (req, res) => {
      if (env.nodeEnv !== 'development') {
        return res.status(403).json({
          error: 'This endpoint is only available in development mode'
        });
      }
      
      try {
        await Redis.createTestConversations();
        res.json({
          success: true,
          message: 'Test conversations created',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to create test conversations', { error: error as Error });
        res.status(500).json({
          error: 'Failed to create test conversations',
          details: (error as Error).message
        });
      }
    });

    // Authentication routes
    this.app.use('/api/auth', authRouter);

    // User API routes for personal settings
    this.app.use('/api/user', userRouter);
    // Admin API routes (isolated from main bot functionality) - now protected by auth
    this.app.use('/api/admin', adminRouter);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Express error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Express error handler', { 
        error,
        metadata: {
          method: req.method,
          url: req.url,
          userAgent: req.get('user-agent'),
          ip: req.ip,
        }
      });

      if (res.headersSent) {
        return next(error);
      }

      const statusCode = error.status || error.statusCode || 500;
      res.status(statusCode).json({
        error: 'Internal server error',
        message: env.nodeEnv === 'development' ? error.message : 'Something went wrong',
      });
    });
  }

  /**
   * Get overall health status
   */
  private async getHealthStatus(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const [whatsappHealth, redisHealth, handlerHealth] = await Promise.all([
        whatsappConnection.healthCheck(),
        Redis.healthCheck(),
        messageHandler.healthCheck(),
      ]);

      const allHealthy = [whatsappHealth, redisHealth, handlerHealth]
        .every(h => h.status === 'healthy');

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        details: {
          whatsapp: whatsappHealth.status,
          redis: redisHealth.status,
          messageHandler: handlerHealth.status,
          messageHandlerDetails: handlerHealth.details,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    logger.info('Initializing services...');

    try {
      // Initialize Redis connection
      logger.info('Connecting to Redis...');
      await Redis.connect();
      logger.info('Redis connected successfully');

      // Initialize Admin Configuration Manager
      logger.info('Initializing admin configuration...');
      await adminConfigManager.initialize();
      logger.info('Admin configuration initialized successfully');

      // Initialize WhatsApp connection
      logger.info('Initializing WhatsApp connection...');
      const socket = await whatsappConnection.connect();
      
      // Set up message handler
      whatsappConnection.on('message.received', (message) => {
        messageHandler.handleMessage(message).catch((error) => {
          logger.error('Unhandled message processing error', { error });
        });
      });

      logger.info('All services initialized successfully');

    } catch (error) {
      logger.error('Service initialization failed', { error: error as Error });
      throw new BotError(
        `Service initialization failed: ${(error as Error).message}`,
        'INITIALIZATION_ERROR'
      );
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn(`Received ${signal} during shutdown, forcing exit`);
        process.exit(1);
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(() => {
            logger.info('HTTP server closed');
          });
        }

        // Close WhatsApp connection
        await whatsappConnection.disconnect();
        logger.info('WhatsApp connection closed');

        // Close Redis connection
        await Redis.disconnect();
        logger.info('Redis connection closed');

        // Cleanup temporary files
        // await audioProcessor.cleanup();
        logger.info('Cleanup completed');

        logger.info('Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        logger.error('Error during shutdown', { error: error as Error });
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught Exception', { error });
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal('Unhandled Rejection', { 
        error: reason as Error,
        metadata: { promise: promise.toString() }
      });
      setTimeout(() => process.exit(1), 1000);
    });
  }

  /**
   * Start the bot
   */
  public async start(): Promise<void> {
    try {
      logger.info(`Starting ZecaBot in ${env.nodeEnv} mode...`);
      
      // Setup graceful shutdown first
      this.setupGracefulShutdown();

      // Initialize all services
      await this.initializeServices();

      // Start HTTP server
      this.server = this.app.listen(env.port, () => {
        logger.info(`HTTP server listening on port ${env.port}`);
        logger.info('ZecaBot started successfully! 🚀');
        
        // Log configuration summary
        logger.info('Bot Configuration:', {
          metadata: {
            nodeEnv: env.nodeEnv,
            logLevel: env.logLevel,
            botName: env.bot.name,
            openaiModel: env.openai.model,
            groqModel: env.groq.model,
            maxContextMessages: env.bot.maxContextMessages,
            rateLimitWindow: env.rateLimit.windowMs,
            rateLimitMax: env.rateLimit.maxRequests,
          }
        });
      });

      // Handle server errors
      this.server.on('error', (error: Error) => {
        logger.error('HTTP server error', { error });
        if ((error as any).code === 'EADDRINUSE') {
          logger.error(`Port ${env.port} is already in use`);
          process.exit(1);
        }
      });

    } catch (error) {
      logger.fatal('Failed to start bot', { error: error as Error });
      process.exit(1);
    }
  }

  /**
   * Get Express app (for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Create and start bot instance
const bot = new WhatsAppBot();

// Start the bot if this file is run directly
if (require.main === module) {
  bot.start().catch((error) => {
    logger.fatal('Bot startup failed', { error });
    process.exit(1);
  });
}

// Export for testing
export { WhatsAppBot };
export default bot;