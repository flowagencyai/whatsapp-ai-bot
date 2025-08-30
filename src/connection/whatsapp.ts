import { 
  makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  ConnectionState,
  AuthenticationState,
  proto
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BotError } from '@/types';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { EventEmitter } from 'events';

interface WhatsAppEvents {
  'connection.ready': [WASocket];
  'connection.lost': [Error];
  'connection.restored': [WASocket];
  'qr.generated': [string];
  'auth.success': [AuthenticationState];
  'message.received': [proto.IWebMessageInfo];
}

class WhatsAppConnection extends EventEmitter {
  private socket: WASocket | null = null;
  private static instance: WhatsAppConnection;
  private sessionPath: string;
  private reconnectAttempts = 0;
  private isReconnecting = false;
  private connectionState: ConnectionState['connection'] = 'close';
  private currentQR: string | null = null;
  private currentQRVisual: string | null = null;
  private currentQRImage: string | null = null;

  private constructor() {
    super();
    this.sessionPath = join(process.cwd(), 'sessions', env.bot.sessionName);
    this.ensureSessionDir();
  }

  public static getInstance(): WhatsAppConnection {
    if (!WhatsAppConnection.instance) {
      WhatsAppConnection.instance = new WhatsAppConnection();
    }
    return WhatsAppConnection.instance;
  }

  private ensureSessionDir(): void {
    try {
      if (!existsSync(this.sessionPath)) {
        mkdirSync(this.sessionPath, { recursive: true });
        logger.info('Session directory created', { 
          metadata: { sessionPath: this.sessionPath } 
        });
      }
    } catch (error) {
      logger.error('Failed to create session directory', { 
        error: error as Error,
        metadata: { sessionPath: this.sessionPath }
      });
      throw new BotError('Session directory creation failed', 'SESSION_DIR_ERROR');
    }
  }

  /**
   * Clear session directory to force new authentication
   */
  private async clearSession(): Promise<void> {
    try {
      const { rmSync } = await import('fs');
      
      if (existsSync(this.sessionPath)) {
        rmSync(this.sessionPath, { recursive: true, force: true });
        logger.info('Session directory cleared', { 
          metadata: { sessionPath: this.sessionPath } 
        });
      }
      
      // Recreate the directory for next connection
      this.ensureSessionDir();
    } catch (error) {
      logger.error('Failed to clear session directory', { 
        error: error as Error,
        metadata: { sessionPath: this.sessionPath }
      });
    }
  }

  /**
   * Initialize WhatsApp connection
   */
  public async connect(): Promise<WASocket> {
    try {
      logger.info('Initializing WhatsApp connection...');

      // Load authentication state
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      
      // Create socket with configuration
      this.socket = makeWASocket({
        auth: state,
        logger: logger.getPinoLogger().child({ module: 'baileys' }),
        browser: ['Ubuntu', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: env.bot.messageTimeout,
        retryRequestDelayMs: 1000,
        maxMsgRetryCount: 3,
        emitOwnEvents: false,
        keepAliveIntervalMs: 10000,
        getMessage: async (key) => {
          // Return empty message for message retry
          return { conversation: '' };
        },
      });

      // Set up event handlers
      this.setupEventHandlers(this.socket, saveCreds);

      return this.socket;

    } catch (error) {
      logger.error('Failed to initialize WhatsApp connection', { error: error as Error });
      throw new BotError(
        `WhatsApp connection failed: ${(error as Error).message}`,
        'CONNECTION_INIT_ERROR'
      );
    }
  }

  /**
   * Set up event handlers for WhatsApp socket
   */
  private setupEventHandlers(socket: WASocket, saveCreds: () => Promise<void>): void {
    // Connection state changes
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('QR Code generated, scan to authenticate');
        this.generateQRCode(qr);
      }

      if (connection === 'open') {
        this.connectionState = 'open';
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.clearQR(); // Clear QR code when connected
        
        logger.connectionReady();
        this.emit('connection.ready', socket);
      }

      if (connection === 'close') {
        this.connectionState = 'close';
        const shouldReconnect = this.handleDisconnection(lastDisconnect);
        
        if (shouldReconnect) {
          await this.attemptReconnect();
        }
      }

      if (connection === 'connecting') {
        this.connectionState = 'connecting';
        logger.info('WhatsApp connection attempting...');
      }
    });

    // Authentication credentials update
    socket.ev.on('creds.update', async () => {
      try {
        await saveCreds();
        logger.debug('Authentication credentials updated');
      } catch (error) {
        logger.error('Failed to save credentials', { error: error as Error });
      }
    });

    // Messages received
    socket.ev.on('messages.upsert', (m) => {
      for (const message of m.messages) {
        if (message.key && message.message) {
          this.emit('message.received', message);
        }
      }
    });

    // Message updates (delivery receipts, etc.)
    socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        if (update.update.status) {
          logger.debug('Message status updated', {
            metadata: {
              messageId: update.key.id,
              status: update.update.status,
            }
          });
        }
      }
    });

    // Presence updates
    socket.ev.on('presence.update', ({ id, presences }) => {
      logger.debug('Presence updated', {
        metadata: { id, presence: Object.keys(presences) }
      });
    });

    // Group updates
    socket.ev.on('groups.update', (updates) => {
      for (const update of updates) {
        logger.debug('Group updated', {
          metadata: { groupId: update.id, changes: Object.keys(update) }
        });
      }
    });

    // Contacts update
    socket.ev.on('contacts.update', (updates) => {
      logger.debug(`${updates.length} contacts updated`);
    });

    // Chats update
    socket.ev.on('chats.update', (updates) => {
      logger.debug(`${updates.length} chats updated`);
    });

    // Call events
    socket.ev.on('call', (calls) => {
      for (const call of calls) {
        logger.info('Call received', {
          metadata: {
            callId: call.id,
            from: call.from,
            status: call.status,
          }
        });
        
        // Optionally reject calls automatically
        if (call.status === 'ringing') {
          socket.rejectCall(call.id, call.from).catch((error) => {
            logger.error('Failed to reject call', { error });
          });
        }
      }
    });
  }

  /**
   * Generate QR code for authentication
   */
  private async generateQRCode(qr: string): Promise<void> {
    this.currentQR = qr;
    
    try {
      // Generate QR code image as base64 for web display
      this.currentQRImage = await QRCode.toDataURL(qr, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        width: 512,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        scale: 8
      });
      
      // Generate ASCII QR code for terminal
      const qrcodeTerminal = require('qrcode-terminal');
      
      // Hack para capturar o output do qrcode-terminal
      const originalWrite = process.stdout.write;
      let qrOutput = '';
      
      // Interceptar o output
      process.stdout.write = function(chunk: any) {
        if (typeof chunk === 'string' && chunk.includes('█')) {
          qrOutput += chunk;
          return true;
        }
        return originalWrite.call(process.stdout, chunk);
      } as any;
      
      // Gerar QR code
      qrcodeTerminal.generate(qr, { small: true });
      
      // Restaurar stdout
      process.stdout.write = originalWrite;
      
      // Salvar QR visual
      if (qrOutput.trim()) {
        this.currentQRVisual = qrOutput.trim();
      }
      
    } catch (error) {
      logger.error('Failed to generate QR code', { error: error as Error });
    }
    
    // Also display in console
    console.log('\n=== SCAN QR CODE TO AUTHENTICATE ===\n');
    qrcodeTerminal.generate(qr, { small: true });
    console.log('\n=======================================\n');
    
    this.emit('qr.generated', qr);
  }

  /**
   * Get current QR code
   */
  public getCurrentQR(): string | null {
    return this.currentQR;
  }

  /**
   * Get current QR code visual (ASCII art)
   */
  public getCurrentQRVisual(): string | null {
    return this.currentQRVisual;
  }

  /**
   * Get current QR code image (base64)
   */
  public getCurrentQRImage(): string | null {
    return this.currentQRImage;
  }

  /**
   * Clear current QR code
   */
  public clearQR(): void {
    this.currentQR = null;
    this.currentQRVisual = null;
    this.currentQRImage = null;
  }

  /**
   * Handle disconnection events
   */
  private handleDisconnection(lastDisconnect: any): boolean {
    if (!lastDisconnect?.error) return false;

    const statusCode = lastDisconnect.error?.output?.statusCode;
    const error = new Error(lastDisconnect.error?.message || 'Unknown disconnection');
    
    logger.connectionLost(error);
    this.emit('connection.lost', error);

    // Determine if we should reconnect
    switch (statusCode) {
      case DisconnectReason.badSession:
        logger.error('Bad session file, delete and re-authenticate');
        return false;
        
      case DisconnectReason.connectionClosed:
        logger.warn('Connection closed, attempting to reconnect');
        return true;
        
      case DisconnectReason.connectionLost:
        logger.warn('Connection lost, attempting to reconnect');
        return true;
        
      case DisconnectReason.connectionReplaced:
        logger.warn('Connection replaced by another session');
        return false;
        
      case DisconnectReason.loggedOut:
        logger.error('Device logged out, delete session and re-authenticate');
        return false;
        
      case DisconnectReason.restartRequired:
        logger.info('Restart required, reconnecting');
        return true;
        
      case DisconnectReason.timedOut:
        logger.warn('Connection timed out, reconnecting');
        return true;
        
      case DisconnectReason.multideviceMismatch:
        logger.error('Multi-device mismatch, re-authentication required');
        return false;
        
      default:
        logger.warn(`Unknown disconnection reason: ${statusCode}`, {
          metadata: { statusCode, error: error.message }
        });
        return true;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    if (this.isReconnecting || this.reconnectAttempts >= env.bot.maxReconnectAttempts) {
      if (this.reconnectAttempts >= env.bot.maxReconnectAttempts) {
        logger.error('Maximum reconnection attempts reached');
        throw new BotError('Max reconnection attempts reached', 'MAX_RECONNECT_EXCEEDED');
      }
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      env.bot.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      60000 // Max 1 minute delay
    );

    logger.info(`Attempting reconnection ${this.reconnectAttempts}/${env.bot.maxReconnectAttempts} in ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();
      logger.connectionRestored();
      this.emit('connection.restored', this.socket!);
    } catch (error) {
      logger.error(`Reconnection attempt ${this.reconnectAttempts} failed`, { error: error as Error });
      this.isReconnecting = false;
      
      if (this.reconnectAttempts < env.bot.maxReconnectAttempts) {
        await this.attemptReconnect();
      }
    }
  }

  /**
   * Generate random delay for human-like behavior
   */
  private getRandomDelay(min: number = 1000, max: number = 3000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Calculate typing time based on message length (simulates human typing speed)
   */
  private calculateTypingTime(text: string): number {
    // Average human typing: 40-60 WPM (words per minute)
    const wordsPerMinute = 45;
    const charactersPerMinute = wordsPerMinute * 5; // Average 5 chars per word
    const charactersPerSecond = charactersPerMinute / 60;
    
    // Base typing time + random variation
    const baseTime = (text.length / charactersPerSecond) * 1000;
    const variation = baseTime * 0.3; // ±30% variation
    const randomVariation = (Math.random() - 0.5) * variation;
    
    // Minimum 1s, maximum 10s for very long messages
    return Math.max(1000, Math.min(10000, baseTime + randomVariation));
  }

  /**
   * Send typing indicator
   */
  private async sendTypingIndicator(jid: string, duration: number): Promise<void> {
    if (!this.socket || this.connectionState !== 'open') return;

    try {
      await this.socket.sendPresenceUpdate('composing', jid);
      
      // Keep typing indicator active for the specified duration
      setTimeout(async () => {
        if (this.socket && this.connectionState === 'open') {
          await this.socket.sendPresenceUpdate('paused', jid);
        }
      }, duration);
      
      logger.debug('Typing indicator sent', { jid, duration });
    } catch (error) {
      logger.debug('Failed to send typing indicator', { error: error as Error, jid });
    }
  }

  /**
   * Send a text message with human-like behavior
   */
  public async sendMessage(jid: string, text: string): Promise<string | undefined> {
    if (!this.socket || this.connectionState !== 'open') {
      throw new BotError('WhatsApp not connected', 'NOT_CONNECTED');
    }

    try {
      // Step 1: Random initial delay (simulates thinking/processing time)
      const initialDelay = this.getRandomDelay(800, 2000);
      logger.debug('Applying initial delay', { jid, delay: initialDelay });
      await new Promise(resolve => setTimeout(resolve, initialDelay));

      // Step 2: Send typing indicator and calculate typing time
      const typingTime = this.calculateTypingTime(text);
      logger.debug('Starting typing simulation', { jid, typingTime, textLength: text.length });
      
      await this.sendTypingIndicator(jid, typingTime);
      
      // Step 3: Wait for typing simulation to complete
      await new Promise(resolve => setTimeout(resolve, typingTime));

      // Step 4: Send the actual message
      const result = await this.socket.sendMessage(jid, { text });
      logger.messageSent(result?.key?.id || 'unknown', jid);
      
      // Step 5: Final small delay (simulates network/delivery time)
      const finalDelay = this.getRandomDelay(200, 500);
      await new Promise(resolve => setTimeout(resolve, finalDelay));
      
      return result?.key?.id;
    } catch (error) {
      logger.error('Failed to send message', { 
        error: error as Error,
        metadata: { jid, textLength: text.length }
      });
      throw new BotError(
        `Failed to send message: ${(error as Error).message}`,
        'SEND_MESSAGE_ERROR'
      );
    }
  }

  /**
   * Send an image message
   */
  public async sendImage(
    jid: string, 
    imageBuffer: Buffer, 
    caption?: string,
    mimeType: string = 'image/jpeg'
  ): Promise<string | undefined> {
    if (!this.socket || this.connectionState !== 'open') {
      throw new BotError('WhatsApp not connected', 'NOT_CONNECTED');
    }

    try {
      const result = await this.socket.sendMessage(jid, {
        image: imageBuffer,
        caption,
        mimetype: mimeType,
      });
      
      logger.info('Image sent', {
        metadata: { 
          jid, 
          size: imageBuffer.length, 
          hasCaption: !!caption,
          messageId: result?.key?.id 
        }
      });
      
      return result?.key?.id;
    } catch (error) {
      logger.error('Failed to send image', { 
        error: error as Error,
        metadata: { jid, size: imageBuffer.length, mimeType }
      });
      throw new BotError(
        `Failed to send image: ${(error as Error).message}`,
        'SEND_IMAGE_ERROR'
      );
    }
  }

  /**
   * Send a document
   */
  public async sendDocument(
    jid: string, 
    documentBuffer: Buffer, 
    filename: string,
    mimeType: string,
    caption?: string
  ): Promise<string | undefined> {
    if (!this.socket || this.connectionState !== 'open') {
      throw new BotError('WhatsApp not connected', 'NOT_CONNECTED');
    }

    try {
      const result = await this.socket.sendMessage(jid, {
        document: documentBuffer,
        fileName: filename,
        mimetype: mimeType,
        caption,
      });
      
      logger.info('Document sent', {
        metadata: { 
          jid, 
          filename,
          size: documentBuffer.length, 
          hasCaption: !!caption,
          messageId: result?.key?.id 
        }
      });
      
      return result?.key?.id;
    } catch (error) {
      logger.error('Failed to send document', { 
        error: error as Error,
        metadata: { jid, filename, size: documentBuffer.length, mimeType }
      });
      throw new BotError(
        `Failed to send document: ${(error as Error).message}`,
        'SEND_DOCUMENT_ERROR'
      );
    }
  }

  /**
   * Download media from message
   */
  public async downloadMedia(message: proto.IWebMessageInfo): Promise<Buffer | null> {
    if (!this.socket) {
      throw new BotError('WhatsApp not connected', 'NOT_CONNECTED');
    }

    try {
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const msg = message.message || quoted;

      if (!msg) return null;

      // Check if message has media
      const hasMedia = !!(
        msg.imageMessage || 
        msg.videoMessage || 
        msg.audioMessage || 
        msg.documentMessage ||
        msg.stickerMessage
      );

      if (!hasMedia) return null;

      const buffer = await this.socket.downloadMediaMessage(
        message,
        'buffer',
        {},
        { 
          logger: logger.getPinoLogger().child({ module: 'media-download' }),
          reuploadRequest: this.socket.updateMediaMessage
        }
      );

      return buffer as Buffer;

    } catch (error) {
      logger.error('Failed to download media', { 
        error: error as Error,
        metadata: { messageId: message.key?.id }
      });
      throw new BotError(
        `Failed to download media: ${(error as Error).message}`,
        'DOWNLOAD_MEDIA_ERROR'
      );
    }
  }

  /**
   * Get socket instance
   */
  public getSocket(): WASocket | null {
    return this.socket;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connectionState === 'open' && !!this.socket;
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionState['connection'] {
    return this.connectionState;
  }

  /**
   * Disconnect and cleanup - clears session for new connection
   */
  public async disconnect(): Promise<void> {
    try {
      // Close current socket
      if (this.socket) {
        await this.socket.end(undefined);
        this.socket = null;
      }
      
      // Clear QR codes
      this.currentQR = null;
      this.currentQRVisual = null;
      this.currentQRImage = null;
      
      // Reset connection state
      this.connectionState = 'close';
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      
      // Clear session directory to force new authentication
      await this.clearSession();
      
      logger.info('WhatsApp disconnected and session cleared');
      
      // Auto-reconnect to generate new QR code
      setTimeout(() => {
        logger.info('Starting new connection for QR code generation');
        this.connect().catch(error => {
          logger.error('Failed to start new connection', { error });
        });
      }, 1000); // Wait 1 second before reconnecting
      
    } catch (error) {
      logger.error('Error during disconnect', { error: error as Error });
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const isConnected = this.isConnected();
      
      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        details: {
          connected: isConnected,
          connectionState: this.connectionState,
          reconnectAttempts: this.reconnectAttempts,
          isReconnecting: this.isReconnecting,
          sessionPath: this.sessionPath,
          sessionExists: existsSync(this.sessionPath),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          connected: false,
        },
      };
    }
  }
}

// Export singleton instance
export const whatsappConnection = WhatsAppConnection.getInstance();

// Export type for dependency injection
export type { WhatsAppConnection, WhatsAppEvents };