'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { AdminStats } from '@/types';
import { 
  Server,
  Activity,
  Database,
  MessageSquare,
  Brain,
  CheckCircle,
  XCircle,
  RefreshCw,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';

export default function AdminSystem() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        api.getAdminStats(),
        api.getAdminHealth()
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (healthResponse.success && healthResponse.data) {
        setHealth(healthResponse.data);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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

  const getMemoryUsagePercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitor</h1>
          <p className="text-gray-600">Loading system information...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitor</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
        <Card className="p-6">
          <Button onClick={loadSystemData}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitor</h1>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        
        <Button
          onClick={loadSystemData}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Service Status Overview */}
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
            {stats && getServiceStatusBadge(stats.services.whatsapp)}
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
            {stats && getServiceStatusBadge(stats.services.langchain)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Redis Cache</p>
                <p className="text-lg font-semibold text-gray-900">Database</p>
              </div>
            </div>
            {stats && getServiceStatusBadge(stats.services.redis)}
          </div>
        </Card>
      </div>

      {stats && (
        <>
          {/* System Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <Monitor className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">System Uptime</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatUptime(stats.system.uptime)}
                  </p>
                  <p className="text-sm text-blue-600">Since last restart</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Version</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.system.version}</p>
                  <p className="text-sm text-green-600">{stats.system.nodeEnv}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <MemoryStick className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Heap Memory</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {getMemoryUsagePercentage(stats.system.memoryUsage.heapUsed, stats.system.memoryUsage.heapTotal)}%
                  </p>
                  <p className="text-sm text-purple-600">
                    {formatBytes(stats.system.memoryUsage.heapUsed)} / {formatBytes(stats.system.memoryUsage.heapTotal)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">RSS Memory</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatBytes(stats.system.memoryUsage.rss)}
                  </p>
                  <p className="text-sm text-orange-600">Resident Set Size</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Memory Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MemoryStick className="h-6 w-6 text-purple-600 mr-2" />
              Memory Usage Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                        Heap Used
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-purple-600">
                        {getMemoryUsagePercentage(stats.system.memoryUsage.heapUsed, stats.system.memoryUsage.heapTotal)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                    <div
                      style={{
                        width: `${getMemoryUsagePercentage(stats.system.memoryUsage.heapUsed, stats.system.memoryUsage.heapTotal)}%`
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                    ></div>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {formatBytes(stats.system.memoryUsage.heapUsed)}
                </p>
                <p className="text-xs text-gray-500">Used Heap</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {formatBytes(stats.system.memoryUsage.heapTotal)}
                </div>
                <p className="text-sm text-gray-500">Total Heap</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {formatBytes(stats.system.memoryUsage.rss)}
                </div>
                <p className="text-sm text-gray-500">RSS</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {formatBytes(stats.system.memoryUsage.external)}
                </div>
                <p className="text-sm text-gray-500">External</p>
              </div>
            </div>
          </Card>

          {/* Bot Performance Metrics */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-6 w-6 text-green-600 mr-2" />
              Bot Performance
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.bot.totalUsers}
                </div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.bot.activeUsers} active
                </p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.bot.totalMessages.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">Total Messages</p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.bot.messagesLast24h} last 24h
                </p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.ai.averageResponseTime.toFixed(0)}ms
                </div>
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="text-xs text-purple-600 mt-1">AI Processing</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {(stats.ai.successRate * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-xs text-orange-600 mt-1">AI Responses</p>
              </div>
            </div>
          </Card>

          {/* Service Health Details */}
          {health && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Server className="h-6 w-6 text-red-600 mr-2" />
                Service Health Details
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(health.services).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {service === 'whatsapp' && <MessageSquare className="h-6 w-6 text-green-600" />}
                          {service === 'langchain' && <Brain className="h-6 w-6 text-blue-600" />}
                          {service === 'redis' && <Database className="h-6 w-6 text-red-600" />}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 capitalize">{service}</p>
                          <p className="text-xs text-gray-500">Service Status</p>
                        </div>
                      </div>
                      {getServiceStatusBadge(status as 'healthy' | 'unhealthy')}
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Last Health Check:</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Auto-refresh indicator */}
      <div className="text-center text-xs text-gray-500">
        <Activity className="h-3 w-3 inline mr-1" />
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
}