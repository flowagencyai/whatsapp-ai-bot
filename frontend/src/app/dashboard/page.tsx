'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageCircle, 
  Users, 
  BarChart3, 
  Activity,
  TrendingUp,
  Clock,
  Smartphone,
  Bot,
  LogOut,
  RefreshCcw,
  ExternalLink,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalMessages: 147,
    activeConversations: 12,
    averageResponseTime: 2.3,
    botStatus: 'connected',
    messagesLastHour: 23,
    successRate: 94.5
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento de dados reais
    const loadStats = async () => {
      setIsLoading(true);
      try {
        // Aqui você faria a chamada real para a API
        // const response = await api.getUserStats();
        // setStats(response.data);
        
        // Simulação de delay para mostrar loading
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simular refresh dos dados
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const StatCard = ({ title, value, description, icon: Icon, color, trend }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <div className="h-8 bg-muted animate-pulse rounded w-16" />
          ) : (
            value
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
        {trend && !isLoading && (
          <div className="flex items-center mt-2 text-xs">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-green-600">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">WhatsApp Bot Dashboard</h1>
                  <p className="text-xs text-gray-500">Painel do Usuário</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                
                {user && (
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.role === 'viewer' ? 'Usuário' : user.role}
                      </p>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sair
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vindo, {user?.username}! 👋
            </h2>
            <p className="text-gray-600">
              Aqui você pode acompanhar as estatísticas e atividades do seu bot WhatsApp.
            </p>
          </div>

          {/* Bot Status */}
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-green-800">
                      <Smartphone className="w-5 h-5 mr-2" />
                      Status do Bot
                    </CardTitle>
                    <CardDescription className="text-green-700">
                      Monitoramento em tempo real
                    </CardDescription>
                  </div>
                  <Badge variant="success" className="bg-green-100 text-green-800">
                    {isLoading ? 'Verificando...' : 'Online'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {isLoading ? '...' : '✓'}
                    </div>
                    <p className="text-sm text-green-700">WhatsApp Conectado</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {isLoading ? '...' : stats.averageResponseTime + 's'}
                    </div>
                    <p className="text-sm text-blue-700">Tempo de Resposta</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {isLoading ? '...' : stats.successRate + '%'}
                    </div>
                    <p className="text-sm text-purple-700">Taxa de Sucesso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total de Mensagens"
              value={stats.totalMessages}
              description="Mensagens processadas hoje"
              icon={MessageCircle}
              color="text-blue-500"
              trend="+12% desde ontem"
            />
            
            <StatCard
              title="Conversas Ativas"
              value={stats.activeConversations}
              description="Conversas em andamento"
              icon={Users}
              color="text-green-500"
              trend="+3 novas conversas"
            />
            
            <StatCard
              title="Mensagens/Hora"
              value={stats.messagesLastHour}
              description="Última hora"
              icon={Clock}
              color="text-orange-500"
              trend="Estável"
            />
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  Atividade Recente
                </CardTitle>
                <CardDescription>
                  Últimas interações do bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-muted animate-pulse rounded-full" />
                        <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                        <div className="w-16 h-4 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="flex-1">Mensagem processada com sucesso</span>
                      <span className="text-xs text-muted-foreground">2min</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="flex-1">Nova conversa iniciada</span>
                      <span className="text-xs text-muted-foreground">5min</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span className="flex-1">Áudio transcrito automaticamente</span>
                      <span className="text-xs text-muted-foreground">8min</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span className="flex-1">Imagem analisada pela IA</span>
                      <span className="text-xs text-muted-foreground">12min</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="flex-1">Resposta enviada ao cliente</span>
                      <span className="text-xs text-muted-foreground">15min</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-green-500" />
                  Performance
                </CardTitle>
                <CardDescription>
                  Métricas de desempenho
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between">
                          <div className="w-24 h-4 bg-muted animate-pulse rounded" />
                          <div className="w-16 h-4 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="w-full h-2 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Resposta</span>
                        <span className="font-medium">{stats.successRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${stats.successRate}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Conversas Ativas</span>
                        <span className="font-medium">{stats.activeConversations}/50</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(stats.activeConversations / 50) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Utilização</span>
                        <span className="font-medium">76%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: '76%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Acesso Rápido</CardTitle>
                <CardDescription>
                  Links úteis para usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/conversations" className="block">
                    <Button variant="outline" className="w-full h-auto p-4">
                      <div className="text-center">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <div className="font-medium">Conversas</div>
                        <div className="text-xs text-muted-foreground">
                          Ver todas as conversas
                        </div>
                      </div>
                    </Button>
                  </Link>
                  
                  <Link href="/qr" className="block">
                    <Button variant="outline" className="w-full h-auto p-4">
                      <div className="text-center">
                        <Eye className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <div className="font-medium">QR Code</div>
                        <div className="text-xs text-muted-foreground">
                          Visualizar QR Code
                        </div>
                      </div>
                    </Button>
                  </Link>
                  
                  <Button variant="outline" className="w-full h-auto p-4" disabled>
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <div className="font-medium text-gray-400">Relatórios</div>
                      <div className="text-xs text-gray-400">
                        Em breve
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}