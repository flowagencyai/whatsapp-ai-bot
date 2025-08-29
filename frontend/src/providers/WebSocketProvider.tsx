'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketMessage, BotStatus, DashboardStats, LogEntry, Conversation } from '@/types';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isConnected, isConnecting, error, connect, disconnect, on, off } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Global message handler
    const handleGlobalMessage = (message: WebSocketMessage) => {
      console.log('WebSocket message received:', message);
      
      // Dispatch custom events for different message types
      const event = new CustomEvent(`ws-${message.type}`, {
        detail: message.data
      });
      window.dispatchEvent(event);
    };

    // Bot status updates
    const handleBotStatus = (data: BotStatus) => {
      const event = new CustomEvent('bot-status-update', { detail: data });
      window.dispatchEvent(event);
    };

    // QR Code updates
    const handleQrCode = (data: { qrCode: string }) => {
      const event = new CustomEvent('qr-code-update', { detail: data });
      window.dispatchEvent(event);
    };

    // Dashboard stats updates
    const handleStats = (data: DashboardStats) => {
      const event = new CustomEvent('dashboard-stats-update', { detail: data });
      window.dispatchEvent(event);
    };

    // Log entries
    const handleLog = (data: LogEntry) => {
      const event = new CustomEvent('log-entry', { detail: data });
      window.dispatchEvent(event);
    };

    // Conversation updates
    const handleConversation = (data: Conversation) => {
      const event = new CustomEvent('conversation-update', { detail: data });
      window.dispatchEvent(event);
    };

    // Message updates
    const handleMessageUpdate = (data: any) => {
      const event = new CustomEvent('message-update', { detail: data });
      window.dispatchEvent(event);
    };

    // Register event handlers
    on('message', handleGlobalMessage);
    on('bot-status', handleBotStatus);
    on('qr-code', handleQrCode);
    on('dashboard-stats', handleStats);
    on('log-entry', handleLog);
    on('conversation-update', handleConversation);
    on('message-update', handleMessageUpdate);

    return () => {
      // Cleanup event handlers
      off('message', handleGlobalMessage);
      off('bot-status', handleBotStatus);
      off('qr-code', handleQrCode);
      off('dashboard-stats', handleStats);
      off('log-entry', handleLog);
      off('conversation-update', handleConversation);
      off('message-update', handleMessageUpdate);
    };
  }, [isConnected, on, off]);

  const value = {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}