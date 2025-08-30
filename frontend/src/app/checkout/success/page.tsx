'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SuccessAnimation } from '@/components/ui/success-animation';
import { useToast } from '@/components/ui/toast';
import {
  CheckCircle,
  ArrowRight,
  CreditCard,
  Calendar,
  Package,
  Home
} from 'lucide-react';

interface CheckoutSession {
  sessionId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  billingInterval: string;
  status: string;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  const fetchSessionDetails = async () => {
    if (!sessionId) {
      setError('Sessão de pagamento não encontrada');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/payment/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessionData(data.session);
        
        // Show success message
        addToast({
          type: 'success',
          title: 'Pagamento realizado com sucesso!',
          description: `Você agora tem acesso ao plano ${data.session.planName}`
        });
      } else {
        throw new Error('Erro ao carregar detalhes do pagamento');
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
      setError('Erro ao carregar informações do pagamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const getBillingText = (interval: string) => {
    switch (interval) {
      case 'monthly': return 'mensal';
      case 'yearly': return 'anual';
      case 'lifetime': return 'vitalício';
      default: return interval;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-red-900">
              Erro no Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/plans')} className="w-full">
                Tentar Novamente
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Ir para Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* Success Animation and Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6">
              <SuccessAnimation show={true} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Pagamento Confirmado!
            </h1>
            <p className="text-xl text-gray-600">
              Obrigado por escolher nosso serviço. Sua assinatura foi ativada com sucesso.
            </p>
          </div>

          {/* Payment Details Card */}
          {sessionData && (
            <Card className="mb-8 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                <CardTitle className="flex items-center text-xl">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Detalhes da Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Plan Information */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Plano Selecionado</p>
                        <p className="font-semibold text-gray-900">{sessionData.planName}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Cobrança</p>
                        <p className="font-semibold text-gray-900 capitalize">
                          {getBillingText(sessionData.billingInterval)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Valor Pago</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(sessionData.amount, sessionData.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-semibold text-green-600">Confirmado</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session ID for reference */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-gray-500">
                    ID da Sessão: {sessionData.sessionId}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* What's Next Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">O que acontece agora?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm font-semibold text-blue-600">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Acesso Liberado</h3>
                    <p className="text-gray-600 text-sm">
                      Todas as funcionalidades do seu plano já estão disponíveis no dashboard
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm font-semibold text-blue-600">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Configure seu Bot</h3>
                    <p className="text-gray-600 text-sm">
                      Personalize as respostas automáticas e configure integração com WhatsApp
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm font-semibold text-blue-600">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Suporte Disponível</h3>
                    <p className="text-gray-600 text-sm">
                      Nossa equipe está pronta para te ajudar com qualquer dúvida
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => router.push('/dashboard')}
              size="lg"
              className="flex items-center"
            >
              <Home className="h-5 w-5 mr-2" />
              Ir para Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button 
              variant="outline"
              size="lg"
              onClick={() => router.push('/personalization')}
              className="flex items-center"
            >
              Configurar Bot
            </Button>
          </div>

          {/* Contact Support */}
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Precisa de ajuda para começar?
            </p>
            <Button variant="ghost">
              Entrar em Contato
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}