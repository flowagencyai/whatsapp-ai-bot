'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { AdminStats } from '@/types';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  Server,
  Activity,
  Database,
  Brain,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminStats();
      if (response.success && response.data) {
        setStats(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to load statistics');
      }
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getServiceStatusBadge = (status: 'healthy' | 'unhealthy') => {
    return status === 'healthy' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Healthy
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Unhealthy
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Loading system statistics...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
        <Card className="p-6">
          <button 
            onClick={loadStats}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and statistics</p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">System Uptime</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatUptime(stats.system.uptime)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.bot.totalUsers}
              </p>
              <p className="text-sm text-green-600">
                {stats.bot.activeUsers} active
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Messages</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.bot.totalMessages.toLocaleString()}
              </p>
              <p className="text-sm text-purple-600">
                {stats.bot.messagesLast24h} last 24h
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Database className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Memory Usage</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatBytes(stats.system.memoryUsage.heapUsed)}
              </p>
              <p className="text-sm text-orange-600">
                / {formatBytes(stats.system.memoryUsage.heapTotal)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">WhatsApp</p>
                <p className="text-lg font-semibold text-gray-900">Connection</p>
              </div>
            </div>
            {getServiceStatusBadge(stats.services.whatsapp)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">LangChain AI</p>
                <p className="text-lg font-semibold text-gray-900">Service</p>
              </div>
            </div>
            {getServiceStatusBadge(stats.services.langchain)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Redis Cache</p>
                <p className="text-lg font-semibold text-gray-900">Database</p>
              </div>
            </div>
            {getServiceStatusBadge(stats.services.redis)}
          </div>
        </Card>
      </div>

      {/* AI Statistics */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Brain className="h-6 w-6 text-blue-600 mr-2" />
          AI Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Tokens</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.ai.totalTokens.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.ai.averageResponseTime.toFixed(0)}ms
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Success Rate</p>
            <p className="text-2xl font-semibold text-gray-900">
              {(stats.ai.successRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="h-6 w-6 text-green-600 mr-2" />
          System Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Version</p>
            <p className="text-lg font-semibold text-gray-900">{stats.system.version}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Environment</p>
            <p className="text-lg font-semibold text-gray-900">{stats.system.nodeEnv}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">RSS Memory</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatBytes(stats.system.memoryUsage.rss)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">External Memory</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatBytes(stats.system.memoryUsage.external)}
            </p>
          </div>
        </div>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadStats}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Activity className="h-4 w-4 mr-2" />
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>
    </div>
  );
}