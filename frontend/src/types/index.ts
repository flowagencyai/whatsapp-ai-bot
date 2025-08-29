export interface BotStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'qr';
  qrCode?: string;
  qrCodeVisual?: string;
  qrCodeImage?: string;
  qrAvailable?: boolean;
  isConnected?: boolean;
  uptime?: number;
  lastUpdate?: string;
  timestamp?: string;
  user?: {
    name: string;
    number: string;
    profilePicture?: string;
  };
}

export interface Conversation {
  id: string;
  remoteJid: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  profilePicture?: string;
  status: 'active' | 'paused' | 'ended';
}

export interface Message {
  id: string;
  remoteJid: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'video';
  fromMe: boolean;
  mediaUrl?: string;
  fileName?: string;
  caption?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  category: string;
  data?: any;
}

export interface DashboardStats {
  totalConversations: number;
  activeConversations: number;
  pausedConversations: number;
  totalMessages: number;
  messagesLastHour: number;
  messagesLastDay: number;
  averageResponseTime: number;
  botUptime: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface BotSettings {
  autoResponse: boolean;
  responseDelay: number;
  maxConversationsPerHour: number;
  allowedNumbers: string[];
  blockedNumbers: string[];
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  welcomeMessage: string;
  awayMessage: string;
  commandPrefix: string;
}

export interface WebSocketMessage {
  type: 'status' | 'message' | 'conversation' | 'log' | 'qr' | 'stats';
  data: any;
  timestamp: string;
}

export interface ConversationFilter {
  status?: 'active' | 'paused' | 'ended';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  isGroup?: boolean;
}

export interface LogFilter {
  level?: 'info' | 'warning' | 'error' | 'debug';
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ChartData {
  name: string;
  value: number;
  timestamp?: string;
}

export interface BotCommand {
  command: string;
  description: string;
  usage: string;
  category: 'user' | 'admin' | 'system';
}

export interface NotificationSettings {
  enabled: boolean;
  newMessage: boolean;
  botDisconnected: boolean;
  errorOccurred: boolean;
  sound: boolean;
  desktop: boolean;
}