'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCcw, Smartphone, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { useBotStatus } from '@/hooks/useBotStatus';

interface QRCodeDisplayProps {
  qrCode?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showInstructions?: boolean;
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export function QRCodeDisplay({
  qrCode,
  isLoading: propIsLoading,
  onRefresh,
  size = 'md',
  showInstructions = true,
}: QRCodeDisplayProps) {
  const { status, isLoading: hookIsLoading } = useBotStatus();
  const [copySuccess, setCopySuccess] = useState(false);

  const isLoading = propIsLoading || hookIsLoading;
  const displayQrCode = qrCode || status?.qrCodeVisual || status?.qrCode;
  const qrCodeImage = status?.qrCodeImage;

  const handleCopyQrCode = async () => {
    if (!displayQrCode) return;
    
    const success = await copyToClipboard(displayQrCode);
    setCopySuccess(success);
    
    if (success) {
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Smartphone className="h-6 w-6" />
            Carregando QR Code...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-64 mx-auto" />
          <div className="flex justify-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayQrCode && !qrCodeImage) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Smartphone className="h-6 w-6" />
            QR Code não disponível
          </CardTitle>
          <CardDescription>
            O bot está conectado ou o QR Code ainda não foi gerado.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Smartphone className="h-6 w-6" />
          Escaneie o QR Code
        </CardTitle>
        <CardDescription>
          Use o WhatsApp no seu celular para escanear este código
        </CardDescription>
        <div className="flex justify-center">
          <Badge variant="warning">Aguardando conexão</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg shadow-inner border">
            {qrCodeImage ? (
              <img 
                src={qrCodeImage} 
                alt="QR Code para conectar WhatsApp"
                className="w-64 h-64 mx-auto object-contain"
                style={{ imageRendering: 'crisp-edges', aspectRatio: '1/1' }}
              />
            ) : (
              <pre className={`qr-code ${sizeClasses[size]} leading-none`}>
                {displayQrCode}
              </pre>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={handleCopyQrCode} 
            variant="outline" 
            size="sm"
            disabled={copySuccess}
          >
            {copySuccess ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <h4 className="font-semibold">Como conectar:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Abra o WhatsApp no seu celular</li>
              <li>Toque em "Configurações" ou nos três pontos</li>
              <li>Selecione "Dispositivos conectados"</li>
              <li>Toque em "Conectar um dispositivo"</li>
              <li>Aponte a câmera para este QR Code</li>
            </ol>
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                ⚠️ Este QR Code expira em alguns minutos. Se não conseguir conectar, 
                clique em "Atualizar" para gerar um novo código.
              </p>
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="text-center text-xs text-muted-foreground">
          Última atualização: {new Date().toLocaleTimeString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}