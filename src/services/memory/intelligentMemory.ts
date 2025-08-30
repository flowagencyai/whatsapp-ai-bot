import { BufferWindowMemory } from 'langchain/memory';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { PromptTemplate } from 'langchain/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { MessageContext, ProcessedMessage } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { Redis } from './redisClient.js';

export interface MemoryLayer {
  type: 'immediate' | 'working' | 'longterm';
  priority: number;
  content: string;
  timestamp: number;
  userId: string;
}

export interface IntelligentMemoryConfig {
  immediateMemorySize: number; // Últimas N mensagens (padrão: 5)
  workingMemorySize: number; // Resumos de sessões recentes (padrão: 10)  
  longTermMemorySize: number; // Informações importantes persistentes (padrão: 3)
  summarizationThreshold: number; // Quando sumarizar (padrão: 20 mensagens)
}

/**
 * Sistema de Memória Inteligente com 3 camadas:
 * 1. Memória Imediata: Últimas mensagens da conversa atual
 * 2. Memória de Trabalho: Resumos de sessões recentes 
 * 3. Memória de Longo Prazo: Informações importantes do usuário
 */
export class IntelligentMemoryService {
  private static instance: IntelligentMemoryService;
  private chatModel: ChatOpenAI;
  private memoryLayers: Map<string, MemoryLayer[]> = new Map();

  private constructor() {
    this.chatModel = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1, // Baixa temperatura para resumos consistentes
      maxTokens: 150, // Resumos concisos
    });
  }

  public static getInstance(): IntelligentMemoryService {
    if (!IntelligentMemoryService.instance) {
      IntelligentMemoryService.instance = new IntelligentMemoryService();
    }
    return IntelligentMemoryService.instance;
  }

  /**
   * Processo mensagens e atualiza camadas de memória
   */
  public async processMessage(
    userId: string, 
    context: MessageContext,
    config: IntelligentMemoryConfig
  ): Promise<string> {
    try {
      const userMemory = this.getUserMemory(userId);
      
      // 1. Atualizar Memória Imediata
      await this.updateImmediateMemory(userId, context, config);
      
      // 2. Verificar se precisa sumarizar (Memória de Trabalho)
      if (context.messages.length >= config.summarizationThreshold) {
        await this.updateWorkingMemory(userId, context, config);
      }
      
      // 3. Extrair informações importantes (Memória de Longo Prazo)
      await this.updateLongTermMemory(userId, context, config);
      
      // 4. Construir prompt contextual otimizado
      return this.buildOptimizedContext(userId, config);
      
    } catch (error) {
      logger.error('Error processing intelligent memory', { 
        userId, 
        error: error as Error 
      });
      return this.fallbackToSimpleMemory(context);
    }
  }

  /**
   * Camada 1: Memória Imediata (últimas N mensagens)
   */
  private async updateImmediateMemory(
    userId: string, 
    context: MessageContext, 
    config: IntelligentMemoryConfig
  ): Promise<void> {
    const recentMessages = context.messages
      .slice(-config.immediateMemorySize)
      .map(msg => ({
        content: `${msg.fromMe ? 'Assistente' : 'Usuário'}: ${msg.body}`,
        timestamp: msg.timestamp
      }))
      .join('\n');

    const memoryLayer: MemoryLayer = {
      type: 'immediate',
      priority: 3,
      content: recentMessages,
      timestamp: Date.now(),
      userId
    };

    this.updateMemoryLayer(userId, memoryLayer);
  }

  /**
   * Camada 2: Memória de Trabalho (resumos de sessões)
   */
  private async updateWorkingMemory(
    userId: string, 
    context: MessageContext, 
    config: IntelligentMemoryConfig
  ): Promise<void> {
    try {
      const conversationToSummarize = context.messages
        .slice(-(config.summarizationThreshold))
        .map(msg => `${msg.fromMe ? 'Bot' : 'Usuário'}: ${msg.body}`)
        .join('\n');

      const summaryPrompt = `
Você é um especialista em sumarização de conversas. Analise a conversa abaixo e crie um resumo conciso focando em:
1. Principais tópicos discutidos
2. Informações importantes sobre o usuário
3. Pedidos ou necessidades específicas
4. Contexto relevante para conversas futuras

Conversa:
${conversationToSummarize}

Resumo (máximo 100 palavras):`;

      const response = await this.chatModel.call([
        new HumanMessage(summaryPrompt)
      ]);

      const memoryLayer: MemoryLayer = {
        type: 'working',
        priority: 2,
        content: response.content as string,
        timestamp: Date.now(),
        userId
      };

      this.updateMemoryLayer(userId, memoryLayer);
      
      // Salvar no Redis para persistência
      await this.persistWorkingMemory(userId, memoryLayer);
      
      logger.info('Working memory updated', { userId, summaryLength: response.content.length });

    } catch (error) {
      logger.error('Error updating working memory', { userId, error: error as Error });
    }
  }

  /**
   * Camada 3: Memória de Longo Prazo (informações persistentes)
   */
  private async updateLongTermMemory(
    userId: string, 
    context: MessageContext, 
    config: IntelligentMemoryConfig
  ): Promise<void> {
    try {
      // Analisar mensagens recentes para extrair informações importantes
      const recentMessages = context.messages.slice(-10)
        .map(msg => `${msg.fromMe ? 'Bot' : 'Usuário'}: ${msg.body}`)
        .join('\n');

      const extractionPrompt = `
Analise as mensagens recentes e extraia APENAS informações importantes e persistentes sobre o usuário que devem ser lembradas em conversas futuras:

- Nome ou como gosta de ser chamado
- Profissão ou área de trabalho
- Interesses específicos ou necessidades recorrentes
- Preferências importantes mencionadas
- Informações de contexto relevantes

Se não houver informações importantes ou novas, responda apenas "NENHUMA".

Mensagens:
${recentMessages}

Informações importantes:`;

      const response = await this.chatModel.call([
        new HumanMessage(extractionPrompt)
      ]);

      const extractedInfo = response.content as string;
      
      if (extractedInfo.trim() !== 'NENHUMA' && extractedInfo.length > 10) {
        const memoryLayer: MemoryLayer = {
          type: 'longterm',
          priority: 1,
          content: extractedInfo,
          timestamp: Date.now(),
          userId
        };

        this.updateMemoryLayer(userId, memoryLayer);
        
        // Salvar no Redis para persistência permanente
        await this.persistLongTermMemory(userId, memoryLayer);
        
        logger.info('Long-term memory updated', { userId, infoLength: extractedInfo.length });
      }

    } catch (error) {
      logger.error('Error updating long-term memory', { userId, error: error as Error });
    }
  }

  /**
   * Constrói contexto otimizado combinando todas as camadas
   */
  private buildOptimizedContext(userId: string, config: IntelligentMemoryConfig): string {
    const userMemory = this.getUserMemory(userId);
    
    // Ordenar por prioridade (1=mais importante)
    const sortedMemory = userMemory.sort((a, b) => a.priority - b.priority);
    
    let context = '';
    let tokenCount = 0;
    const maxTokens = 800; // Limite para evitar prompts muito longos
    
    for (const layer of sortedMemory) {
      const layerTokens = Math.ceil(layer.content.length / 3); // Aproximação
      
      if (tokenCount + layerTokens > maxTokens) {
        break; // Parar se exceder limite
      }
      
      const sectionTitle = {
        'longterm': 'INFORMAÇÕES IMPORTANTES DO USUÁRIO',
        'working': 'RESUMO DE CONVERSAS ANTERIORES', 
        'immediate': 'CONVERSA ATUAL'
      }[layer.type];
      
      context += `\n${sectionTitle}:\n${layer.content}\n`;
      tokenCount += layerTokens;
    }
    
    return context;
  }

  /**
   * Fallback para memória simples em caso de erro
   */
  private fallbackToSimpleMemory(context: MessageContext): string {
    return context.messages
      .slice(-5)
      .map(msg => `${msg.fromMe ? 'Bot' : 'Usuário'}: ${msg.body}`)
      .join('\n');
  }

  /**
   * Métodos auxiliares
   */
  private getUserMemory(userId: string): MemoryLayer[] {
    if (!this.memoryLayers.has(userId)) {
      this.memoryLayers.set(userId, []);
    }
    return this.memoryLayers.get(userId)!;
  }

  private updateMemoryLayer(userId: string, newLayer: MemoryLayer): void {
    const userMemory = this.getUserMemory(userId);
    
    // Remover camada anterior do mesmo tipo
    const filtered = userMemory.filter(layer => layer.type !== newLayer.type);
    
    // Adicionar nova camada
    filtered.push(newLayer);
    
    this.memoryLayers.set(userId, filtered);
  }

  private async persistWorkingMemory(userId: string, memory: MemoryLayer): Promise<void> {
    const key = `working_memory:${userId}`;
    await Redis.setCache(key, JSON.stringify(memory), 86400); // 24 horas
  }

  private async persistLongTermMemory(userId: string, memory: MemoryLayer): Promise<void> {
    const key = `longterm_memory:${userId}`;
    const existing = await Redis.getCache(key);
    
    let memories: MemoryLayer[] = existing ? JSON.parse(existing) : [];
    memories.push(memory);
    
    // Manter apenas as 3 mais recentes
    memories = memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
    
    await Redis.setCache(key, JSON.stringify(memories), 604800); // 7 dias
  }

  /**
   * Carrega memórias persistentes do Redis
   */
  public async loadPersistedMemory(userId: string): Promise<void> {
    try {
      // Carregar memória de trabalho
      const workingKey = `working_memory:${userId}`;
      const workingData = await Redis.getCache(workingKey);
      if (workingData) {
        const workingMemory: MemoryLayer = JSON.parse(workingData);
        this.updateMemoryLayer(userId, workingMemory);
      }

      // Carregar memória de longo prazo
      const longTermKey = `longterm_memory:${userId}`;
      const longTermData = await Redis.getCache(longTermKey);
      if (longTermData) {
        const longTermMemories: MemoryLayer[] = JSON.parse(longTermData);
        
        // Combinar em uma única camada de longo prazo
        const combinedContent = longTermMemories
          .map(m => m.content)
          .join('\n');
          
        const combinedLayer: MemoryLayer = {
          type: 'longterm',
          priority: 1,
          content: combinedContent,
          timestamp: Math.max(...longTermMemories.map(m => m.timestamp)),
          userId
        };
        
        this.updateMemoryLayer(userId, combinedLayer);
      }
      
    } catch (error) {
      logger.error('Error loading persisted memory', { userId, error: error as Error });
    }
  }

  /**
   * Limpa memória do usuário
   */
  public async clearUserMemory(userId: string): Promise<void> {
    this.memoryLayers.delete(userId);
    await Redis.deleteCache(`working_memory:${userId}`);
    await Redis.deleteCache(`longterm_memory:${userId}`);
    logger.info('User memory cleared', { userId });
  }

  /**
   * Configuração padrão da memória inteligente
   */
  public static getDefaultConfig(): IntelligentMemoryConfig {
    return {
      immediateMemorySize: 5,
      workingMemorySize: 10, 
      longTermMemorySize: 3,
      summarizationThreshold: 20
    };
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      return {
        status: 'healthy',
        details: {
          totalUsers: this.memoryLayers.size,
          memoryLayers: Array.from(this.memoryLayers.keys()).length
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy', 
        details: { error: (error as Error).message }
      };
    }
  }
}

export const intelligentMemory = IntelligentMemoryService.getInstance();