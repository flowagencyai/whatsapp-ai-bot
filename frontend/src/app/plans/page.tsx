'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Check,
  Crown,
  Zap,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Star,
  Shield,
  Headphones,
  Smartphone,
  MessageSquare,
  Bot,
  Phone,
  Sparkles,
  Target,
  Award,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';

// Types
interface PlanFeature {
  feature: string;
  enabled: boolean;
  limit?: number;
  description?: string;
}

interface Plan {
  id: string;
  name: string;
  type: 'free' | 'basic' | 'pro' | 'enterprise';
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: PlanFeature[];
  isActive: boolean;
  isPopular?: boolean;
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
}

type BillingInterval = 'monthly' | 'yearly';

// Fallback plans if API fails
const DEFAULT_PLANS: Plan[] = [
  {
    id: 'free-fallback',
    name: 'Gratuito',
    type: 'free',
    description: 'Plano gratuito para testes e uso pessoal',
    price: { monthly: 0, yearly: 0, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: 100 },
      { feature: 'Respostas com IA', enabled: true, limit: 50 },
      { feature: 'Transcrição de áudio', enabled: true, limit: 10 },
      { feature: 'Análise de imagens', enabled: false },
    ],
    isActive: true,
    limits: {
      messagesPerDay: 10,
      messagesPerMonth: 100,
      aiResponsesPerDay: 5,
      aiResponsesPerMonth: 50,
      audioTranscriptionMinutesPerMonth: 10,
      imageAnalysisPerMonth: 0,
      botsAllowed: 1,
      storageGB: 0.1,
      customPrompts: false,
      prioritySupport: false,
      apiAccess: false,
    }
  },
  {
    id: 'basic-fallback',
    name: 'Básico',
    type: 'basic',
    description: 'Plano ideal para pequenos negócios',
    price: { monthly: 29.90, yearly: 299, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: 1000 },
      { feature: 'Respostas com IA', enabled: true, limit: 500 },
      { feature: 'Transcrição de áudio', enabled: true, limit: 60 },
      { feature: 'Análise de imagens', enabled: true, limit: 100 },
    ],
    isActive: true,
    isPopular: true,
    limits: {
      messagesPerDay: 100,
      messagesPerMonth: 1000,
      aiResponsesPerDay: 50,
      aiResponsesPerMonth: 500,
      audioTranscriptionMinutesPerMonth: 60,
      imageAnalysisPerMonth: 100,
      botsAllowed: 2,
      storageGB: 1,
      customPrompts: true,
      prioritySupport: false,
      apiAccess: true,
    }
  },
  {
    id: 'pro-fallback',
    name: 'Profissional',
    type: 'pro',
    description: 'Plano completo para empresas',
    price: { monthly: 79.90, yearly: 799, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: 5000 },
      { feature: 'Respostas com IA', enabled: true, limit: 2000 },
      { feature: 'Transcrição de áudio', enabled: true, limit: 300 },
      { feature: 'Análise de imagens', enabled: true, limit: 500 },
    ],
    isActive: true,
    limits: {
      messagesPerDay: 500,
      messagesPerMonth: 5000,
      aiResponsesPerDay: 200,
      aiResponsesPerMonth: 2000,
      audioTranscriptionMinutesPerMonth: 300,
      imageAnalysisPerMonth: 500,
      botsAllowed: 5,
      storageGB: 10,
      customPrompts: true,
      prioritySupport: true,
      apiAccess: true,
    }
  },
  {
    id: 'enterprise-fallback',
    name: 'Empresarial',
    type: 'enterprise',
    description: 'Solução completa para grandes empresas',
    price: { monthly: 199.90, yearly: 1999, currency: 'BRL' },
    features: [
      { feature: 'Mensagens WhatsApp', enabled: true, limit: -1 },
      { feature: 'Respostas com IA', enabled: true, limit: -1 },
      { feature: 'Transcrição de áudio', enabled: true, limit: -1 },
      { feature: 'Análise de imagens', enabled: true, limit: -1 },
    ],
    isActive: true,
    limits: {
      messagesPerDay: -1,
      messagesPerMonth: -1,
      aiResponsesPerDay: -1,
      aiResponsesPerMonth: -1,
      audioTranscriptionMinutesPerMonth: -1,
      imageAnalysisPerMonth: -1,
      botsAllowed: -1,
      storageGB: 100,
      customPrompts: true,
      prioritySupport: true,
      apiAccess: true,
    }
  }
];

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const { addToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const fetchPlans = async () => {
    try {
      console.log('Fetching plans from /api/subscription/plans');
      const response = await fetch('/api/subscription/plans');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Plans data received:', data);
        if (data.plans && data.plans.length > 0) {
          setPlans(data.plans);
        } else {
          console.warn('No plans received from API, using fallback plans');
          setPlans(DEFAULT_PLANS);
        }
      } else {
        console.error('Failed to fetch plans:', response.status, response.statusText);
        console.log('Using fallback plans due to API error');
        setPlans(DEFAULT_PLANS);
        addToast({ 
          type: 'warning', 
          title: 'Usando planos em cache', 
          description: 'Conectando com o servidor...' 
        });
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      console.log('Using fallback plans due to network error');
      setPlans(DEFAULT_PLANS);
      addToast({ 
        type: 'warning', 
        title: 'Modo offline', 
        description: 'Mostrando planos salvos. Verifique sua conexão.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setProcessingPlan(planId);
    
    try {
      const response = await fetch('/api/payment/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId,
          billingInterval
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || 'Erro ao criar sessão de pagamento');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      addToast({ 
        type: 'error', 
        title: 'Erro no pagamento',
        description: (error as Error).message
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'free': return <Zap className="h-8 w-8 text-gray-400" />;
      case 'basic': return <MessageSquare className="h-8 w-8 text-blue-400" />;
      case 'pro': return <Crown className="h-8 w-8 text-purple-400" />;
      case 'enterprise': return <Target className="h-8 w-8 text-green-400" />;
      default: return <Bot className="h-8 w-8 text-blue-400" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDiscountPercentage = (monthly: number, yearly: number) => {
    if (monthly === 0 || yearly === 0) return 0;
    return Math.round((1 - (yearly / 12) / monthly) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-blue-100 text-lg">Carregando planos...</p>
          <p className="text-slate-400 text-sm mt-2">Preparando as melhores opções para você</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center text-blue-300 hover:text-white transition-colors group">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para Home</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login?type=user" 
              className="text-blue-300 hover:text-white transition-colors text-sm"
            >
              Entrar
            </Link>
            <Link 
              href="/admin/login" 
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white px-4 py-2 rounded-lg transition-all text-sm border border-blue-500/30"
            >
              Admin
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-full px-6 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-blue-400 mr-2" />
            <span className="text-blue-300 text-sm font-medium">Planos ZecaBot</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 bg-gradient-to-r from-white via-blue-100 to-green-100 bg-clip-text text-transparent">
            Escolha o Futuro do
            <br />
            seu Atendimento
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            Transforme cada conversa em oportunidade de negócio. Nosso sistema de IA humaniza 
            o atendimento no WhatsApp, criando conexões autênticas que geram resultados reais.
          </p>
          
          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 mb-10 text-blue-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              <span className="text-sm">+2.847 empresas confiam</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-sm">127% aumento em vendas</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span className="text-sm">98% satisfação</span>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-1.5 shadow-2xl">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              Pagamento Mensal
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all relative ${
                billingInterval === 'yearly'
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              Pagamento Anual
              <span className="absolute -top-3 -right-2 bg-gradient-to-r from-green-400 to-green-600 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
                Economize 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.filter(plan => plan.isActive !== false).map((plan) => {
            const price = billingInterval === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const monthlyEquivalent = billingInterval === 'yearly' ? price / 12 : price;
            const discount = getDiscountPercentage(plan.price.monthly, plan.price.yearly);
            const isFreePlan = plan.type === 'free';

            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-500 group hover:scale-105 ${
                  plan.isPopular 
                    ? 'bg-gradient-to-br from-blue-900 to-blue-800 border-2 border-blue-400 shadow-2xl shadow-blue-500/25 ring-2 ring-blue-400/50 transform scale-105' 
                    : isFreePlan
                    ? 'bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 hover:border-slate-500 shadow-xl hover:shadow-2xl'
                    : 'bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 hover:border-blue-500 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20'
                }`}
              >
                {/* Background Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />
                
                {plan.isPopular && (
                  <>
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20">
                      <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 shadow-lg border border-blue-400">
                        <Crown className="h-3 w-3 mr-1" />
                        Mais Escolhido
                      </Badge>
                    </div>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500" />
                  </>
                )}

                <CardHeader className="text-center pb-2 pt-8 relative z-10">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      plan.isPopular 
                        ? 'bg-blue-500/20 border border-blue-400/30'
                        : isFreePlan
                        ? 'bg-gray-500/20 border border-gray-400/30'
                        : 'bg-slate-600/20 border border-slate-400/30'
                    }`}>
                      {getTypeIcon(plan.type)}
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </CardTitle>
                  
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mt-6 mb-6">
                    {isFreePlan ? (
                      <div className="text-4xl font-bold text-white mb-2">
                        Gratuito
                      </div>
                    ) : (
                      <>
                        <div className="text-5xl font-bold text-white mb-2">
                          {formatCurrency(monthlyEquivalent, plan.price.currency)}
                          <span className="text-lg font-normal text-slate-300">/mês</span>
                        </div>
                        {billingInterval === 'yearly' && discount > 0 && (
                          <div className="inline-flex items-center bg-green-500/20 border border-green-400/30 rounded-full px-3 py-1">
                            <CheckCircle2 className="w-3 h-3 text-green-400 mr-1" />
                            <span className="text-xs text-green-300 font-medium">
                              Economize {discount}% pagando anualmente
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Value Proposition */}
                    <div className="text-xs text-slate-400 mt-2">
                      {plan.type === 'free' && 'Perfeito para testar'}
                      {plan.type === 'basic' && 'Ideal para pequenos negócios'}
                      {plan.type === 'pro' && 'Solução completa para empresas'}
                      {plan.type === 'enterprise' && 'Máximo desempenho e suporte'}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 relative z-10">
                  {/* Key Features */}
                  <div className="space-y-4 mb-8">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-start">
                        {feature.enabled ? (
                          <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0 text-green-400 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 mr-3 flex-shrink-0 text-slate-500 mt-0.5" />
                        )}
                        <div>
                          <span className={`text-sm font-medium ${
                            feature.enabled ? 'text-slate-200' : 'text-slate-500'
                          }`}>
                            {feature.feature}
                          </span>
                          {feature.enabled && (
                            <div className="text-xs text-slate-400 mt-1">
                              {feature.limit && feature.limit > 0 && `Até ${feature.limit} por mês`}
                              {feature.limit === -1 && 'Uso ilimitado'}
                              {!feature.limit && 'Incluído no plano'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Additional features for non-free plans */}
                    {!isFreePlan && (
                      <>
                        <div className="flex items-start">
                          <Bot className="h-5 w-5 mr-3 text-blue-400 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-slate-200">
                              {plan.limits.botsAllowed === -1 ? 'Bots Ilimitados' : `${plan.limits.botsAllowed} Bot${plan.limits.botsAllowed > 1 ? 's' : ''}`}
                            </span>
                            <div className="text-xs text-slate-400 mt-1">
                              Conecte quantos números precisar
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <Shield className="h-5 w-5 mr-3 text-green-400 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-slate-200">
                              {plan.limits.storageGB === -1 ? 'Armazenamento Ilimitado' : `${plan.limits.storageGB}GB de Armazenamento`}
                            </span>
                            <div className="text-xs text-slate-400 mt-1">
                              Para conversas, mídias e relatórios
                            </div>
                          </div>
                        </div>

                        {plan.limits.prioritySupport && (
                          <div className="flex items-start">
                            <Headphones className="h-5 w-5 mr-3 text-purple-400 mt-0.5" />
                            <div>
                              <span className="text-sm font-medium text-slate-200">
                                Suporte Prioritário
                              </span>
                              <div className="text-xs text-slate-400 mt-1">
                                Atendimento em até 2 horas
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Button */}
                  <LoadingButton
                    loading={processingPlan === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-4 text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      isFreePlan
                        ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white border border-slate-500'
                        : plan.isPopular
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-lg shadow-blue-500/25 border border-blue-400'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-blue-600 hover:to-blue-700 text-white border border-slate-600 hover:border-blue-500'
                    }`}
                    disabled={isFreePlan && !!user}
                  >
                    {isFreePlan ? (
                      user ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Plano Atual
                        </>
                      ) : (
                        <>
                          Começar Grátis
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </>
                      )
                    ) : (
                      <>
                        {plan.isPopular ? 'Escolher o Melhor' : 'Começar Agora'}
                        <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </LoadingButton>

                  {!isFreePlan && (
                    <div className="text-center mt-4">
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-2">
                        <Shield className="w-3 h-3" />
                        <span>Pagamento 100% seguro via Stripe</span>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                        <span>• Cancele a qualquer momento</span>
                        <span>• 7 dias de garantia</span>
                      </div>
                    </div>
                  )}
                  
                  {isFreePlan && (
                    <div className="text-center mt-4">
                      <div className="text-xs text-slate-400">
                        ✨ Sem cartão de crédito
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-900/50 to-green-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ainda tem dúvidas sobre qual plano escolher?
            </h2>
            <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
              Nossa equipe de especialistas está pronta para te ajudar a encontrar a solução perfeita 
              para o seu negócio. Converse conosco no WhatsApp!
            </p>
            <a 
              href="https://wa.me/5511914858591?text=Olá! Gostaria de entender melhor os planos do ZecaBot" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                <Phone className="h-5 w-5 mr-2" />
                Fale com um Especialista
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </a>
            
            <div className="flex items-center justify-center gap-8 mt-8 text-blue-200 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Resposta em minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Consultoria gratuita</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Especialistas certificados</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">100% Seguro</h3>
            <p className="text-slate-300 text-sm">
              Criptografia de nível bancário. Seus dados estão protegidos com os mais altos padrões de segurança.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Garantia de 7 Dias</h3>
            <p className="text-slate-300 text-sm">
              Não satisfeito? Devolvemos 100% do seu dinheiro nos primeiros 7 dias, sem perguntas.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Suporte Dedicado</h3>
            <p className="text-slate-300 text-sm">
              Nossa equipe especializada está sempre disponível para ajudar você a ter sucesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}