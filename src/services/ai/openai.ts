import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { 
  AIResponse, 
  MessageContext, 
  ProcessedMessage,
  AIServiceError,
  ImageAnalysisResult
} from '@/types';
import { env, getOpenAIConfig } from '@/config/env';
import { logger } from '@/utils/logger';

class OpenAIService {
  private client: OpenAI;
  private static instance: OpenAIService;

  private constructor() {
    const config = getOpenAIConfig();
    this.client = new OpenAI(config);
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Generate response based on conversation context
   */
  public async generateResponse(
    context: MessageContext,
    userMessage: string,
    userId: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      logger.aiRequest(env.openai.model, env.openai.maxTokens, userId);

      const messages = this.buildMessageHistory(context, userMessage);
      
      const completion = await this.client.chat.completions.create({
        model: env.openai.model,
        messages,
        max_tokens: env.openai.maxTokens,
        temperature: env.openai.temperature,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        user: userId,
      });

      const response = completion.choices[0];
      if (!response?.message?.content) {
        throw new AIServiceError('Empty response from OpenAI', 'openai', env.openai.model);
      }

      const duration = Date.now() - startTime;
      const tokensUsed = completion.usage?.total_tokens || 0;

      logger.aiResponse(env.openai.model, tokensUsed, duration, userId);

      return {
        content: response.message.content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: tokensUsed,
        },
        model: completion.model,
        finishReason: response.finish_reason || 'unknown',
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('OpenAI API request failed', { 
        error: error as Error, 
        userId,
        duration,
        metadata: { model: env.openai.model }
      });

      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new AIServiceError('OpenAI rate limit exceeded', 'openai', env.openai.model);
        } else if (error.status === 401) {
          throw new AIServiceError('OpenAI authentication failed', 'openai', env.openai.model);
        } else if (error.status >= 500) {
          throw new AIServiceError('OpenAI service unavailable', 'openai', env.openai.model);
        }
      }

      throw new AIServiceError(
        `OpenAI request failed: ${(error as Error).message}`,
        'openai',
        env.openai.model
      );
    }
  }

  /**
   * Analyze image using GPT-4o-mini Vision
   */
  public async analyzeImage(
    imageUrl: string,
    caption: string | undefined,
    userId: string
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.imageAnalysisRequest(userId, 0); // Size unknown for URL

      const messages: ChatCompletionMessageParam[] = [
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
      ];

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Force vision model
        messages,
        max_tokens: 500,
        temperature: 0.3,
        user: userId,
      });

      const response = completion.choices[0];
      if (!response?.message?.content) {
        throw new AIServiceError('Empty response from OpenAI Vision', 'openai', 'gpt-4o-mini');
      }

      const duration = Date.now() - startTime;
      const resultLength = response.message.content.length;

      logger.imageAnalysisComplete(userId, duration, resultLength);

      return {
        description: response.message.content,
        confidence: 0.8, // GPT-4o-mini generally has good confidence
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('OpenAI Vision API request failed', { 
        error: error as Error, 
        userId,
        duration,
        metadata: { model: 'gpt-4o-mini', imageUrl: imageUrl.substring(0, 100) }
      });

      if (error instanceof OpenAI.APIError) {
        if (error.status === 400) {
          throw new AIServiceError('Invalid image format or content', 'openai', 'gpt-4o-mini');
        } else if (error.status === 429) {
          throw new AIServiceError('OpenAI Vision rate limit exceeded', 'openai', 'gpt-4o-mini');
        }
      }

      throw new AIServiceError(
        `OpenAI Vision request failed: ${(error as Error).message}`,
        'openai',
        'gpt-4o-mini'
      );
    }
  }

  /**
   * Build message history for chat completion
   */
  private buildMessageHistory(
    context: MessageContext,
    currentMessage: string
  ): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `Você é um assistente especializado em produtos de ervas e naturais do Atacado de Ervas. 

INSTRUÇÕES IMPORTANTES:
- Responda sempre em português brasileiro
- Seja profissional, educado e prestativo
- Forneça informações precisas sobre produtos naturais e ervas
- Se não souber sobre algo específico, seja honesto e sugira consultar um especialista
- Mantenha respostas concisas mas informativas
- Para dúvidas médicas, sempre recomende consultar um profissional de saúde

COMANDOS ESPECIAIS:
- Se o usuário digitar "RESET": Apenas confirme que a conversa foi reiniciada
- Se o usuário digitar "PDF": Informe que irá gerar e enviar um PDF com informações relevantes
- Se o usuário digitar "PAUSE": Confirme que o atendimento foi pausado
- Se o usuário digitar "RESUME": Confirme que o atendimento foi retomado

Responda de forma natural e útil, focando em ajudar o cliente com suas necessidades relacionadas a produtos naturais e ervas.`
      }
    ];

    // Add conversation history (limited to recent messages)
    const recentMessages = context.messages.slice(-5); // Last 5 messages
    
    for (const msg of recentMessages) {
      if (msg.body) {
        messages.push({
          role: msg.fromMe ? 'assistant' : 'user',
          content: msg.body
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  /**
   * Generate a summary of conversation for PDF or reports
   */
  public async generateConversationSummary(
    context: MessageContext,
    userId: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      logger.aiRequest(env.openai.model, 800, userId);

      const conversationText = context.messages
        .map(msg => `${msg.fromMe ? 'Assistente' : 'Cliente'}: ${msg.body || '[mídia]'}`)
        .join('\n');

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `Você é um assistente que cria resumos de conversas sobre produtos naturais e ervas.
          
Com base na conversa fornecida, gere um resumo estruturado incluindo:

1. **PRODUTOS DISCUTIDOS**: Liste os produtos ou ervas mencionados
2. **PRINCIPAIS DÚVIDAS**: Resuma as principais perguntas do cliente  
3. **RECOMENDAÇÕES DADAS**: Liste as sugestões e orientações fornecidas
4. **STATUS DA CONVERSA**: Indicar se há pendências ou se foi resolvida

O resumo deve ser claro, organizado e profissional.`
        },
        {
          role: 'user',
          content: `Gere um resumo desta conversa:\n\n${conversationText}`
        }
      ];

      const completion = await this.client.chat.completions.create({
        model: env.openai.model,
        messages,
        max_tokens: 800,
        temperature: 0.3,
        user: userId,
      });

      const response = completion.choices[0];
      if (!response?.message?.content) {
        throw new AIServiceError('Empty summary response from OpenAI', 'openai', env.openai.model);
      }

      const duration = Date.now() - startTime;
      const tokensUsed = completion.usage?.total_tokens || 0;

      logger.info('Conversation summary generated', { 
        userId,
        duration,
        metadata: { tokensUsed }
      });

      return {
        content: response.message.content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: tokensUsed,
        },
        model: completion.model,
        finishReason: response.finish_reason || 'unknown',
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to generate conversation summary', { 
        error: error as Error, 
        userId,
        duration
      });
      throw new AIServiceError(
        `Summary generation failed: ${(error as Error).message}`,
        'openai',
        env.openai.model
      );
    }
  }

  /**
   * Moderate content for safety
   */
  public async moderateContent(content: string): Promise<{ flagged: boolean; categories: string[] }> {
    try {
      const moderation = await this.client.moderations.create({
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
   * Health check for OpenAI service
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const start = Date.now();
      
      // Simple test request
      const completion = await this.client.chat.completions.create({
        model: env.openai.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1,
        temperature: 0,
      });

      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        details: {
          model: env.openai.model,
          responseTime,
          apiKeyValid: true,
          lastResponse: completion.choices[0]?.message?.content || 'No content',
        },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          model: env.openai.model,
          error: (error as Error).message,
          apiKeyValid: false,
        },
      };
    }
  }

  /**
   * Get usage statistics (if available)
   */
  public async getUsageStats(): Promise<Record<string, unknown>> {
    try {
      // Note: OpenAI doesn't provide a direct usage API in the client
      // This is a placeholder for potential future implementation
      return {
        model: env.openai.model,
        maxTokens: env.openai.maxTokens,
        temperature: env.openai.temperature,
        message: 'Usage stats not available through API',
      };
    } catch (error) {
      logger.error('Failed to get usage stats', { error: error as Error });
      return {
        error: 'Stats unavailable',
      };
    }
  }
}

// Export singleton instance
export const openaiService = OpenAIService.getInstance();

// Export type for dependency injection
export type { OpenAIService };