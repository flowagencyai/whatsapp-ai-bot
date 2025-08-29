'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Circle, 
  Play, 
  Square, 
  RotateCcw, 
  Pause, 
  PlayCircle, 
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { BotStatus } from '@/types';
import { getStatusColor, formatRelativeTime } from '@/lib/utils';

interface StatusCardProps {
  status: BotStatus | null;
  isLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function StatusCard({
  status,
  isLoading,
  onStart,
  onStop,
  onRestart,
  onPause,
  onResume,
}: StatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: BotStatus['status']) => {
    switch (status) {
      case 'connected':
        return {
          label: 'Conectado',
          color: 'success',
          icon: <Wifi className="h-5 w-5 text-green-500" />,
          description: 'Bot online e operando normalmente',
        };
      case 'connecting':
        return {
          label: 'Conectando',
          color: 'warning',
          icon: <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />,
          description: 'Estabelecendo conexão com WhatsApp',
        };
      case 'disconnected':
        return {
          label: 'Desconectado',
          color: 'error',
          icon: <WifiOff className="h-5 w-5 text-red-500" />,
          description: 'Bot offline - necessário reconectar',
        };
      case 'qr':
        return {
          label: 'Aguardando QR',
          color: 'warning',
          icon: <Circle className="h-5 w-5 text-yellow-500" />,
          description: 'Escaneie o QR Code para autenticar',
        };
      default:
        return {
          label: 'Desconhecido',
          color: 'secondary',
          icon: <Circle className="h-5 w-5 text-gray-500" />,
          description: 'Status indeterminado',
        };
    }
  };

  const statusInfo = getStatusInfo(status?.status || 'disconnected');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusInfo.icon}
            Status do Bot
          </div>
          <Badge variant={statusInfo.color as any}>
            {statusInfo.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {statusInfo.description}
          </p>
          
          {status?.user && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{status.user.name}</p>
              <p className="text-xs text-muted-foreground">{status.user.number}</p>
            </div>
          )}
          
          {status?.lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Última atualização: {formatRelativeTime(status.lastUpdate)}
            </p>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2">
          {status?.status === 'disconnected' && (
            <Button onClick={onStart} size="sm" variant="whatsapp">
              <Play className="h-4 w-4 mr-1" />
              Iniciar
            </Button>
          )}
          
          {status?.status === 'connected' && (
            <>
              <Button onClick={onStop} size="sm" variant="destructive">
                <Square className="h-4 w-4 mr-1" />
                Parar
              </Button>
              <Button onClick={onPause} size="sm" variant="outline">
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
            </>
          )}
          
          {status?.status === 'connecting' && (
            <Button onClick={onStop} size="sm" variant="outline">
              <Square className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
          
          <Button onClick={onRestart} size="sm" variant="outline">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
          
          <Button onClick={onResume} size="sm" variant="outline">
            <PlayCircle className="h-4 w-4 mr-1" />
            Retomar
          </Button>
        </div>

        {/* Additional Info */}
        {status?.status === 'qr' && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              📱 QR Code disponível na página específica para autenticação
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}