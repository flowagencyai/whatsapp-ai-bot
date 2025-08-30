'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { AdminStats } from '@/types';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  Server,
  Activity,
  Database,
  Brain,
  CheckCircle,
  XCircle,
  BarChart3,
  Shield,
  TrendingUp,
  RefreshCcw,
  Smartphone,
  Settings
} from 'lucide-react';

export default function AdminDashboard() {
  return (
    <AdminDashboardContent />
  );
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminStats();
      if (response.success && response.data) {
        setStats(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to load statistics');
      }
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getServiceStatusBadge = (status: 'healthy' | 'unhealthy') => {
    return status === 'healthy' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Healthy
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Unhealthy
      </Badge>
    );
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Administrativo</h1>
          <p className="text-gray-600">Carregando estatísticas do sistema...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Administrativo</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <p className="text-gray-600">Não foi possível carregar os dados</p>
            </div>
            <Button onClick={loadStats} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
          Visão Geral do Sistema
        </h1>
        <p className="text-gray-600">
          Estatísticas e métricas em tempo real do ZecaBot
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-end mb-6">
          <Button onClick={loadStats} disabled={loading} variant="outline" size="sm">
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        </div>

          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Atividade</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatUptime(stats.system.uptime)}</div>
                <p className="text-xs text-muted-foreground">Sistema online</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.bot.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stats.bot.activeUsers} ativos</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
                <MessageSquare className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.bot.totalMessages.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-purple-600">{stats.bot.messagesLast24h} nas últimas 24h</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uso de Memória</CardTitle>
                <Database className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(stats.system.memoryUsage.heapUsed)}</div>
                <p className="text-xs text-muted-foreground">
                  de {formatBytes(stats.system.memoryUsage.heapTotal)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Services Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-500" />
                Status dos Serviços
              </CardTitle>
              <CardDescription>
                Monitoramento em tempo real dos componentes do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">WhatsApp</p>
                      <p className="text-sm text-gray-500">Conexão</p>
                    </div>
                  </div>
                  {getServiceStatusBadge(stats.services.whatsapp)}
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Brain className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-900">LangChain AI</p>
                      <p className="text-sm text-gray-500">Serviço de IA</p>
                    </div>
                  </div>
                  {getServiceStatusBadge(stats.services.langchain)}
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Server className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Redis Cache</p>
                      <p className="text-sm text-gray-500">Banco de Dados</p>
                    </div>
                  </div>
                  {getServiceStatusBadge(stats.services.redis)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 text-blue-600 mr-2" />
                Performance da IA
              </CardTitle>
              <CardDescription>
                Métricas de desempenho do sistema de inteligência artificial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Tokens</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.ai.totalTokens.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tempo Médio</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.ai.averageResponseTime.toFixed(0)}ms
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {(stats.ai.successRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 text-gray-600 mr-2" />
                Informações do Sistema
              </CardTitle>
              <CardDescription>
                Detalhes técnicos e configurações do ambiente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Versão</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.system.version}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Ambiente</p>
                  <p className="text-lg font-semibold text-gray-900">
                    <Badge variant={stats.system.nodeEnv === 'production' ? 'default' : 'secondary'}>
                      {stats.system.nodeEnv}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Memória RSS</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatBytes(stats.system.memoryUsage.rss)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Memória Externa</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatBytes(stats.system.memoryUsage.external)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}