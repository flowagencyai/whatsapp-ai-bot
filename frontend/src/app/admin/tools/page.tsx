'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { 
  Wrench,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  MessageSquare,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function AdminTools() {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{ [key: string]: any }>({});

  const setToolLoading = (tool: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [tool]: isLoading }));
  };

  const setToolResult = (tool: string, result: any) => {
    setResults(prev => ({ ...prev, [tool]: result }));
  };

  const handleBackupConfig = async () => {
    try {
      setToolLoading('backup', true);
      const response = await api.createAdminConfigBackup();
      if (response.success) {
        setToolResult('backup', {
          success: true,
          message: `Backup created successfully`,
          details: response.data
        });
      } else {
        setToolResult('backup', {
          success: false,
          message: response.error || 'Backup failed'
        });
      }
    } catch (err) {
      setToolResult('backup', {
        success: false,
        message: `Backup failed: ${err}`
      });
    } finally {
      setToolLoading('backup', false);
    }
  };

  const handleResetConfig = async () => {
    if (!confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
      return;
    }

    try {
      setToolLoading('reset', true);
      const response = await api.resetAdminConfig('admin-tools');
      if (response.success) {
        setToolResult('reset', {
          success: true,
          message: 'Configuration reset to defaults successfully'
        });
      } else {
        setToolResult('reset', {
          success: false,
          message: response.error || 'Reset failed'
        });
      }
    } catch (err) {
      setToolResult('reset', {
        success: false,
        message: `Reset failed: ${err}`
      });
    } finally {
      setToolLoading('reset', false);
    }
  };

  const handleClearAllMemories = async () => {
    if (!confirm('Are you sure you want to clear ALL user memories? This will delete all conversation history and cannot be undone.')) {
      return;
    }

    try {
      setToolLoading('clearMemories', true);
      const response = await api.performBulkAction({
        action: 'clear_memory',
        admin: 'admin-tools'
      });
      if (response.success) {
        setToolResult('clearMemories', {
          success: true,
          message: 'All memories cleared successfully',
          details: response.data
        });
      } else {
        setToolResult('clearMemories', {
          success: false,
          message: response.error || 'Clear memories failed'
        });
      }
    } catch (err) {
      setToolResult('clearMemories', {
        success: false,
        message: `Clear memories failed: ${err}`
      });
    } finally {
      setToolLoading('clearMemories', false);
    }
  };

  const handlePauseAllUsers = async () => {
    if (!confirm('Are you sure you want to pause ALL active users for 1 hour?')) {
      return;
    }

    try {
      setToolLoading('pauseAll', true);
      const response = await api.performBulkAction({
        action: 'pause_users',
        duration: 3600000, // 1 hour
        admin: 'admin-tools'
      });
      if (response.success) {
        setToolResult('pauseAll', {
          success: true,
          message: 'All users paused successfully',
          details: response.data
        });
      } else {
        setToolResult('pauseAll', {
          success: false,
          message: response.error || 'Pause all users failed'
        });
      }
    } catch (err) {
      setToolResult('pauseAll', {
        success: false,
        message: `Pause all users failed: ${err}`
      });
    } finally {
      setToolLoading('pauseAll', false);
    }
  };

  const handleResumeAllUsers = async () => {
    if (!confirm('Are you sure you want to resume ALL paused users?')) {
      return;
    }

    try {
      setToolLoading('resumeAll', true);
      const response = await api.performBulkAction({
        action: 'resume_users',
        admin: 'admin-tools'
      });
      if (response.success) {
        setToolResult('resumeAll', {
          success: true,
          message: 'All users resumed successfully',
          details: response.data
        });
      } else {
        setToolResult('resumeAll', {
          success: false,
          message: response.error || 'Resume all users failed'
        });
      }
    } catch (err) {
      setToolResult('resumeAll', {
        success: false,
        message: `Resume all users failed: ${err}`
      });
    } finally {
      setToolLoading('resumeAll', false);
    }
  };

  const handleTestBotConnection = async () => {
    try {
      setToolLoading('testBot', true);
      const response = await api.getBotStatus();
      if (response.success) {
        setToolResult('testBot', {
          success: response.data?.isConnected || false,
          message: response.data?.isConnected ? 'Bot is connected and healthy' : 'Bot is disconnected',
          details: response.data
        });
      } else {
        setToolResult('testBot', {
          success: false,
          message: response.error || 'Bot status check failed'
        });
      }
    } catch (err) {
      setToolResult('testBot', {
        success: false,
        message: `Bot test failed: ${err}`
      });
    } finally {
      setToolLoading('testBot', false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      setToolLoading('health', true);
      const response = await api.getAdminHealth();
      if (response.success) {
        const allHealthy = response.data?.services && 
          Object.values(response.data.services).every(status => status === 'healthy');
        
        setToolResult('health', {
          success: allHealthy,
          message: allHealthy ? 'All services are healthy' : 'Some services are unhealthy',
          details: response.data
        });
      } else {
        setToolResult('health', {
          success: false,
          message: response.error || 'Health check failed'
        });
      }
    } catch (err) {
      setToolResult('health', {
        success: false,
        message: `Health check failed: ${err}`
      });
    } finally {
      setToolLoading('health', false);
    }
  };

  const renderResult = (toolKey: string) => {
    const result = results[toolKey];
    if (!result) return null;

    return (
      <div className={`mt-3 p-3 rounded-md text-sm ${
        result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}>
        <div className="flex items-center">
          {result.success ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : (
            <AlertTriangle className="h-4 w-4 mr-2" />
          )}
          <span className="font-medium">{result.message}</span>
        </div>
        {result.details && (
          <div className="mt-2 text-xs font-mono bg-white bg-opacity-50 p-2 rounded">
            {JSON.stringify(result.details, null, 2)}
          </div>
        )}
      </div>
    );
  };

  const tools = [
    {
      title: 'Configuration Management',
      description: 'Backup and reset bot configuration',
      tools: [
        {
          key: 'backup',
          title: 'Backup Configuration',
          description: 'Create a backup of the current bot configuration',
          icon: Download,
          action: handleBackupConfig,
          variant: 'default' as const
        },
        {
          key: 'reset',
          title: 'Reset Configuration',
          description: 'Reset all configuration to default values',
          icon: RotateCcw,
          action: handleResetConfig,
          variant: 'destructive' as const
        }
      ]
    },
    {
      title: 'User Management',
      description: 'Bulk operations for user management',
      tools: [
        {
          key: 'pauseAll',
          title: 'Pause All Users',
          description: 'Temporarily pause all active users (1 hour)',
          icon: Pause,
          action: handlePauseAllUsers,
          variant: 'outline' as const
        },
        {
          key: 'resumeAll',
          title: 'Resume All Users',
          description: 'Resume all paused users',
          icon: Play,
          action: handleResumeAllUsers,
          variant: 'outline' as const
        }
      ]
    },
    {
      title: 'Memory Management',
      description: 'Clean up conversation data',
      tools: [
        {
          key: 'clearMemories',
          title: 'Clear All Memories',
          description: 'Delete all user conversation history and memory',
          icon: Trash2,
          action: handleClearAllMemories,
          variant: 'destructive' as const
        }
      ]
    },
    {
      title: 'System Diagnostics',
      description: 'Test and monitor system health',
      tools: [
        {
          key: 'testBot',
          title: 'Test Bot Connection',
          description: 'Check WhatsApp bot connection status',
          icon: MessageSquare,
          action: handleTestBotConnection,
          variant: 'outline' as const
        },
        {
          key: 'health',
          title: 'System Health Check',
          description: 'Check all system services health',
          icon: Activity,
          action: handleHealthCheck,
          variant: 'outline' as const
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Tools</h1>
        <p className="text-gray-600">System maintenance and administrative tools</p>
      </div>

      {/* Warning Banner */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Use with Caution</h3>
            <p className="text-sm text-yellow-700 mt-1">
              These tools perform system-wide operations that can affect all users and data. 
              Always confirm your actions and consider creating backups before making changes.
            </p>
          </div>
        </div>
      </Card>

      {/* Tools Grid */}
      <div className="space-y-8">
        {tools.map((section) => (
          <div key={section.title}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              <p className="text-gray-600">{section.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.tools.map((tool) => (
                <Card key={tool.key} className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <tool.icon className="h-8 w-8 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{tool.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
                  
                  <Button
                    onClick={tool.action}
                    disabled={loading[tool.key]}
                    variant={tool.variant}
                    className="w-full"
                  >
                    {loading[tool.key] ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-current rounded-full"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <tool.icon className="h-4 w-4 mr-2" />
                        {tool.title}
                      </>
                    )}
                  </Button>
                  
                  {renderResult(tool.key)}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Wrench className="h-6 w-6 text-blue-600 mr-2" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            onClick={() => window.location.href = '/admin/dashboard'}
            variant="outline"
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          <Button
            onClick={() => window.location.href = '/admin/users'}
            variant="outline"
            size="sm"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
          
          <Button
            onClick={() => window.location.href = '/admin/config'}
            variant="outline"
            size="sm"
          >
            <Database className="h-4 w-4 mr-2" />
            Configuration
          </Button>
          
          <Button
            onClick={() => window.location.href = '/admin/system'}
            variant="outline"
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            System Monitor
          </Button>
        </div>
      </Card>

      {/* Activity Log */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        
        {Object.keys(results).length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-sm">Tool results will appear here after you use them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(results).map(([toolKey, result]) => (
              <div key={toolKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {toolKey.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-xs text-gray-500">{result.message}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}