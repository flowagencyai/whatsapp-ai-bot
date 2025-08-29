import { ApiResponse, BotStatus, Conversation, Message, LogEntry, DashboardStats, BotSettings } from '@/types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api/backend' 
  : 'http://localhost:3000/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Bot Status
  async getBotStatus(): Promise<ApiResponse<BotStatus>> {
    return this.request<BotStatus>('/bot-status');
  }

  async startBot(): Promise<ApiResponse<void>> {
    return this.request<void>('/bot/start', { method: 'POST' });
  }

  async stopBot(): Promise<ApiResponse<void>> {
    return this.request<void>('/bot/stop', { method: 'POST' });
  }

  async restartBot(): Promise<ApiResponse<void>> {
    return this.request<void>('/bot/restart', { method: 'POST' });
  }

  async pauseBot(duration?: number): Promise<ApiResponse<void>> {
    return this.request<void>('/bot/pause', {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  async resumeBot(): Promise<ApiResponse<void>> {
    return this.request<void>('/bot/resume', { method: 'POST' });
  }

  async getQrCode(): Promise<ApiResponse<{ qrCode: string; qrCodeVisual: string; qrCodeImage: string; isConnected: boolean }>> {
    return this.request<{ qrCode: string; qrCodeVisual: string; qrCodeImage: string; isConnected: boolean }>('/qr');
  }

  // Conversations
  async getConversations(page = 1, limit = 50): Promise<ApiResponse<{
    conversations: Conversation[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    return this.request<{
      conversations: Conversation[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/conversations?page=${page}&limit=${limit}`);
  }

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async pauseConversation(id: string, duration?: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/conversations/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  async resumeConversation(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/conversations/${id}/resume`, { method: 'POST' });
  }

  async endConversation(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/conversations/${id}/end`, { method: 'POST' });
  }

  async resetConversation(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/conversations/${id}/reset`, { method: 'POST' });
  }

  // Messages
  async getMessages(conversationId: string, page = 1, limit = 50): Promise<ApiResponse<{
    messages: Message[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    return this.request<{
      messages: Message[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  }

  async sendMessage(conversationId: string, content: string, type = 'text'): Promise<ApiResponse<Message>> {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async sendCommand(conversationId: string, command: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/conversations/${conversationId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  async getMessageStats(period = '24h'): Promise<ApiResponse<{
    labels: string[];
    data: number[];
    total: number;
  }>> {
    return this.request<{
      labels: string[];
      data: number[];
      total: number;
    }>(`/dashboard/messages?period=${period}`);
  }

  async getConversationStats(): Promise<ApiResponse<{
    active: number;
    paused: number;
    ended: number;
    total: number;
  }>> {
    return this.request<{
      active: number;
      paused: number;
      ended: number;
      total: number;
    }>('/dashboard/conversations');
  }

  // Logs
  async getLogs(page = 1, limit = 100, level?: string, category?: string): Promise<ApiResponse<{
    logs: LogEntry[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (level) params.append('level', level);
    if (category) params.append('category', category);
    
    return this.request<{
      logs: LogEntry[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/logs?${params.toString()}`);
  }

  async clearLogs(): Promise<ApiResponse<void>> {
    return this.request<void>('/logs', { method: 'DELETE' });
  }

  async exportLogs(format = 'json'): Promise<ApiResponse<{ url: string }>> {
    return this.request<{ url: string }>(`/logs/export?format=${format}`);
  }

  // Settings
  async getSettings(): Promise<ApiResponse<BotSettings>> {
    return this.request<BotSettings>('/settings');
  }

  async updateSettings(settings: Partial<BotSettings>): Promise<ApiResponse<BotSettings>> {
    return this.request<BotSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async resetSettings(): Promise<ApiResponse<BotSettings>> {
    return this.request<BotSettings>('/settings/reset', { method: 'POST' });
  }

  // System
  async getSystemInfo(): Promise<ApiResponse<{
    version: string;
    uptime: number;
    memory: { used: number; total: number };
    cpu: number;
    platform: string;
    nodeVersion: string;
  }>> {
    return this.request<{
      version: string;
      uptime: number;
      memory: { used: number; total: number };
      cpu: number;
      platform: string;
      nodeVersion: string;
    }>('/system/info');
  }

  async healthCheck(): Promise<ApiResponse<{
    status: string;
    timestamp: string;
    services: { [key: string]: 'healthy' | 'unhealthy' };
  }>> {
    return this.request<{
      status: string;
      timestamp: string;
      services: { [key: string]: 'healthy' | 'unhealthy' };
    }>('/system/health');
  }
}

export const api = new ApiClient();