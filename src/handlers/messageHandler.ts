import { proto } from '@whiskeysockets/baileys';
import { 
  ProcessedMessage, 
  MessageContext, 
  Command, 
  CommandType,
  BotError,
  RateLimitError
} from '@/types';
import { whatsappConnection } from '@/connection/whatsapp';
import { Redis } from '@/services/memory/redisClient';
import { langchainService } from '@/services/ai/langchain';
import { audioProcessor } from '@/services/media/audioProcessor';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';

class MessageHandler {
  private static instance: MessageHandler;

  private constructor() {}

  public static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler();
    }
    return MessageHandler.instance;
  }

  /**
   * Main message processing entry point
   */
  public async handleMessage(message: proto.IWebMessageInfo): Promise<void> {
    let userId: string | null = null;
    
    try {
      // Extract and validate message
      const processedMessage = await this.processIncomingMessage(message);
      if (!processedMessage) return;

      userId = processedMessage.from;
      
      // Skip messages from the bot itself
      if (processedMessage.fromMe) {
        logger.debug('Skipping own message', { userId, messageId: processedMessage.id });
        return;
      }

      logger.messageReceived(processedMessage.id, userId, this.getMessageType(processedMessage));
      
      // Save conversation metadata for frontend listing
      const messageType = this.getMessageType(processedMessage);
      const lastMessagePreview = processedMessage.body || 
        (processedMessage.mediaType === 'audio' ? '[Mensagem de áudio]' : 
         processedMessage.mediaType === 'image' ? '[Mensagem com imagem]' : 
         `[${processedMessage.mediaType || 'Mensagem'}]`);
      
      await Redis.saveConversationMetadata(userId, lastMessagePreview, messageType as any);

      // Check rate limiting
      const rateLimitStatus = await Redis.checkRateLimit(userId);
      if (rateLimitStatus.blocked) {
        logger.rateLimitExceeded(userId, rateLimitStatus.resetTime);
        await this.sendRateLimitMessage(userId, rateLimitStatus.resetTime);
        return;
      }

      // Check if user is paused
      const isPaused = await Redis.isPaused(userId);
      if (isPaused) {
        logger.debug('User is paused, skipping message', { userId });
        return;
      }

      // Add message to context
      const context = await Redis.addMessageToContext(userId, processedMessage);

      // Check for commands first
      const command = this.extractCommand(processedMessage.body);
      if (command) {
        await this.handleCommand(command, userId, context);
        return;
      }

      // Handle different message types
      if (processedMessage.mediaType === 'audio') {
        await this.handleAudioMessage(processedMessage, context, userId);
      } else if (processedMessage.mediaType === 'image') {
        await this.handleImageMessage(processedMessage, context, userId);
      } else if (processedMessage.body) {
        await this.handleTextMessage(processedMessage.body, context, userId);
      } else {
        logger.debug('Unsupported message type', { 
          userId, 
          messageId: processedMessage.id,
          metadata: { mediaType: processedMessage.mediaType }
        });
      }

    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Message handling failed', { 
        error: error as Error, 
        userId,
        messageId: message.key?.id 
      });

      // Send error message to user if possible
      if (userId && !(error instanceof RateLimitError)) {
        try {
          await whatsappConnection.sendMessage(
            userId,
            '🤖 Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.'
          );
        } catch (sendError) {
          logger.error('Failed to send error message to user', { 
            error: sendError as Error, 
            userId 
          });
        }
      }
    }
  }

  /**
   * Process incoming WhatsApp message into our format
   */
  private async processIncomingMessage(message: proto.IWebMessageInfo): Promise<ProcessedMessage | null> {
    try {
      if (!message.key?.remoteJid || !message.key.id) {
        logger.debug('Invalid message key, skipping');
        return null;
      }

      const from = message.key.remoteJid;
      const messageId = message.key.id;
      const fromMe = message.key.fromMe || false;
      const timestamp = message.messageTimestamp as number * 1000 || Date.now();

      const processedMessage: ProcessedMessage = {
        id: messageId,
        from,
        fromMe,
        timestamp,
        isForwarded: !!message.message?.extendedTextMessage?.contextInfo?.isForwarded,
      };

      // Extract message content based on type
      const msg = message.message;
      if (!msg) return null;

      if (msg.conversation) {
        processedMessage.body = msg.conversation;
      } else if (msg.extendedTextMessage?.text) {
        processedMessage.body = msg.extendedTextMessage.text;
      } else if (msg.imageMessage) {
        processedMessage.mediaType = 'image';
        processedMessage.mediaCaption = msg.imageMessage.caption || undefined;
        processedMessage.mediaUrl = msg.imageMessage.url || undefined;
      } else if (msg.audioMessage) {
        processedMessage.mediaType = 'audio';
        processedMessage.mediaUrl = msg.audioMessage.url || undefined;
      } else if (msg.videoMessage) {
        processedMessage.mediaType = 'video';
        processedMessage.mediaCaption = msg.videoMessage.caption || undefined;
        processedMessage.mediaUrl = msg.videoMessage.url || undefined;
      } else if (msg.documentMessage) {
        processedMessage.mediaType = 'document';
        processedMessage.mediaUrl = msg.documentMessage.url || undefined;
      }

      return processedMessage;

    } catch (error) {
      logger.error('Failed to process incoming message', { 
        error: error as Error,
        messageId: message.key?.id
      });
      return null;
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(text: string, context: MessageContext, userId: string): Promise<void> {
    try {
      logger.debug('Processing text message', { userId, textLength: text.length });

      // Generate AI response
      const aiResponse = await langchainService.generateResponse(context, text, userId);

      // Send response
      await whatsappConnection.sendMessage(userId, aiResponse.content);

      // Add AI response to context
      const botMessage: ProcessedMessage = {
        id: `bot_${Date.now()}`,
        from: userId,
        fromMe: true,
        timestamp: Date.now(),
        body: aiResponse.content,
        isForwarded: false,
      };

      await Redis.addMessageToContext(userId, botMessage);

      logger.info('Text message processed successfully', { 
        userId,
        metadata: { 
          tokensUsed: aiResponse.usage?.totalTokens,
          responseLength: aiResponse.content.length 
        }
      });

    } catch (error) {
      logger.error('Failed to handle text message', { 
        error: error as Error, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Handle audio messages
   */
  private async handleAudioMessage(
    message: ProcessedMessage, 
    context: MessageContext, 
    userId: string
  ): Promise<void> {
    try {
      logger.debug('Processing audio message', { userId, messageId: message.id });

      // Download audio
      const originalMessage = await this.getOriginalMessage(message.id);
      if (!originalMessage) {
        throw new BotError('Original message not found for audio download', 'MESSAGE_NOT_FOUND');
      }

      const audioBuffer = await whatsappConnection.downloadMedia(originalMessage);
      if (!audioBuffer) {
        throw new BotError('Failed to download audio', 'MEDIA_DOWNLOAD_ERROR');
      }

      // Process and transcribe audio
      const processedAudio = await audioProcessor.processAudio(
        audioBuffer, 
        'audio/ogg', // Default WhatsApp audio format
        userId
      );

      const transcription = await audioProcessor.transcribeAudio(
        processedAudio.buffer,
        processedAudio.mimeType,
        userId
      );

      // Update message with transcription
      message.body = `[Áudio transcrito]: ${transcription.text}`;

      // Process as text message
      await this.handleTextMessage(transcription.text, context, userId);

      logger.info('Audio message processed successfully', { 
        userId,
        metadata: { 
          audioSize: audioBuffer.length,
          transcriptionLength: transcription.text.length,
          confidence: transcription.confidence
        }
      });

    } catch (error) {
      logger.error('Failed to handle audio message', { 
        error: error as Error, 
        userId,
        messageId: message.id
      });

      // Send user-friendly error message
      await whatsappConnection.sendMessage(
        userId,
        '🎵 Não consegui processar seu áudio. Tente enviar novamente ou digite sua mensagem.'
      );
    }
  }

  /**
   * Handle image messages
   */
  private async handleImageMessage(
    message: ProcessedMessage, 
    context: MessageContext, 
    userId: string
  ): Promise<void> {
    try {
      logger.debug('Processing image message', { userId, messageId: message.id });

      // Download image
      const originalMessage = await this.getOriginalMessage(message.id);
      if (!originalMessage) {
        throw new BotError('Original message not found for image download', 'MESSAGE_NOT_FOUND');
      }

      const imageBuffer = await whatsappConnection.downloadMedia(originalMessage);
      if (!imageBuffer) {
        throw new BotError('Failed to download image', 'MEDIA_DOWNLOAD_ERROR');
      }

      // Process image
      const processedImage = await audioProcessor.processImage(
        imageBuffer,
        'image/jpeg', // Default format
        userId
      );

      // Convert to data URL for API
      const imageDataUrl = audioProcessor.bufferToDataUrl(
        processedImage.buffer,
        processedImage.mimeType
      );

      // Analyze image with AI
      const analysis = await langchainService.analyzeImage(
        imageDataUrl,
        message.mediaCaption,
        userId
      );

      // Create text based on image analysis and caption
      let analysisText = `[Imagem enviada]: ${analysis.description}`;
      if (message.mediaCaption) {
        analysisText += `\nLegenda: ${message.mediaCaption}`;
      }

      // Update message with analysis
      message.body = analysisText;

      // Generate AI response based on image analysis
      await this.handleTextMessage(analysisText, context, userId);

      logger.info('Image message processed successfully', { 
        userId,
        metadata: { 
          imageSize: imageBuffer.length,
          analysisLength: analysis.description.length,
          hasCaption: !!message.mediaCaption
        }
      });

    } catch (error) {
      logger.error('Failed to handle image message', { 
        error: error as Error, 
        userId,
        messageId: message.id
      });

      // Send user-friendly error message
      await whatsappConnection.sendMessage(
        userId,
        '🖼️ Não consegui analisar sua imagem. Tente enviar novamente ou descreva o que precisa.'
      );
    }
  }

  /**
   * Handle bot commands
   */
  private async handleCommand(command: Command, userId: string, context: MessageContext): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Processing command', { 
        userId, 
        command: command.type,
        metadata: { args: command.args }
      });

      let success = true;
      let responseMessage = '';

      switch (command.type) {
        case CommandType.RESET:
          await Redis.clearContext(userId);
          langchainService.clearUserMemory(userId); // Clear LangChain memory too
          responseMessage = '🔄 Conversa reiniciada! Olá, como posso ajudá-lo hoje?';
          break;

        case CommandType.PAUSE:
          const duration = command.args?.[0] ? parseInt(command.args[0]) * 1000 : env.cache.pauseTtl * 1000;
          await Redis.pauseUser(userId, duration);
          responseMessage = `⏸️ Atendimento pausado por ${Math.round(duration / 60000)} minutos. Digite RESUME para retomar.`;
          break;

        case CommandType.RESUME:
          await Redis.resumeUser(userId);
          responseMessage = '▶️ Atendimento retomado! Como posso ajudá-lo?';
          break;

        case CommandType.PDF:
          try {
            const summary = await langchainService.generateConversationSummary(context, userId);
            responseMessage = '📄 Resumo da conversa:\n\n' + summary.content;
            // TODO: Implement PDF generation if needed
          } catch (error) {
            responseMessage = '📄 Não foi possível gerar o PDF no momento. Tente novamente mais tarde.';
            success = false;
          }
          break;

        case CommandType.STATUS:
          const isPaused = await Redis.isPaused(userId);
          const messageCount = context.metadata.totalMessages;
          const startTime = new Date(context.metadata.conversationStarted).toLocaleString('pt-BR');
          responseMessage = `📊 Status da conversa:\n\n` +
            `• Estado: ${isPaused ? '⏸️ Pausado' : '▶️ Ativo'}\n` +
            `• Mensagens: ${messageCount}\n` +
            `• Iniciada em: ${startTime}`;
          break;

        case CommandType.HELP:
          responseMessage = `🤖 Comandos disponíveis:\n\n` +
            `• RESET - Reinicia a conversa\n` +
            `• PAUSE [minutos] - Pausa o atendimento\n` +
            `• RESUME - Retoma o atendimento\n` +
            `• PDF - Gera resumo da conversa\n` +
            `• STATUS - Mostra status da conversa\n` +
            `• HELP - Mostra esta ajuda\n\n` +
            `Você também pode enviar textos, áudios e imagens para análise!`;
          break;

        default:
          responseMessage = '❓ Comando não reconhecido. Digite HELP para ver os comandos disponíveis.';
          success = false;
      }

      await whatsappConnection.sendMessage(userId, responseMessage);

      const duration = Date.now() - startTime;
      logger.commandExecuted(command.type, userId, success, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Command execution failed', { 
        error: error as Error, 
        userId,
        command: command.type,
        duration
      });

      await whatsappConnection.sendMessage(
        userId,
        '⚠️ Erro ao executar comando. Tente novamente.'
      );

      logger.commandExecuted(command.type, userId, false, duration);
    }
  }

  /**
   * Extract command from message text
   */
  private extractCommand(text?: string): Command | null {
    if (!text) return null;

    const commandText = text.trim().toUpperCase();
    const parts = commandText.split(' ');
    const commandName = parts[0];
    const args = parts.slice(1);

    const commandMap: Record<string, CommandType> = {
      'RESET': CommandType.RESET,
      'PAUSE': CommandType.PAUSE,
      'PAUSA': CommandType.PAUSE, // Portuguese alias
      'RESUME': CommandType.RESUME,
      'RETOMAR': CommandType.RESUME, // Portuguese alias
      'PDF': CommandType.PDF,
      'STATUS': CommandType.STATUS,
      'HELP': CommandType.HELP,
      'AJUDA': CommandType.HELP, // Portuguese alias
    };

    const commandType = commandMap[commandName];
    if (!commandType) return null;

    return {
      type: commandType,
      args: args.length > 0 ? args : undefined,
      executedAt: Date.now(),
      userId: '', // Will be set by caller
    };
  }

  /**
   * Send rate limit message
   */
  private async sendRateLimitMessage(userId: string, resetTime: number): Promise<void> {
    try {
      const resetDate = new Date(resetTime);
      const resetTimeStr = resetDate.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      await whatsappConnection.sendMessage(
        userId,
        `⏱️ Você atingiu o limite de mensagens. Tente novamente às ${resetTimeStr}.`
      );
    } catch (error) {
      logger.error('Failed to send rate limit message', { 
        error: error as Error, 
        userId 
      });
    }
  }

  /**
   * Get message type for logging
   */
  private getMessageType(message: ProcessedMessage): string {
    if (message.mediaType) return message.mediaType;
    if (message.body) return 'text';
    return 'unknown';
  }

  /**
   * Helper to get original message (placeholder - implement based on your needs)
   */
  private async getOriginalMessage(messageId: string): Promise<proto.IWebMessageInfo | null> {
    // This is a simplified implementation
    // In a real scenario, you might need to store/cache original messages
    // or implement a way to retrieve them from WhatsApp
    
    // For now, return null and handle in calling functions
    logger.debug('Original message retrieval not implemented', { messageId });
    return null;
  }

  /**
   * Health check for message handler
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const whatsappHealth = await whatsappConnection.healthCheck();
      const redisHealth = await Redis.healthCheck();
      const langchainHealth = await langchainService.healthCheck();
      const audioHealth = await audioProcessor.healthCheck();

      const allHealthy = [whatsappHealth, redisHealth, langchainHealth, audioHealth]
        .every(h => h.status === 'healthy');

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        details: {
          whatsapp: whatsappHealth.status,
          redis: redisHealth.status,
          langchain: langchainHealth.status,
          audioProcessor: audioHealth.status,
          maxContextMessages: env.bot.maxContextMessages,
          messageTimeout: env.bot.messageTimeout,
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
}

// Export singleton instance
export const messageHandler = MessageHandler.getInstance();

// Export type for dependency injection
export type { MessageHandler };