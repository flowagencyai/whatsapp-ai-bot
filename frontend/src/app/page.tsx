'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Shield, 
  Star,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Heart,
  DollarSign,
  Phone,
  Target,
  Sparkles,
  Award,
  LineChart,
  Headphones,
  User,
  UserCog,
  Bot,
  Zap,
  BarChart3
} from 'lucide-react';

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  const stats = [
    { number: '2.847+', label: 'Mensagens Inteligentes Hoje' },
    { number: '127%', label: 'Aumento Médio em Vendas' },
    { number: '83%', label: 'Taxa de Satisfação' },
    { number: 'R$ 8.4K', label: 'Economia Mensal' }
  ];

  const features = [
    {
      icon: Bot,
      title: 'IA Avançada',
      description: 'Processamento inteligente de mensagens com GPT-4o-mini e Groq Whisper',
      benefit: 'Respostas naturais e contextualizadas'
    },
    {
      icon: Shield,
      title: 'Sistema Seguro',
      description: 'Autenticação JWT, roles e permissões granulares para máxima segurança',
      benefit: 'Proteção total dos seus dados'
    },
    {
      icon: Zap,
      title: 'Performance Otimizada',
      description: 'Redis cache, rate limiting e processamento assíncrono para alta performance',
      benefit: 'Resposta instantânea em escala'
    },
    {
      icon: BarChart3,
      title: 'Analytics Completos',
      description: 'Dashboard com métricas detalhadas e relatórios em tempo real',
      benefit: 'Insights para crescer seu negócio'
    }
  ];

  const testimonials = [
    {
      name: 'Maria Santos',
      business: 'Boutique Flor de Liz',
      message: 'Meus clientes elogiam o atendimento "humanizado" do WhatsApp. Eles nem imaginam que é IA!',
      revenue: '+R$ 12.000/mês'
    },
    {
      name: 'Carlos Mendes',
      business: 'E-commerce de Suplementos',
      message: 'Fechamos 3 vendas durante a madrugada ontem. O ZecaBot não para!',
      revenue: '+R$ 28.000/mês'
    },
    {
      name: 'Ana Paula',
      business: 'Consultora de Beleza',
      message: 'Antes eu perdia clientes por demora. Agora respondo em segundos e vendo mais.',
      revenue: '+R$ 8.500/mês'
    }
  ];

  const plans = [
    {
      name: 'Básico',
      price: 'R$ 297',
      period: '/mês',
      description: 'Ideal para pequenos negócios',
      icon: Sparkles,
      features: [
        '1.000 mensagens/mês',
        'IA básica de atendimento',
        'Respostas automáticas',
        'Dashboard simples',
        'Suporte por email'
      ],
      cta: 'Escolher Plano Básico',
      href: '/plans?plan=basic',
      popular: false
    },
    {
      name: 'Profissional',
      price: 'R$ 597',
      period: '/mês',
      description: 'Para empresas em crescimento',
      icon: Award,
      features: [
        '10.000 mensagens/mês',
        'IA avançada com vendas',
        'Qualificação de leads',
        'Analytics completo',
        'Suporte prioritário',
        'Integração com CRM',
        'Múltiplos atendentes'
      ],
      cta: 'Escolher Plano Pro',
      href: '/plans?plan=pro',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Personalizado',
      period: '',
      description: 'Para grandes operações',
      icon: Target,
      features: [
        'Mensagens ilimitadas',
        'IA personalizada',
        'API completa',
        'Gerente de sucesso',
        'SLA garantido',
        'Treinamento da equipe'
      ],
      cta: 'Solicitar Orçamento',
      href: '/plans?plan=enterprise',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
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
      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 animate-gradient"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-4 py-1">
                <Star className="w-4 h-4 mr-2" />
                Sistema de Automação WhatsApp com IA
              </Badge>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-8">
              Humanize seu atendimento
              <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                {' '}com IA inteligente
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Transforme seu WhatsApp Business em um canal de vendas inteligente que mantém 
              o toque humano, constrói relacionamentos e multiplica seus resultados 24/7.
            </p>


            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link href="/plans">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-3">
                  Ver Planos e Começar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="https://wa.me/5511914858591?text=Olá! Gostaria de conhecer o ZecaBot" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="text-white bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white/20 text-lg px-8 py-3">
                  <Phone className="w-5 h-5 mr-2" />
                  Fale com o Zeca
                </Button>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-green-400 mb-2">{stat.number}</p>
                <p className="text-sm text-gray-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Desafios do atendimento tradicional
              </h2>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>Tempo de resposta lento pode afetar a satisfação do cliente</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>Equipe repetindo as mesmas respostas para perguntas frequentes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>Dificuldade em atender fora do horário comercial</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>Falta de métricas claras sobre o atendimento</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                A solução inteligente com <span className="text-green-400">ZecaBot</span>
              </h2>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <CheckCircle2 className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>Atendimento instantâneo e personalizado 24 horas por dia</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>IA que aprende e mantém o tom da sua marca</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>Aumento comprovado na satisfação e conversão</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>Dashboard completo com métricas e insights valiosos</span>
                </li>
              </ul>
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
                    <feature.icon className="w-8 h-8 text-green-400" />
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

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-gray-300">
              Depoimentos reais de quem já transformou seu atendimento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/10 border-white/20 hover:bg-white/15 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <CardTitle className="text-white">{testimonial.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {testimonial.business}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      {testimonial.revenue}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 italic">"{testimonial.message}"</p>
                  <div className="flex mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-black/30" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Planos flexíveis para seu negócio
            </h2>
            <p className="text-xl text-gray-300">
              Escolha o plano ideal e comece a transformar seu atendimento
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index}
                className={`relative bg-white/10 border-white/20 hover:bg-white/15 transition-all transform hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-green-500 scale-105' : ''
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
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl mx-auto mb-4">
                    <plan.icon className="w-8 h-8 text-green-400" />
                  </div>
                  <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-300 mb-4">
                    {plan.description}
                  </CardDescription>
                  <div className="flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-300 ml-1">
                      {plan.period}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href={plan.href} className="block">
                    <Button 
                      className={`w-full py-6 text-lg font-semibold ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg' 
                          : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-400 mb-4">
              Ainda tem dúvidas? Entre em contato
            </p>
            <a href="https://wa.me/5511914858591?text=Preciso de ajuda com o ZecaBot" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="text-white border-white/30 hover:bg-white/10">
                <Headphones className="w-5 h-5 mr-2" />
                Falar com o Zeca
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="py-16 bg-green-500/10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-16 h-16 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Garantia de Satisfação Total
          </h2>
          <p className="text-xl text-gray-300 mb-6">
            Teste nosso sistema por 7 dias gratuitamente.
            <span className="block text-green-400 font-semibold mt-2">
              Sem compromisso, cancele quando quiser.
            </span>
          </p>
          <Link href="/plans">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-6">
              Ver Planos e Começar Grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Pronto para transformar seu atendimento?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Junte-se a centenas de empresas que já humanizaram seu WhatsApp com IA
          </p>

          <Link href="/plans">
            <Button size="lg" className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-xl px-10 py-6 shadow-2xl transform hover:scale-105 transition-all">
              Escolher Meu Plano
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          </Link>

          <p className="text-sm text-gray-400 mt-6">
            Teste grátis por 7 dias • Suporte completo • Configuração simples
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">ZecaBot</p>
                <p className="text-xs text-gray-400">Humanizando vendas com IA</p>
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