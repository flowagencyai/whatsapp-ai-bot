'use client';

import React from 'react';
import { QRCodeDisplay } from '@/components/qr-code/QRCodeDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCcw, Smartphone, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { useBotStatus } from '@/hooks/useBotStatus';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function QRCodePage() {
  const { status, isLoading, error, refetch, disconnect } = useBotStatus();

  const handleDisconnect = async () => {
    const success = await disconnect();
    if (success) {
      // Refresh to show new QR code after disconnect
      await refetch();
    }
  };

  const getConnectionStatus = () => {
    switch (status?.status) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Conectado com Sucesso!',
          description: 'Seu WhatsApp está conectado e funcionando.',
          variant: 'success' as const,
        };
      case 'connecting':
        return {
          icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
          title: 'Estabelecendo Conexão...',
          description: 'Conectando com os serviços do WhatsApp.',
          variant: 'warning' as const,
        };
      case 'qr':
        return {
          icon: <Smartphone className="h-5 w-5 text-blue-500" />,
          title: 'Pronto para Conectar',
          description: 'Escaneie o QR Code abaixo com seu WhatsApp.',
          variant: 'default' as const,
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          title: 'Desconectado',
          description: 'Bot não está conectado ao WhatsApp.',
          variant: 'error' as const,
        };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">QR Code</h1>
          <p className="text-muted-foreground">
            Conecte seu WhatsApp escaneando o código
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          {status?.status === 'connected' && (
            <Button onClick={handleDisconnect} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Erro de Conexão</span>
          </div>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus.icon}
            {connectionStatus.title}
          </CardTitle>
          <CardDescription>
            {connectionStatus.description}
          </CardDescription>
          <div className="flex gap-2">
            <Badge variant={connectionStatus.variant}>
              {status?.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
            {status?.lastUpdate && (
              <Badge variant="outline">
                Atualizado {formatRelativeTime(status.lastUpdate)}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* QR Code Display */}
      <QRCodeDisplay
        qrCode={status?.qrCode}
        isLoading={isLoading}
        onRefresh={refetch}
        size="lg"
        showInstructions={true}
      />

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instruções Detalhadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Para Android:</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Abra o WhatsApp</li>
                <li>Toque nos três pontos (menu)</li>
                <li>Selecione "Dispositivos conectados"</li>
                <li>Toque em "Conectar um dispositivo"</li>
                <li>Escaneie este QR Code</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Para iPhone:</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Abra o WhatsApp</li>
                <li>Toque em "Configurações"</li>
                <li>Selecione "Dispositivos conectados"</li>
                <li>Toque em "Conectar um dispositivo"</li>
                <li>Escaneie este QR Code</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Tempo Limite</p>
                  <p className="text-xs text-muted-foreground">
                    O QR Code expira em alguns minutos. Atualize se necessário.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Múltiplos Dispositivos</p>
                  <p className="text-xs text-muted-foreground">
                    Você pode ter até 4 dispositivos conectados simultaneamente.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Segurança</p>
                  <p className="text-xs text-muted-foreground">
                    A conexão é criptografada e segura.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Notificações</p>
                  <p className="text-xs text-muted-foreground">
                    Notificações continuarão aparecendo no seu celular.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debug Info</CardTitle>
            <CardDescription>
              Informações técnicas (apenas em desenvolvimento)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(status, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}