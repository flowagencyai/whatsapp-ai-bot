import { useState, useEffect, useCallback } from 'react';
import { BotStatus, WebSocketMessage } from '@/types';
import { api } from '@/lib/api';
// import { useWebSocket } from './useWebSocket'; // Disabled - backend has no Socket.IO

interface UseBotStatusReturn {
  status: BotStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  startBot: () => Promise<void>;
  stopBot: () => Promise<void>;
  restartBot: () => Promise<void>;
  pauseBot: (duration?: number) => Promise<void>;
  resumeBot: () => Promise<void>;
  disconnect: () => Promise<boolean>;
}

export function useBotStatus(): UseBotStatusReturn {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // const { socket, isConnected } = useWebSocket(); // Disabled - backend has no Socket.IO
  const socket = null;
  const isConnected = false;

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Delay pequeno para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const [statusResponse, qrResponse] = await Promise.all([
        api.getBotStatus(),
        api.getQrCode()
      ]);
      
      if (statusResponse.success) {
        const statusData: BotStatus = {
          status: (statusResponse as any).status || 'disconnected',
          qrAvailable: (statusResponse as any).qrAvailable || false,
          uptime: (statusResponse as any).uptime || 0,
          timestamp: (statusResponse as any).timestamp || new Date().toISOString()
        };
        
        // Merge QR data if available
        if (qrResponse.success) {
          statusData.qrCode = (qrResponse as any).qrCode;
          statusData.qrCodeVisual = (qrResponse as any).qrCodeVisual;
          statusData.qrCodeImage = (qrResponse as any).qrCodeImage;
          statusData.isConnected = (qrResponse as any).isConnected;
        }
        
        setStatus(statusData);
        setRetryCount(0); // Reset retry count on success
      } else {
        setError(statusResponse.error || 'Failed to fetch bot status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
      
      // Se muitos erros, aumentar intervalo
      if (retryCount > 3) {
        console.warn('Muitos erros de API, reduzindo frequência de polling');
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  const startBot = useCallback(async () => {
    try {
      setError(null);
      const response = await api.startBot();
      
      if (!response.success) {
        setError(response.error || 'Failed to start bot');
      } else {
        // Status will be updated via WebSocket
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start bot');
    }
  }, [fetchStatus]);

  const stopBot = useCallback(async () => {
    try {
      setError(null);
      const response = await api.stopBot();
      
      if (!response.success) {
        setError(response.error || 'Failed to stop bot');
      } else {
        // Status will be updated via WebSocket
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop bot');
    }
  }, [fetchStatus]);

  const restartBot = useCallback(async () => {
    try {
      setError(null);
      const response = await api.restartBot();
      
      if (!response.success) {
        setError(response.error || 'Failed to restart bot');
      } else {
        // Status will be updated via WebSocket
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart bot');
    }
  }, [fetchStatus]);

  const pauseBot = useCallback(async (duration?: number) => {
    try {
      setError(null);
      const response = await api.pauseBot(duration);
      
      if (!response.success) {
        setError(response.error || 'Failed to pause bot');
      } else {
        // Status will be updated via WebSocket
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause bot');
    }
  }, [fetchStatus]);

  const resumeBot = useCallback(async () => {
    try {
      setError(null);
      const response = await api.resumeBot();
      
      if (!response.success) {
        setError(response.error || 'Failed to resume bot');
      } else {
        // Status will be updated via WebSocket
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume bot');
    }
  }, [fetchStatus]);

  const disconnect = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3000/api/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }
      
      const result = await response.json();
      if (result.success) {
        // Refresh status after disconnect
        await fetchStatus();
        return true;
      } else {
        throw new Error(result.message || 'Disconnect failed');
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      return false;
    }
  }, [fetchStatus]);

  // WebSocket event handlers - Disabled (backend has no Socket.IO)
  // useEffect(() => {
  //   if (!socket) return;
  //   // ... WebSocket handlers removed
  // }, [socket]);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchStatus();
    
    // Dynamic polling interval based on retry count
    const getPollingInterval = () => {
      if (retryCount > 3) return 30000; // 30 seconds if many errors
      if (retryCount > 1) return 20000; // 20 seconds if some errors
      return 15000; // 15 seconds normal
    };
    
    const interval = setInterval(() => {
      fetchStatus();
    }, getPollingInterval());

    return () => clearInterval(interval);
  }, [fetchStatus, retryCount]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    startBot,
    stopBot,
    restartBot,
    pauseBot,
    resumeBot,
    disconnect,
  };
}