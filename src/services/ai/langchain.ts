import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferWindowMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { 
  AIResponse, 
  MessageContext, 
  ProcessedMessage,
  AIServiceError,
  ImageAnalysisResult
} from '@/types';
import { env, getOpenAIConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import { Redis } from '@/services/memory/redisClient';

/**
 * LangChain-based AI service for enhanced conversation management
 * This service runs alongside the existing OpenAI service for A/B testing
 */
class LangChainService {
  private chatModel: ChatOpenAI;
  private conversationChain: ConversationChain;
  private memoryMap: Map<string, BufferWindowMemory> = new Map();
  private redis: typeof Redis;
  private static instance: LangChainService;
  
  // AI Metrics tracking
  private metrics = {
    totalTokens: 0,
    totalRequests: 0,
    successfulRequests: 0,
    totalResponseTime: 0,
    startTime: Date.now()
  };

  private constructor() {
    const config = getOpenAIConfig();
    
    // Initialize ChatOpenAI model
    this.chatModel = new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: env.openai.model,
      temperature: env.openai.temperature,
      maxTokens: env.openai.maxTokens,
      timeout: config.timeout,
    });

    this.redis = Redis;
    this.initializeConversationChain();
  }

  public static getInstance(): LangChainService {
    if (!LangChainService.instance) {
      LangChainService.instance = new LangChainService();
    }
    return LangChainService.instance;
  }

  /**
   * Initialize the conversation chain with custom prompt template
   */
  private initializeConversationChain(): void {
    const promptTemplate = new PromptTemplate({
      template: `Você é o ZecaBot, um assistente inteligente especializado em automação WhatsApp.

INSTRUÇÕES IMPORTANTES:
- Responda sempre em português brasileiro
- Seja profissional, educado e prestativo
- Forneça informações precisas e úteis
- Se não souber sobre algo específico, seja honesto e sugira consultar um especialista
- Mantenha respostas concisas mas informativas
- Para dúvidas técnicas, sempre recomende consultar documentação

COMANDOS ESPECIAIS:
- Se o usuário digitar "RESET": Apenas confirme que a conversa foi reiniciada
- Se o usuário digitar "PDF": Informe que irá gerar e enviar um PDF com informações relevantes
- Se o usuário digitar "PAUSE": Confirme que o atendimento foi pausado
- Se o usuário digitar "RESUME": Confirme que o atendimento foi retomado

Histórico da conversa:
{history}

Usuário: {input}
Assistente:`,
      inputVariables: ['history', 'input'],
    });

    // Use a default memory for the chain (will be overridden per user)
    const defaultMemory = new BufferWindowMemory({
      k: 10, // Remember last 10 exchanges
      returnMessages: true,
    });

    this.conversationChain = new ConversationChain({
      llm: this.chatModel,
      prompt: promptTemplate,
      memory: defaultMemory,
      verbose: env.nodeEnv === 'development',
    });
  }

  /**
   * Get or create memory for specific user
   */
  private getOrCreateMemory(userId: string): BufferWindowMemory {
    if (!this.memoryMap.has(userId)) {
      const memory = new BufferWindowMemory({
        k: 10, // Remember last 10 exchanges
        returnMessages: true,
      });
      this.memoryMap.set(userId, memory);
    }
    return this.memoryMap.get(userId)!;
  }

  /**
   * Get or create personalized memory for specific user with custom memory size
   */
  private getOrCreatePersonalizedMemory(userId: string, memorySize: number = 10): BufferWindowMemory {
    const memoryKey = `${userId}_${memorySize}`;
    if (!this.memoryMap.has(memoryKey)) {
      const memory = new BufferWindowMemory({
        k: memorySize, // Remember last N exchanges based on user preference
        returnMessages: true,
      });
      this.memoryMap.set(memoryKey, memory);
    }
    return this.memoryMap.get(memoryKey)!;
  }

  /**
   * Load conversation history from context into memory
   */
  private async loadConversationHistory(
    memory: BufferWindowMemory,
    context: MessageContext
  ): Promise<void> {
    try {
      // Clear existing memory
      memory.clear();

      // Load recent messages (last 10)
      const recentMessages = context.messages.slice(-10);
      
      for (const msg of recentMessages) {
        if (msg.body && msg.body.trim()) {
          if (msg.fromMe) {
            // Assistant message
            await memory.saveContext(
              { input: '[previous message]' },
              { output: msg.body }
            );
          } else {
            // User message - we need to pair it with next assistant message
            const nextMsg = recentMessages[recentMessages.indexOf(msg) + 1];
            if (nextMsg && nextMsg.fromMe && nextMsg.body) {
              await memory.saveContext(
                { input: msg.body },
                { output: nextMsg.body }
              );
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load conversation history into memory', { 
        error: error as Error,
        userId: 'unknown'
      });
    }
  }

  /**
   * Generate response using LangChain conversation chain
   */
  public async generateResponse(
    context: MessageContext,
    userMessage: string,
    userId: string,
    personalizedSettings?: {
      systemPrompt: string;
      temperature: number;
      maxTokens: number;
      model: string;
      memorySize: number;
    }
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Use personalized settings or defaults
      const settings = personalizedSettings || {
        systemPrompt: 'Default system prompt', // Will be updated below
        temperature: env.openai.temperature,
        maxTokens: env.openai.maxTokens,
        model: env.openai.model,
        memorySize: 10
      };

      logger.info('LangChain request started', { 
        model: settings.model,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        userId
      });

      // Create personalized model if settings are provided
      let llmModel = this.chatModel;
      if (personalizedSettings) {
        const config = getOpenAIConfig();
        llmModel = new ChatOpenAI({
          openAIApiKey: config.apiKey,
          modelName: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          timeout: config.timeout,
        });
      }

      // Create personalized prompt template
      const promptTemplate = new PromptTemplate({
        template: `${settings.systemPrompt}

Histórico da conversa:
{history}

Usuário: {input}
Assistente:`,
        inputVariables: ['history', 'input'],
      });

      // Get user-specific memory with personalized size
      const memory = this.getOrCreatePersonalizedMemory(userId, settings.memorySize);
      
      // Load conversation history
      await this.loadConversationHistory(memory, context);

      // Create a new chain with personalized settings
      const userChain = new ConversationChain({
        llm: llmModel,
        prompt: promptTemplate,
        memory: memory,
        verbose: env.nodeEnv === 'development',
      });

      // Generate response
      const response = await userChain.call({
        input: userMessage,
      });

      const duration = Date.now() - startTime;
      
      // Extract token usage (if available)
      const tokensUsed = response.response?.length || 0; // Approximation

      // Update metrics for successful requests
      this.metrics.totalRequests++;
      this.metrics.successfulRequests++;
      this.metrics.totalTokens += tokensUsed;
      this.metrics.totalResponseTime += duration;

      logger.info('LangChain response generated', { 
        userId,
        duration,
        model: env.openai.model,
        responseLength: response.response?.length || 0,
        tokensUsed
      });

      return {
        content: response.response || response.text || '',
        usage: {
          promptTokens: 0, // LangChain doesn't provide detailed token info by default
          completionTokens: 0,
          totalTokens: tokensUsed,
        },
        model: env.openai.model,
        finishReason: 'stop',
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update metrics for failed requests
      this.metrics.totalRequests++;
      this.metrics.totalResponseTime += duration;
      
      logger.error('LangChain request failed', { 
        error: error as Error, 
        userId,
        duration,
        metadata: { model: env.openai.model }
      });

      // Convert to standard AI service error
      throw new AIServiceError(
        `LangChain request failed: ${(error as Error).message}`,
        'langchain',
        env.openai.model
      );
    }
  }

  /**
   * Analyze image using LangChain with GPT-4o-mini Vision
   */
  public async analyzeImage(
    imageUrl: string,
    caption: string | undefined,
    userId: string
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info('LangChain image analysis started', { userId });

      // Create a vision-capable model for image analysis
      const visionModel = new ChatOpenAI({
        openAIApiKey: env.openai.apiKey,
        modelName: 'gpt-4o-mini', // Force vision model
        temperature: 0.3,
        maxTokens: 500,
      });

      const imagePrompt = new PromptTemplate({
        template: `Você é um assistente especializado em produtos de ervas e naturais. Analise esta imagem e forneça uma descrição detalhada em português, incluindo:

1) Objetos, produtos ou itens visíveis
2) Texto legível na imagem  
3) Cores e características relevantes
4) Se for um produto natural/erva, mencione possíveis usos
Seja claro e objetivo.

{caption_text}

Analise a imagem fornecida.`,
        inputVariables: ['caption_text'],
      });

      const captionText = caption 
        ? `Usuário enviou uma imagem com a legenda: "${caption}".`
        : '';

      // Note: LangChain doesn't have direct image URL support in prompts yet
      // We'll use the underlying OpenAI client for image analysis
      const openaiConfig = getOpenAIConfig();
      const tempClient = new ChatOpenAI({
        openAIApiKey: openaiConfig.apiKey,
        modelName: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 500,
      });

      // For now, we'll use a workaround with the system message approach
      const response = await tempClient.invoke([
        {
          role: 'system',
          content: `Você é um assistente especializado em produtos de ervas e naturais. Analise esta imagem e forneça uma descrição detalhada em português, incluindo:
1) Objetos, produtos ou itens visíveis
2) Texto legível na imagem  
3) Cores e características relevantes
4) Se for um produto natural/erva, mencione possíveis usos
Seja claro e objetivo.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: caption ? `Usuário enviou uma imagem com a legenda: "${caption}". Analise a imagem:` : 'Analise esta imagem:'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low' // Use 'low' for cost efficiency
              }
            }
          ]
        }
      ]);

      const duration = Date.now() - startTime;
      const resultContent = response.content?.toString() || '';
      
      logger.info('LangChain image analysis completed', { 
        userId,
        duration,
        resultLength: resultContent.length
      });

      return {
        description: resultContent,
        confidence: 0.8,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('LangChain image analysis failed', { 
        error: error as Error, 
        userId,
        duration,
        metadata: { imageUrl: imageUrl.substring(0, 100) }
      });

      throw new AIServiceError(
        `LangChain image analysis failed: ${(error as Error).message}`,
        'langchain',
        'gpt-4o-mini'
      );
    }
  }

  /**
   * Generate conversation summary using LangChain
   */
  public async generateConversationSummary(
    context: MessageContext,
    userId: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('LangChain summary request started', { userId });

      const conversationText = context.messages
        .map(msg => `${msg.fromMe ? 'Assistente' : 'Cliente'}: ${msg.body || '[mídia]'}`)
        .join('\n');

      const summaryPrompt = new PromptTemplate({
        template: `Você é um assistente que cria resumos de conversas sobre produtos naturais e ervas.

Com base na conversa fornecida, gere um resumo estruturado incluindo:

1. **PRODUTOS DISCUTIDOS**: Liste os produtos ou ervas mencionados
2. **PRINCIPAIS DÚVIDAS**: Resuma as principais perguntas do cliente  
3. **RECOMENDAÇÕES DADAS**: Liste as sugestões e orientações fornecidas
4. **STATUS DA CONVERSA**: Indicar se há pendências ou se foi resolvida

O resumo deve ser claro, organizado e profissional.

CONVERSA:
{conversation}

RESUMO:`,
        inputVariables: ['conversation'],
      });

      const summaryChain = summaryPrompt.pipe(this.chatModel).pipe(new StringOutputParser());
      
      const summary = await summaryChain.invoke({
        conversation: conversationText,
      });

      const duration = Date.now() - startTime;

      logger.info('LangChain summary generated', { 
        userId,
        duration,
        summaryLength: summary.length
      });

      return {
        content: summary,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: summary.length,
        },
        model: env.openai.model,
        finishReason: 'stop',
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to generate LangChain summary', { 
        error: error as Error, 
        userId,
        duration
      });
      throw new AIServiceError(
        `LangChain summary generation failed: ${(error as Error).message}`,
        'langchain',
        env.openai.model
      );
    }
  }

  /**
   * Moderate content for safety using OpenAI moderation
   */
  public async moderateContent(content: string): Promise<{ flagged: boolean; categories: string[] }> {
    try {
      // Use OpenAI client directly for moderation as LangChain doesn't have this built-in
      const openaiConfig = getOpenAIConfig();
      const { OpenAI } = await import('openai');
      const client = new OpenAI(openaiConfig);

      const moderation = await client.moderations.create({
        input: content,
      });

      const result = moderation.results[0];
      const flaggedCategories: string[] = [];

      if (result?.flagged) {
        Object.entries(result.categories).forEach(([category, flagged]) => {
          if (flagged) {
            flaggedCategories.push(category);
          }
        });
      }

      return {
        flagged: result?.flagged || false,
        categories: flaggedCategories,
      };

    } catch (error) {
      logger.error('Content moderation failed', { 
        error: error as Error,
        metadata: { contentLength: content.length }
      });
      // Fail safe: assume content is not flagged
      return { flagged: false, categories: [] };
    }
  }

  /**
   * Clear memory for specific user
   */
  public clearUserMemory(userId: string): void {
    // Clear standard memory
    if (this.memoryMap.has(userId)) {
      const memory = this.memoryMap.get(userId)!;
      memory.clear();
      logger.info('User memory cleared', { userId });
    }
    
    // Clear all personalized memories for this user (different memory sizes)
    const userMemoryKeys = Array.from(this.memoryMap.keys()).filter(key => key.startsWith(`${userId}_`));
    for (const key of userMemoryKeys) {
      const memory = this.memoryMap.get(key)!;
      memory.clear();
      logger.info('Personalized user memory cleared', { userId, memoryKey: key });
    }
  }

  /**
   * Clear all memories (for system maintenance)
   */
  public clearAllMemories(): void {
    this.memoryMap.clear();
    logger.info('All memories cleared');
  }

  /**
   * Get memory stats for monitoring
   */
  public getMemoryStats(): Record<string, unknown> {
    return {
      totalUsers: this.memoryMap.size,
      memoryType: 'ConversationBufferWindowMemory',
      windowSize: 10,
    };
  }

  /**
   * Get AI performance metrics
   */
  public getAIStats(): {
    totalTokens: number;
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    uptime: number;
  } {
    const averageResponseTime = this.metrics.totalRequests > 0 
      ? Math.round(this.metrics.totalResponseTime / this.metrics.totalRequests)
      : 0;
    
    const successRate = this.metrics.totalRequests > 0 
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 0;
    
    const uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    
    return {
      totalTokens: this.metrics.totalTokens,
      averageResponseTime,
      successRate,
      totalRequests: this.metrics.totalRequests,
      uptime
    };
  }

  /**
   * Health check for LangChain service
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      // Check if the model is initialized and configuration is valid
      const isConfigured = !!(this.chatModel && env.openai.apiKey);
      const memoryStats = this.getMemoryStats();
      
      return {
        status: isConfigured ? 'healthy' : 'unhealthy',
        details: {
          service: 'LangChain',
          model: env.openai.model,
          configured: isConfigured,
          memoryStats,
          metricsUptime: Date.now() - this.metrics.startTime,
          totalRequests: this.metrics.totalRequests,
          successRate: this.metrics.totalRequests > 0 
            ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
            : 'N/A',
        },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'LangChain',
          model: env.openai.model,
          error: (error as Error).message,
        },
      };
    }
  }
}

// Export singleton instance
export const langchainService = LangChainService.getInstance();

// Export type for dependency injection
export type { LangChainService };