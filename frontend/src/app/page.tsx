'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Bot, 
  Shield, 
  Zap, 
  Users, 
  Settings,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
  User,
  UserCog,
  Smartphone,
  Brain,
  BarChart3,
  Lock
} from 'lucide-react';

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Bot,
      title: 'IA Avançada',
      description: 'Processamento inteligente de mensagens com GPT-4o-mini e Groq Whisper'
    },
    {
      icon: Shield,
      title: 'Sistema Seguro',
      description: 'Autenticação JWT, roles e permissões granulares para máxima segurança'
    },
    {
      icon: Zap,
      title: 'Performance Otimizada',
      description: 'Redis cache, rate limiting e processamento assíncrono para alta performance'
    },
    {
      icon: BarChart3,
      title: 'Analytics Completos',
      description: 'Dashboard com métricas detalhadas e relatórios em tempo real'
    }
  ];

  const plans = [
    {
      name: 'Usuário',
      description: 'Acesso básico ao sistema',
      icon: User,
      features: [
        'Visualização de conversas',
        'Estatísticas básicas',
        'Acesso ao dashboard',
        'Suporte por email'
      ],
      buttonText: 'Acesso de Usuário',
      buttonVariant: 'outline' as const,
      href: '/auth/login?type=user'
    },
    {
      name: 'Administrador',
      description: 'Controle total do sistema',
      icon: UserCog,
      features: [
        'Todas as funcionalidades',
        'Configuração avançada',
        'Gestão de usuários',
        'Analytics completos',
        'Suporte prioritário'
      ],
      buttonText: 'Acesso Administrativo',
      buttonVariant: 'default' as const,
      href: '/admin/login',
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ZecaBot</h1>
                <p className="text-xs text-gray-300">Sistema Inteligente de Automação</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/auth/login?type=user">
                <Button variant="outline" size="sm" className="text-gray-900 bg-white/90 border-white hover:bg-white hover:text-gray-900">
                  <User className="w-4 h-4 mr-2" />
                  Usuário
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <UserCog className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-4 py-1">
                <Star className="w-4 h-4 mr-2" />
                Sistema de Automação WhatsApp
              </Badge>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-8">
              Automatize seu
              <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                {' '}WhatsApp
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Sistema completo de automação WhatsApp com inteligência artificial avançada, 
              dashboard moderno e controle total sobre suas conversas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/admin/login">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-3">
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-white bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white/90 hover:text-gray-900 text-lg px-8 py-3">
                Ver Demonstração
                <BarChart3 className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Recursos Avançados
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Tecnologia de ponta para automatizar e otimizar suas comunicações no WhatsApp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="bg-white/10 border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                onMouseEnter={() => setActiveFeature(index)}
              >
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-lg mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-green-400" />
                  </div>
                  <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Access Plans */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Escolha seu Nível de Acesso
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Sistema com diferentes níveis de permissão para atender suas necessidades
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index}
                className={`relative bg-white/10 border-white/20 hover:bg-white/15 transition-all ${
                  plan.popular ? 'ring-2 ring-green-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-500 text-white px-4 py-1">
                      Recomendado
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-lg mx-auto mb-4">
                    <plan.icon className="w-8 h-8 text-green-400" />
                  </div>
                  <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-300">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Link href={plan.href} className="block">
                    <Button 
                      variant={plan.buttonVariant}
                      className={`w-full py-3 ${
                        plan.buttonVariant === 'default' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'text-gray-900 bg-white/90 border-white hover:bg-white hover:text-gray-900'
                      }`}
                    >
                      {plan.buttonText}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Tecnologia de Ponta
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Stack moderno e seguro para máxima performance e confiabilidade
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-lg mx-auto mb-4">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">IA Avançada</h3>
              <p className="text-gray-300">
                GPT-4o-mini, Groq Whisper Large-v3 para processamento inteligente
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-lg mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">WhatsApp API</h3>
              <p className="text-gray-300">
                Integração nativa com Baileys e Evolution API para máxima compatibilidade
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-lg mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Segurança</h3>
              <p className="text-gray-300">
                JWT, bcrypt, rate limiting e roles granulares para máxima proteção
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">ZecaBot</p>
                <p className="text-xs text-gray-400">Sistema de Automação Inteligente</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-400">
              © 2025 ZecaBot. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}