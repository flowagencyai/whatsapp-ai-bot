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
  Check,
  Crown,
  Zap,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Star,
  Shield,
  Headphones,
  Smartphone
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
      const response = await fetch('/api/subscription/plans');
      
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      addToast({ type: 'error', title: 'Erro ao carregar planos' });
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
      case 'free': return <Zap className="h-6 w-6 text-gray-500" />;
      case 'basic': return <CreditCard className="h-6 w-6 text-blue-500" />;
      case 'pro': return <Crown className="h-6 w-6 text-purple-500" />;
      case 'enterprise': return <TrendingUp className="h-6 w-6 text-gold-500" />;
      default: return <CreditCard className="h-6 w-6" />;
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha seu plano
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automatize seu WhatsApp com IA e tenha mais tempo para focar no que realmente importa. 
            Escolha o plano ideal para o seu negócio.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-full p-1 shadow-lg">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all relative ${
                billingInterval === 'yearly'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.filter(plan => plan.isActive).map((plan) => {
            const price = billingInterval === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const monthlyEquivalent = billingInterval === 'yearly' ? price / 12 : price;
            const discount = getDiscountPercentage(plan.price.monthly, plan.price.yearly);
            const isFreePlan = plan.type === 'free';

            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  plan.isPopular 
                    ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' 
                    : 'hover:shadow-lg'
                } ${isFreePlan ? 'bg-gray-50' : 'bg-white'}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2 pt-6">
                  <div className="flex justify-center mb-4">
                    {getTypeIcon(plan.type)}
                  </div>
                  
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  
                  <p className="text-gray-600 text-sm mt-2">
                    {plan.description}
                  </p>

                  <div className="mt-6">
                    {isFreePlan ? (
                      <div className="text-3xl font-bold text-gray-900">
                        Gratuito
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl font-bold text-gray-900">
                          {formatCurrency(monthlyEquivalent, plan.price.currency)}
                          <span className="text-base font-normal text-gray-600">/mês</span>
                        </div>
                        {billingInterval === 'yearly' && discount > 0 && (
                          <div className="text-sm text-green-600 mt-1">
                            Economia de {discount}% no plano anual
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Key Features */}
                  <div className="space-y-3 mb-8">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className={`h-4 w-4 mr-3 flex-shrink-0 ${
                          feature.enabled ? 'text-green-500' : 'text-gray-300'
                        }`} />
                        <span className={`text-sm ${
                          feature.enabled ? 'text-gray-700' : 'text-gray-400'
                        }`}>
                          {feature.feature}
                          {feature.limit && feature.limit > 0 && ` (${feature.limit})`}
                          {feature.limit === -1 && ' (ilimitado)'}
                        </span>
                      </div>
                    ))}

                    {/* Additional features for non-free plans */}
                    {!isFreePlan && (
                      <>
                        <div className="flex items-center">
                          <Smartphone className="h-4 w-4 mr-3 text-green-500" />
                          <span className="text-sm text-gray-700">
                            {plan.limits.botsAllowed === -1 ? 'Bots ilimitados' : `${plan.limits.botsAllowed} bot(s)`}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-3 text-green-500" />
                          <span className="text-sm text-gray-700">
                            {plan.limits.storageGB === -1 ? 'Armazenamento ilimitado' : `${plan.limits.storageGB}GB de armazenamento`}
                          </span>
                        </div>

                        {plan.limits.prioritySupport && (
                          <div className="flex items-center">
                            <Headphones className="h-4 w-4 mr-3 text-green-500" />
                            <span className="text-sm text-gray-700">
                              Suporte prioritário
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Button */}
                  <LoadingButton
                    loading={processingPlan === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full transition-all ${
                      isFreePlan
                        ? 'bg-gray-600 hover:bg-gray-700'
                        : plan.isPopular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-800 hover:bg-gray-900'
                    } text-white`}
                    disabled={isFreePlan && !!user} // Disable free plan if user is logged in and already has it
                  >
                    {isFreePlan ? (
                      user ? 'Plano Atual' : 'Começar Grátis'
                    ) : (
                      <>
                        Escolher Plano
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </LoadingButton>

                  {!isFreePlan && (
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Pagamento seguro via Stripe
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Precisa de mais informações?
          </h2>
          <p className="text-gray-600 mb-6">
            Nossa equipe está pronta para te ajudar a escolher o melhor plano para sua empresa.
          </p>
          <Button variant="outline" size="lg">
            Fale Conosco
          </Button>
        </div>

        {/* Security Notice */}
        <div className="mt-12 bg-white/50 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <Shield className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-semibold text-gray-900">Pagamento Seguro</span>
          </div>
          <p className="text-sm text-gray-600">
            Seus dados de pagamento são processados de forma segura. 
            Não armazenamos detalhes do cartão de crédito nos nossos servidores.
          </p>
        </div>
      </div>
    </div>
  );
}