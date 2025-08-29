'use client';

import React, { useState } from 'react';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { QRCodeDisplay } from '@/components/qr-code/QRCodeDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCcw, 
  ExternalLink,
  Activity,
  Clock,
  MessageCircle,
  AlertTriangle,
  Plus,
  Smartphone,
  QrCode,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
  Eye
} from 'lucide-react';
import { useBotStatus } from '@/hooks/useBotStatus';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const [instances, setInstances] = useState([
    {
      id: 'default',
      name: 'Instância Principal',
      status: 'disconnected',
      qrCode: null,
      isGeneratingQr: false,
      phoneNumber: null,
      lastActivity: null,
    }
  ]);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  
  const { 
    status, 
    isLoading: statusLoading, 
    error: statusError,
    startBot, 
    stopBot, 
    restartBot, 
    pauseBot, 
    resumeBot,
    refetch: refetchStatus 
  } = useBotStatus();
  
  const { 
    stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useDashboardStats();

  const handleRefresh = async () => {
    await Promise.all([
      refetchStatus(),
      refetchStats()
    ]);
  };

  const handleCreateInstance = async () => {
    setIsCreatingInstance(true);
    try {
      const newInstance = {
        id: `instance_${Date.now()}`,
        name: `Instância ${instances.length + 1}`,
        status: 'disconnected',
        qrCode: null,
        isGeneratingQr: false,
        phoneNumber: null,
        lastActivity: null,
      };
      setInstances(prev => [...prev, newInstance]);
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const handleGenerateQR = async (instanceId: string) => {
    setInstances(prev => prev.map(instance => 
      instance.id === instanceId 
        ? { ...instance, isGeneratingQr: true }
        : instance
    ));

    try {
      // Chamada para backend para gerar QR
      const response = await fetch('/api/backend/qr');
      const data = await response.json();
      
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { 
              ...instance, 
              qrCode: data.qrCodeVisual || data.qrCode, // Prioriza visual se disponível
              status: 'qr_generated',
              isGeneratingQr: false 
            }
          : instance
      ));
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, isGeneratingQr: false }
          : instance
      ));
    }
  };

  const handleStartInstance = async (instanceId: string) => {
    setInstances(prev => prev.map(instance => 
      instance.id === instanceId 
        ? { ...instance, status: 'starting' }
        : instance
    ));

    try {
      // Simular start da instância
      setTimeout(() => {
        setInstances(prev => prev.map(instance => 
          instance.id === instanceId 
            ? { ...instance, status: 'connected', lastActivity: new Date().toISOString() as any }
            : instance
        ));
      }, 2000);
    } catch (error) {
      console.error('Erro ao iniciar instância:', error);
    }
  };

  const handleStopInstance = async (instanceId: string) => {
    setInstances(prev => prev.map(instance => 
      instance.id === instanceId 
        ? { ...instance, status: 'disconnected', qrCode: null }
        : instance
    ));
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (instanceId === 'default') return; // Não permite deletar instância principal
    setInstances(prev => prev.filter(instance => instance.id !== instanceId));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema WhatsApp Bot
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Link href="/qr">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver QR Code
            </Button>
          </Link>
        </div>
      </div>

      {/* WhatsApp Instances Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Instâncias WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie múltiplas conexões WhatsApp
            </p>
          </div>
          <Button 
            onClick={handleCreateInstance} 
            disabled={isCreatingInstance}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreatingInstance ? 'Criando...' : 'Nova Instância'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <Card key={instance.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <CardTitle className="text-sm">{instance.name}</CardTitle>
                  </div>
                  <Badge 
                    variant={
                      instance.status === 'connected' ? 'success' : 
                      instance.status === 'qr_generated' ? 'warning' :
                      instance.status === 'starting' ? 'info' :
                      'error'
                    }
                    className="text-xs"
                  >
                    {instance.status === 'connected' ? 'Conectado' :
                     instance.status === 'qr_generated' ? 'QR Gerado' :
                     instance.status === 'starting' ? 'Iniciando...' :
                     'Desconectado'}
                  </Badge>
                </div>
                {instance.phoneNumber && (
                  <CardDescription className="text-xs">
                    {instance.phoneNumber}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* QR Code Preview */}
                {instance.qrCode && instance.status === 'qr_generated' && (
                  <div className="bg-white p-2 rounded border">
                    <div className="flex items-center justify-center overflow-hidden">
                      <pre className="text-xs leading-none font-mono text-black">
                        {(instance.qrCode as string)?.split('\n').slice(0, 15).join('\n')}
                        {instance.qrCode && (instance.qrCode as string).split('\n').length > 15 && '\n...'}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Instance Status Info */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>{instance.status === 'connected' ? 'Online' : 'Offline'}</span>
                  </div>
                  {instance.lastActivity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última atividade:</span>
                      <span>{formatRelativeTime(instance.lastActivity)}</span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {instance.status === 'disconnected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateQR(instance.id)}
                      disabled={instance.isGeneratingQr}
                      className="flex-1 min-w-0"
                    >
                      <QrCode className="h-3 w-3 mr-1" />
                      {instance.isGeneratingQr ? 'Gerando...' : 'Gerar QR'}
                    </Button>
                  )}
                  
                  {instance.status === 'qr_generated' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartInstance(instance.id)}
                      className="flex-1 min-w-0"
                    >
                      <Power className="h-3 w-3 mr-1" />
                      Conectar
                    </Button>
                  )}
                  
                  {instance.status === 'connected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStopInstance(instance.id)}
                      className="flex-1 min-w-0"
                    >
                      <PowerOff className="h-3 w-3 mr-1" />
                      Desconectar
                    </Button>
                  )}
                  
                  {instance.qrCode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      className="min-w-0"
                    >
                      <Link href={`/qr?instance=${instance.id}`}>
                        <Eye className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  
                  {instance.id !== 'default' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteInstance(instance.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 min-w-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Error Messages */}
      {(statusError || statsError) && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Erro de Conexão</span>
          </div>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {statusError || statsError}
          </p>
        </div>
      )}

      {/* Status and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatusCard
            status={status}
            isLoading={statusLoading}
            onStart={startBot}
            onStop={stopBot}
            onRestart={restartBot}
            onPause={pauseBot}
            onResume={resumeBot}
          />
        </div>
        
        {/* Quick QR Code Preview */}
        <div className="space-y-4">
          {status?.status === 'qr' && status.qrCode ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  QR Code Disponível
                </CardTitle>
                <CardDescription>
                  Escaneie para conectar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-2 rounded border mb-3">
                  <pre className="qr-code text-xs leading-none">
                    {status.qrCode.split('\n').slice(0, 20).join('\n')}
                    {status.qrCode.split('\n').length > 20 && '\n...'}
                  </pre>
                </div>
                <Link href="/qr">
                  <Button size="sm" className="w-full">
                    Ver QR Code Completo
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sistema Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bot Status</span>
                  <Badge variant={status?.status === 'connected' ? 'success' : 'error'}>
                    {status?.status === 'connected' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Última Atualização</span>
                  <span className="text-xs">
                    {status?.lastUpdate ? formatRelativeTime(status.lastUpdate) : 'N/A'}
                  </span>
                </div>
                
                {status?.user && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium">{status.user.name}</p>
                    <p className="text-xs text-muted-foreground">{status.user.number}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Estatísticas</h2>
        <StatsCards stats={stats} isLoading={statsLoading} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Últimas ações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="flex-1">Sistema iniciado</span>
                  <span className="text-xs text-muted-foreground">2min</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="flex-1">WebSocket conectado</span>
                  <span className="text-xs text-muted-foreground">5min</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="flex-1">QR Code gerado</span>
                  <span className="text-xs text-muted-foreground">10min</span>
                </div>
                <div className="text-center pt-4">
                  <Link href="/logs">
                    <Button variant="outline" size="sm">
                      Ver Todos os Logs
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>
              Métricas de desempenho
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tempo de Resposta</span>
                    <span className="font-medium">
                      {stats?.averageResponseTime?.toFixed(1) || 0}s
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ 
                        width: `${Math.min((stats?.averageResponseTime || 0) / 10 * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mensagens por Hora</span>
                    <span className="font-medium">
                      {stats?.messagesLastHour || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all"
                      style={{ 
                        width: `${Math.min((stats?.messagesLastHour || 0) / 100 * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Conversas Ativas</span>
                    <span className="font-medium">
                      {stats?.activeConversations || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all"
                      style={{ 
                        width: `${Math.min((stats?.activeConversations || 0) / 50 * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}