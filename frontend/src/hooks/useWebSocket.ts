import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '@/types';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

export function useWebSocket({
  url = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000',
  autoConnect = true,
  reconnect = true,
  reconnectAttempts = 5,
  reconnectInterval = 1000,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const attemptReconnect = useCallback(() => {
    if (!reconnect || reconnectAttemptsRef.current >= reconnectAttempts) {
      setError(`Failed to connect after ${reconnectAttempts} attempts`);
      setIsConnecting(false);
      return;
    }

    reconnectAttemptsRef.current += 1;
    setError(`Reconnecting... (${reconnectAttemptsRef.current}/${reconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.connect();
      }
    }, reconnectInterval);
  }, [reconnect, reconnectAttempts, reconnectInterval]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    clearReconnectTimeout();

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      
      if (reason === 'io server disconnect') {
        setError('Server disconnected');
      } else if (reconnect) {
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnecting(false);
      setError(error.message);
      
      if (reconnect) {
        attemptReconnect();
      }
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      setError(error.message || 'WebSocket error occurred');
    });

    socketRef.current = socket;
  }, [url, reconnect, attemptReconnect, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    reconnectAttemptsRef.current = reconnectAttempts; // Prevent reconnection
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, [reconnectAttempts, clearReconnectTimeout]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit: WebSocket not connected');
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}