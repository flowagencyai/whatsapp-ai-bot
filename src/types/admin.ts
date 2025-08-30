/**
 * Admin interface types and schemas
 * These are completely isolated from the main bot functionality
 */

export interface AdminConfig {
  ai: {
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    memorySize: number;
    model: string;
  };
  bot: {
    name: string;
    commands: {
      [key: string]: {
        enabled: boolean;
        response: string;
        description: string;
      };
    };
  };
  features: {
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
    contentModeration: boolean;
    audioTranscription: boolean;
    imageAnalysis: boolean;
  };
  updatedAt: string;
  updatedBy: string;
}

export interface AdminStats {
  system: {
    uptime: number;
    version: string;
    nodeEnv: string;
    memoryUsage: NodeJS.MemoryUsage;
  };
  bot: {
    totalMessages: number;
    totalUsers: number;
    activeUsers: number;
    messagesLast24h: number;
  };
  ai: {
    totalTokens: number;
    averageResponseTime: number;
    successRate: number;
  };
  services: {
    whatsapp: 'healthy' | 'unhealthy';
    langchain: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
  };
}

export interface AdminUser {
  id: string;
  phone: string;
  name?: string;
  status: 'active' | 'paused' | 'blocked';
  lastMessage: string;
  lastActivity: string;
  messageCount: number;
  isBlacklisted: boolean;
  context: {
    messageCount: number;
    conversationStarted: string;
    lastReset: string;
  };
}

export interface AdminAction {
  type: 'config_update' | 'user_action' | 'system_action' | 'bulk_action';
  action: string;
  target?: string;
  data?: any;
  timestamp: string;
  admin: string;
}

export interface AdminMemoryInfo {
  userId: string;
  phone: string;
  memorySize: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  lastActivity: string;
}

export interface AdminConfigUpdate {
  section: keyof AdminConfig;
  field: string;
  value: any;
  admin: string;
}

export interface AdminBulkAction {
  action: 'clear_memory' | 'pause_users' | 'resume_users' | 'blacklist';
  userIds?: string[];
  duration?: number; // for pause actions
}

// Default admin configuration
export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  ai: {
    systemPrompt: `Você é o ZecaBot, um assistente inteligente especializado em automação WhatsApp.

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

Responda de forma natural e útil, focando em ajudar o cliente com suas necessidades relacionadas a produtos naturais e ervas.`,
    temperature: 0.7,
    maxTokens: 2000,
    memorySize: 10,
    model: 'gpt-4o-mini',
  },
  bot: {
    name: 'ZecaBot',
    commands: {
      RESET: {
        enabled: true,
        response: '🔄 Conversa reiniciada! Olá, como posso ajudá-lo hoje?',
        description: 'Reinicia a conversa e limpa o contexto'
      },
      PAUSE: {
        enabled: true,
        response: '⏸️ Atendimento pausado por {duration} minutos. Digite RESUME para retomar.',
        description: 'Pausa o atendimento temporariamente'
      },
      RESUME: {
        enabled: true,
        response: '▶️ Atendimento retomado! Como posso ajudá-lo?',
        description: 'Retoma o atendimento pausado'
      },
      PDF: {
        enabled: true,
        response: '📄 Resumo da conversa:\n\n{summary}',
        description: 'Gera resumo da conversa'
      },
      STATUS: {
        enabled: true,
        response: '📊 Status da conversa:\n\n• Estado: {status}\n• Mensagens: {count}\n• Iniciada em: {started}',
        description: 'Mostra status da conversa atual'
      },
      HELP: {
        enabled: true,
        response: '🤖 Comandos disponíveis:\n\n• RESET - Reinicia a conversa\n• PAUSE [minutos] - Pausa o atendimento\n• RESUME - Retoma o atendimento\n• PDF - Gera resumo da conversa\n• STATUS - Mostra status da conversa\n• HELP - Mostra esta ajuda\n\nVocê também pode enviar textos, áudios e imagens para análise!',
        description: 'Mostra lista de comandos disponíveis'
      }
    }
  },
  features: {
    rateLimiting: {
      enabled: true,
      maxRequests: 10,
      windowMs: 60000
    },
    contentModeration: true,
    audioTranscription: true,
    imageAnalysis: true
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

// Admin API response types
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface AdminApiError {
  code: string;
  message: string;
  details?: any;
}

// User-specific personalization configuration
export interface UserPersonalizationConfig {
  userId: string;
  phone: string;
  ai: {
    systemPrompt?: string;
    personality?: string;
    importantInfo?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
  bot: {
    customName?: string;
    customGreeting?: string;
    customCommands?: {
      [key: string]: {
        enabled: boolean;
        response: string;
        description: string;
      };
    };
  };
  preferences: {
    language?: 'pt' | 'en' | 'es';
    timezone?: string;
    responseStyle?: 'formal' | 'casual' | 'friendly' | 'professional';
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// Default user personalization config
export const DEFAULT_USER_CONFIG: Omit<UserPersonalizationConfig, 'userId' | 'phone' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  ai: {},
  bot: {},
  preferences: {
    language: 'pt',
    responseStyle: 'friendly'
  },
  isActive: true
};