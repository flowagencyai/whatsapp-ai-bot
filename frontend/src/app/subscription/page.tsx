'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Crown,
  Zap,
  DollarSign,
  Users,
  BarChart3,
  Package
} from 'lucide-react';

// Types
interface Subscription {
  id: string;
  plan: {
    id: string;
    name: string;
    type: string;
    description: string;
    price: {
      monthly: number;
      yearly: number;
      currency: string;
    };
    limits: {
      messagesPerDay: number;
      messagesPerMonth: number;
      aiResponsesPerDay: number;
      aiResponsesPerMonth: number;
      audioTranscriptionMinutesPerMonth: number;
      imageAnalysisPerMonth: number;
      botsAllowed: number;
      storageGB: number;
      customPrompts: boolean;
      prioritySupport: boolean;
      apiAccess: boolean;
    };
  };
  status: string;
  billingInterval: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  currentUsage: {
    messagesUsedToday: number;
    messagesUsedThisMonth: number;
    aiResponsesUsedToday: number;
    aiResponsesUsedThisMonth: number;
    audioTranscriptionMinutesUsedThisMonth: number;
    imageAnalysisUsedThisMonth: number;
    storageUsedGB: number;
    dailyResetAt: string;
    monthlyResetAt: string;
  };
}

interface UsageStats {
  messages: {
    daily: { used: number; limit: number; remaining: number; percentage: number };
    monthly: { used: number; limit: number; remaining: number; percentage: number };
  };
  aiResponses: {
    daily: { used: number; limit: number; remaining: number; percentage: number };
    monthly: { used: number; limit: number; remaining: number; percentage: number };
  };
  audioTranscription: {
    monthly: { used: number; limit: number; remaining: number; percentage: number };
  };
  imageAnalysis: {
    monthly: { used: number; limit: number; remaining: number; percentage: number };
  };
  storage: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      addToast({ type: 'error', title: 'Erro ao carregar assinatura' });
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/subscription/usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data.usage);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      // Don't show error toast for usage stats as it's not critical
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const response = await fetch('/api/payment/customer-portal', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to Stripe customer portal
        window.location.href = data.portalUrl;
      } else {
        throw new Error(data.error || 'Erro ao acessar portal de cobrança');
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      addToast({ 
        type: 'error', 
        title: 'Erro no portal de cobrança',
        description: (error as Error).message
      });
    } finally {
      setManagingBilling(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setCanceling(true);
    try {
      const response = await fetch('/api/payment/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ immediately: false })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Assinatura cancelada',
          description: 'Sua assinatura será cancelada no final do período atual'
        });
        
        // Reload subscription data
        await fetchSubscription();
      } else {
        throw new Error(data.error || 'Erro ao cancelar assinatura');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      addToast({ 
        type: 'error', 
        title: 'Erro ao cancelar',
        description: (error as Error).message
      });
    } finally {
      setCanceling(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscription(), fetchUsageStats()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getBillingText = (interval: string) => {
    switch (interval) {
      case 'monthly': return 'Mensal';
      case 'yearly': return 'Anual';
      case 'lifetime': return 'Vitalício';
      default: return interval;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-600';
      case 'cancelled': return 'text-red-600';
      case 'expired': return 'text-red-600';
      case 'trial': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'inactive': return 'Inativa';
      case 'cancelled': return 'Cancelada';
      case 'expired': return 'Expirada';
      case 'trial': return 'Período de Teste';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando assinatura...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Nenhuma Assinatura Ativa
              </h2>
              <p className="text-gray-600 mb-6">
                Você está usando o plano gratuito. Faça upgrade para ter acesso a mais funcionalidades.
              </p>
              <Button onClick={() => router.push('/plans')} size="lg">
                <Crown className="h-5 w-5 mr-2" />
                Ver Planos Disponíveis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Minha Assinatura</h1>
          <p className="text-gray-600 mt-2">
            Gerencie sua assinatura, uso e cobrança
          </p>
        </div>

        {/* Subscription Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Current Plan */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {subscription.plan.name}
                  </h3>
                  <p className="text-gray-600">{subscription.plan.description}</p>
                  
                  <div className="flex items-center mt-4 space-x-4">
                    <Badge className={`${getStatusColor(subscription.status)}`}>
                      {getStatusText(subscription.status)}
                    </Badge>
                    
                    {subscription.isTrialPeriod && (
                      <Badge variant="outline">
                        Período de Teste
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(subscription.amount, subscription.currency)}
                  </div>
                  <p className="text-gray-600">
                    {getBillingText(subscription.billingInterval)}
                  </p>
                </div>
              </div>

              {/* Billing Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Início da Assinatura</p>
                  <p className="font-medium">
                    {new Date(subscription.startDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                {subscription.nextBillingDate && (
                  <div>
                    <p className="text-sm text-gray-500">Próxima Cobrança</p>
                    <p className="font-medium">
                      {new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                {subscription.trialEndsAt && (
                  <div>
                    <p className="text-sm text-gray-500">Fim do Período de Teste</p>
                    <p className="font-medium text-orange-600">
                      {new Date(subscription.trialEndsAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              
              <LoadingButton
                loading={managingBilling}
                onClick={handleManageBilling}
                variant="outline"
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Gerenciar Cobrança
                <ExternalLink className="h-3 w-3 ml-2" />
              </LoadingButton>

              <Button
                onClick={() => router.push('/plans')}
                className="w-full"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Alterar Plano
              </Button>

              <Button
                onClick={() => fetchSubscription()}
                variant="ghost"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>

              {subscription.status === 'active' && (
                <LoadingButton
                  loading={canceling}
                  onClick={handleCancelSubscription}
                  variant="destructive"
                  className="w-full"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Cancelar Assinatura
                </LoadingButton>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Statistics */}
        {usageStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Uso Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Messages */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Mensagens</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Hoje</span>
                        <span className={getUsageColor(usageStats.messages.daily.percentage)}>
                          {usageStats.messages.daily.used}/{usageStats.messages.daily.limit === -1 ? '∞' : usageStats.messages.daily.limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getUsageBarColor(usageStats.messages.daily.percentage)}`}
                          style={{ width: `${Math.min(usageStats.messages.daily.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Este mês</span>
                        <span className={getUsageColor(usageStats.messages.monthly.percentage)}>
                          {usageStats.messages.monthly.used}/{usageStats.messages.monthly.limit === -1 ? '∞' : usageStats.messages.monthly.limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getUsageBarColor(usageStats.messages.monthly.percentage)}`}
                          style={{ width: `${Math.min(usageStats.messages.monthly.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Responses */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Respostas com IA</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Hoje</span>
                        <span className={getUsageColor(usageStats.aiResponses.daily.percentage)}>
                          {usageStats.aiResponses.daily.used}/{usageStats.aiResponses.daily.limit === -1 ? '∞' : usageStats.aiResponses.daily.limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getUsageBarColor(usageStats.aiResponses.daily.percentage)}`}
                          style={{ width: `${Math.min(usageStats.aiResponses.daily.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Este mês</span>
                        <span className={getUsageColor(usageStats.aiResponses.monthly.percentage)}>
                          {usageStats.aiResponses.monthly.used}/{usageStats.aiResponses.monthly.limit === -1 ? '∞' : usageStats.aiResponses.monthly.limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getUsageBarColor(usageStats.aiResponses.monthly.percentage)}`}
                          style={{ width: `${Math.min(usageStats.aiResponses.monthly.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio Transcription */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Transcrição de Áudio</h4>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Este mês</span>
                      <span className={getUsageColor(usageStats.audioTranscription.monthly.percentage)}>
                        {usageStats.audioTranscription.monthly.used}/{usageStats.audioTranscription.monthly.limit === -1 ? '∞' : usageStats.audioTranscription.monthly.limit} min
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageBarColor(usageStats.audioTranscription.monthly.percentage)}`}
                        style={{ width: `${Math.min(usageStats.audioTranscription.monthly.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Storage */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Armazenamento</h4>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Usado</span>
                      <span className={getUsageColor(usageStats.storage.percentage)}>
                        {usageStats.storage.used.toFixed(2)}/{usageStats.storage.limit === -1 ? '∞' : usageStats.storage.limit} GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageBarColor(usageStats.storage.percentage)}`}
                        style={{ width: `${Math.min(usageStats.storage.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades do seu Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="flex items-center">
                <CheckCircle className={`h-4 w-4 mr-3 ${subscription.plan.limits.customPrompts ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={subscription.plan.limits.customPrompts ? 'text-gray-700' : 'text-gray-400'}>
                  Prompts Personalizados
                </span>
              </div>

              <div className="flex items-center">
                <CheckCircle className={`h-4 w-4 mr-3 ${subscription.plan.limits.prioritySupport ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={subscription.plan.limits.prioritySupport ? 'text-gray-700' : 'text-gray-400'}>
                  Suporte Prioritário
                </span>
              </div>

              <div className="flex items-center">
                <CheckCircle className={`h-4 w-4 mr-3 ${subscription.plan.limits.apiAccess ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={subscription.plan.limits.apiAccess ? 'text-gray-700' : 'text-gray-400'}>
                  Acesso à API
                </span>
              </div>

              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                <span className="text-gray-700">
                  {subscription.plan.limits.botsAllowed === -1 ? 'Bots Ilimitados' : `${subscription.plan.limits.botsAllowed} Bot(s)`}
                </span>
              </div>

              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                <span className="text-gray-700">
                  {subscription.plan.limits.storageGB === -1 ? 'Armazenamento Ilimitado' : `${subscription.plan.limits.storageGB}GB de Armazenamento`}
                </span>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}