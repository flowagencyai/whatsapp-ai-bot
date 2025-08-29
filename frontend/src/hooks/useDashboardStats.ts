import { useState, useEffect, useCallback } from 'react';
import { DashboardStats, WebSocketMessage } from '@/types';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { socket, isConnected } = useWebSocket();

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.getDashboardStats();
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch dashboard stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = (message: WebSocketMessage) => {
      if (message.type === 'stats' && message.data) {
        setStats(message.data);
      }
    };

    socket.on('dashboard-stats', handleStatsUpdate);

    return () => {
      socket.off('dashboard-stats', handleStatsUpdate);
    };
  }, [socket]);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchStats();
    
    // Periodic updates every 30 seconds if WebSocket is not connected
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchStats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats, isConnected]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}