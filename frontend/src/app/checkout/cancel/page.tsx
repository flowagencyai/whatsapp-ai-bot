'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  XCircle,
  ArrowLeft,
  RefreshCw,
  MessageCircle,
  Home
} from 'lucide-react';

export default function CheckoutCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* Cancel Icon and Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-orange-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Pagamento Cancelado
            </h1>
            <p className="text-xl text-gray-600">
              Não se preocupe, nenhuma cobrança foi realizada.
            </p>
          </div>

          {/* Information Card */}
          <Card className="mb-8 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <CardTitle className="flex items-center text-xl">
                <XCircle className="h-5 w-5 mr-2" />
                O que aconteceu?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-gray-700">
                  O processo de pagamento foi interrompido antes da conclusão. Isso pode ter acontecido por diversos motivos:
                </p>
                
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>Você decidiu cancelar a assinatura</li>
                  <li>Houve um problema com o método de pagamento</li>
                  <li>A sessão de pagamento expirou</li>
                  <li>Problema de conexão com a internet</li>
                </ul>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <MessageCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Lembre-se:</strong> Você ainda pode usar todas as funcionalidades do plano gratuito 
                        enquanto decide qual plano é melhor para você.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">O que você pode fazer agora?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Try Again */}
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center mb-3">
                    <RefreshCw className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Tentar Novamente</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Volte à página de planos e tente o processo de assinatura novamente
                  </p>
                  <Button 
                    onClick={() => router.push('/plans')}
                    className="w-full"
                    size="sm"
                  >
                    Ver Planos
                  </Button>
                </div>

                {/* Continue Free */}
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center mb-3">
                    <Home className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Continuar Gratuito</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Use o plano gratuito e conheça melhor nossa plataforma
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="w-full"
                    size="sm"
                  >
                    Ir para Dashboard
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Main Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => router.push('/plans')}
              size="lg"
              className="flex items-center"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Tentar Novamente
            </Button>

            <Button 
              variant="outline"
              size="lg"
              onClick={() => router.push('/dashboard')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>

          {/* Benefits Reminder */}
          <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-gray-900 mb-2">
                Por que escolher um plano pago?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Mais Mensagens</div>
                  <div className="text-gray-600">Até 5.000 mensagens/mês</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">IA Avançada</div>
                  <div className="text-gray-600">Respostas mais inteligentes</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Suporte Priority</div>
                  <div className="text-gray-600">Atendimento especializado</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Teve algum problema durante o processo de pagamento?
            </p>
            <Button variant="ghost" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com Suporte
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}