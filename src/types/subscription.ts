// Subscription and Plans Types

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise' | 'custom';

export type BillingInterval = 'monthly' | 'yearly' | 'lifetime';

export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'expired' | 'trial' | 'suspended';

export interface PlanFeature {
  feature: string;
  enabled: boolean;
  limit?: number;
  description?: string;
}

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
  isPopular?: boolean;
  
  // Stripe integration
  stripeProductId?: string;
  stripePriceMonthlyId?: string;
  stripePriceYearlyId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimits {
  // Message limits
  messagesPerDay: number;
  messagesPerMonth: number;
  
  // AI features
  aiResponsesPerDay: number;
  aiResponsesPerMonth: number;
  audioTranscriptionMinutesPerMonth: number;
  imageAnalysisPerMonth: number;
  
  // Bot features
  botsAllowed: number;
  conversationsPerBot: number;
  
  // Storage
  storageGB: number;
  contextHistoryDays: number;
  
  // Advanced features
  customPrompts: boolean;
  prioritySupport: boolean;
  analyticsRetentionDays: number;
  apiAccess: boolean;
  webhookEndpoints: number;
  
  // Admin features
  teamMembersAllowed: number;
  rolesAndPermissions: boolean;
  auditLogs: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: Plan; // Populated plan data
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  
  // Dates
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  cancelledAt?: string;
  suspendedAt?: string;
  
  // Trial
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  
  // Usage tracking
  currentUsage: UsageStats;
  
  // Billing
  amount: number;
  currency: string;
  
  // Stripe integration
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  stripePaymentMethodId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  // Current period usage
  messagesUsedToday: number;
  messagesUsedThisMonth: number;
  
  aiResponsesUsedToday: number;
  aiResponsesUsedThisMonth: number;
  
  audioTranscriptionMinutesUsedThisMonth: number;
  imageAnalysisUsedThisMonth: number;
  
  storageUsedGB: number;
  
  // Last reset dates
  dailyResetAt: string;
  monthlyResetAt: string;
  
  // Totals since subscription start
  totalMessagesEverSent: number;
  totalAiResponsesEverGenerated: number;
}

export interface QuotaCheck {
  feature: string;
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetsAt?: string;
  upgradeRequired: boolean;
}

export interface FeatureAccess {
  feature: string;
  hasAccess: boolean;
  reason?: string;
  upgradeRequired: boolean;
}

// Plan creation and update types
export interface CreatePlanRequest {
  name: string;
  type: PlanType;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: PlanFeature[];
  limits: PlanLimits;
  isActive?: boolean;
  isPopular?: boolean;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price?: {
    monthly?: number;
    yearly?: number;
    currency?: string;
  };
  features?: PlanFeature[];
  limits?: Partial<PlanLimits>;
  isActive?: boolean;
  isPopular?: boolean;
}

// Subscription management types
export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  billingInterval: BillingInterval;
  isTrialPeriod?: boolean;
  trialDays?: number;
  startDate?: string;
}

export interface UpdateSubscriptionRequest {
  status?: SubscriptionStatus;
  planId?: string;
  billingInterval?: BillingInterval;
  endDate?: string;
  metadata?: Record<string, any>;
}

// Usage tracking types
export interface UsageIncrement {
  feature: 'messages' | 'aiResponses' | 'audioTranscription' | 'imageAnalysis' | 'storage';
  amount: number;
  userId: string;
  metadata?: Record<string, any>;
}

// Billing and payment types
export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string;
  createdAt: string;
}

// Stripe-specific types
export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
  planId: string;
  billingInterval: BillingInterval;
  userId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: any;
  processed: boolean;
  processedAt?: string;
  error?: string;
  createdAt: string;
}

export interface StripeCustomer {
  stripeCustomerId: string;
  userId: string;
  email: string;
  name?: string;
  defaultPaymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

// Default plan configurations
export const DEFAULT_PLANS: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Gratuito',
    type: 'free',
    description: 'Plano gratuito para testes e uso pessoal',
    price: { monthly: 0, yearly: 0, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: 100 },
      { feature: 'Respostas com IA', enabled: true, limit: 50 },
      { feature: 'Transcrição de áudio', enabled: true, limit: 10 },
      { feature: 'Análise de imagens', enabled: false },
      { feature: 'Suporte prioritário', enabled: false },
      { feature: 'API personalizada', enabled: false }
    ],
    limits: {
      messagesPerDay: 10,
      messagesPerMonth: 100,
      aiResponsesPerDay: 5,
      aiResponsesPerMonth: 50,
      audioTranscriptionMinutesPerMonth: 10,
      imageAnalysisPerMonth: 0,
      botsAllowed: 1,
      conversationsPerBot: 10,
      storageGB: 0.1,
      contextHistoryDays: 7,
      customPrompts: false,
      prioritySupport: false,
      analyticsRetentionDays: 30,
      apiAccess: false,
      webhookEndpoints: 0,
      teamMembersAllowed: 1,
      rolesAndPermissions: false,
      auditLogs: false
    },
    isActive: true
  },
  {
    name: 'Básico',
    type: 'basic',
    description: 'Plano ideal para pequenos negócios',
    price: { monthly: 29.90, yearly: 299, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: 1000 },
      { feature: 'Respostas com IA', enabled: true, limit: 500 },
      { feature: 'Transcrição de áudio', enabled: true, limit: 60 },
      { feature: 'Análise de imagens', enabled: true, limit: 100 },
      { feature: 'Suporte por email', enabled: true },
      { feature: 'API básica', enabled: true }
    ],
    limits: {
      messagesPerDay: 100,
      messagesPerMonth: 1000,
      aiResponsesPerDay: 50,
      aiResponsesPerMonth: 500,
      audioTranscriptionMinutesPerMonth: 60,
      imageAnalysisPerMonth: 100,
      botsAllowed: 2,
      conversationsPerBot: 100,
      storageGB: 1,
      contextHistoryDays: 30,
      customPrompts: true,
      prioritySupport: false,
      analyticsRetentionDays: 90,
      apiAccess: true,
      webhookEndpoints: 2,
      teamMembersAllowed: 3,
      rolesAndPermissions: true,
      auditLogs: false
    },
    isActive: true,
    isPopular: true
  },
  {
    name: 'Profissional',
    type: 'pro',
    description: 'Plano completo para empresas',
    price: { monthly: 79.90, yearly: 799, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: 5000 },
      { feature: 'Respostas com IA', enabled: true, limit: 2000 },
      { feature: 'Transcrição de áudio', enabled: true, limit: 300 },
      { feature: 'Análise de imagens', enabled: true, limit: 500 },
      { feature: 'Suporte prioritário', enabled: true },
      { feature: 'API completa', enabled: true },
      { feature: 'Webhooks avançados', enabled: true },
      { feature: 'Analytics avançado', enabled: true }
    ],
    limits: {
      messagesPerDay: 500,
      messagesPerMonth: 5000,
      aiResponsesPerDay: 200,
      aiResponsesPerMonth: 2000,
      audioTranscriptionMinutesPerMonth: 300,
      imageAnalysisPerMonth: 500,
      botsAllowed: 5,
      conversationsPerBot: 500,
      storageGB: 10,
      contextHistoryDays: 90,
      customPrompts: true,
      prioritySupport: true,
      analyticsRetentionDays: 180,
      apiAccess: true,
      webhookEndpoints: 10,
      teamMembersAllowed: 10,
      rolesAndPermissions: true,
      auditLogs: true
    },
    isActive: true
  },
  {
    name: 'Empresarial',
    type: 'enterprise',
    description: 'Solução completa para grandes empresas',
    price: { monthly: 199.90, yearly: 1999, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: -1 }, // Unlimited
      { feature: 'Respostas com IA', enabled: true, limit: -1 },
      { feature: 'Transcrição de áudio', enabled: true, limit: -1 },
      { feature: 'Análise de imagens', enabled: true, limit: -1 },
      { feature: 'Suporte 24/7', enabled: true },
      { feature: 'API enterprise', enabled: true },
      { feature: 'Webhooks ilimitados', enabled: true },
      { feature: 'Analytics completo', enabled: true },
      { feature: 'Integração personalizada', enabled: true },
      { feature: 'SLA garantido', enabled: true }
    ],
    limits: {
      messagesPerDay: -1, // Unlimited
      messagesPerMonth: -1,
      aiResponsesPerDay: -1,
      aiResponsesPerMonth: -1,
      audioTranscriptionMinutesPerMonth: -1,
      imageAnalysisPerMonth: -1,
      botsAllowed: -1,
      conversationsPerBot: -1,
      storageGB: 100,
      contextHistoryDays: 365,
      customPrompts: true,
      prioritySupport: true,
      analyticsRetentionDays: 365,
      apiAccess: true,
      webhookEndpoints: -1,
      teamMembersAllowed: -1,
      rolesAndPermissions: true,
      auditLogs: true
    },
    isActive: true
  }
];

// Feature flags for different functionalities
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  requiredPlan?: PlanType[];
  requiredPermission?: string;
}

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  AI_RESPONSES: {
    name: 'ai_responses',
    enabled: true,
    description: 'Respostas automáticas com IA',
    requiredPlan: ['free', 'basic', 'pro', 'enterprise']
  },
  AUDIO_TRANSCRIPTION: {
    name: 'audio_transcription',
    enabled: true,
    description: 'Transcrição de mensagens de áudio',
    requiredPlan: ['free', 'basic', 'pro', 'enterprise']
  },
  IMAGE_ANALYSIS: {
    name: 'image_analysis',
    enabled: true,
    description: 'Análise de imagens com IA',
    requiredPlan: ['basic', 'pro', 'enterprise']
  },
  CUSTOM_PROMPTS: {
    name: 'custom_prompts',
    enabled: true,
    description: 'Personalização de prompts de IA',
    requiredPlan: ['basic', 'pro', 'enterprise']
  },
  PRIORITY_SUPPORT: {
    name: 'priority_support',
    enabled: true,
    description: 'Suporte prioritário',
    requiredPlan: ['pro', 'enterprise']
  },
  API_ACCESS: {
    name: 'api_access',
    enabled: true,
    description: 'Acesso à API REST',
    requiredPlan: ['basic', 'pro', 'enterprise']
  },
  WEBHOOKS: {
    name: 'webhooks',
    enabled: true,
    description: 'Webhooks para integração',
    requiredPlan: ['basic', 'pro', 'enterprise']
  },
  ADVANCED_ANALYTICS: {
    name: 'advanced_analytics',
    enabled: true,
    description: 'Analytics avançado',
    requiredPlan: ['pro', 'enterprise']
  },
  TEAM_MANAGEMENT: {
    name: 'team_management',
    enabled: true,
    description: 'Gerenciamento de equipe',
    requiredPlan: ['basic', 'pro', 'enterprise']
  },
  AUDIT_LOGS: {
    name: 'audit_logs',
    enabled: true,
    description: 'Logs de auditoria',
    requiredPlan: ['pro', 'enterprise']
  }
};