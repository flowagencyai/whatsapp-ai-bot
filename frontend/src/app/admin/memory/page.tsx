'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { api } from '@/lib/api';
import { AdminUser, AdminMemoryInfo } from '@/types';
import { 
  Database,
  Users,
  MessageSquare,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Download,
  AlertTriangle
} from 'lucide-react';

export default function AdminMemory() {
  return (
    <AdminRoute>
      <AdminMemoryContent />
    </AdminRoute>
  );
}

function AdminMemoryContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<AdminMemoryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'messageCount' | 'lastActivity' | 'memorySize'>('messageCount');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, sortBy]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminUsers();
      if (response.success && response.data) {
        setUsers(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMemory = async (userId: string) => {
    try {
      setLoadingMemory(true);
      const response = await api.getUserMemory(userId);
      if (response.success && response.data) {
        setSelectedMemory(response.data);
      } else {
        setSelectedMemory(null);
        alert('No memory data available for this user');
      }
    } catch (err) {
      console.error('Failed to load user memory:', err);
      alert('Failed to load user memory');
    } finally {
      setLoadingMemory(false);
    }
  };

  const clearUserMemory = async (userId: string) => {
    if (!confirm('Are you sure you want to clear this user\'s memory? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await api.clearUserMemory(userId, 'admin-interface');
      if (response.success) {
        await loadUsers();
        if (selectedMemory?.userId === userId) {
          setSelectedMemory(null);
        }
        alert('User memory cleared successfully');
      } else {
        alert(`Failed to clear memory: ${response.error}`);
      }
    } catch (err) {
      alert(`Failed to clear memory: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const clearAllMemories = async () => {
    const usersWithMemory = users.filter(u => u.context.messageCount > 0);
    
    if (usersWithMemory.length === 0) {
      alert('No users with memory data found');
      return;
    }

    if (!confirm(`Are you sure you want to clear memory for ALL ${usersWithMemory.length} users? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading('bulk');
      const response = await api.performBulkAction({
        action: 'clear_memory',
        admin: 'admin-interface'
      });

      if (response.success) {
        await loadUsers();
        setSelectedMemory(null);
        alert(`Bulk memory clear completed: ${response.message}`);
      } else {
        alert(`Bulk clear failed: ${response.error}`);
      }
    } catch (err) {
      alert(`Bulk clear failed: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.phone.includes(searchTerm) ||
                           user.id.includes(searchTerm);
      return matchesSearch;
    });

    // Sort users
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'messageCount':
          return b.context.messageCount - a.context.messageCount;
        case 'lastActivity':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        case 'memorySize':
          return b.messageCount - a.messageCount;
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTotalMemorySize = () => {
    return users.reduce((total, user) => total + user.context.messageCount, 0);
  };

  const getMemoryStats = () => {
    const usersWithMemory = users.filter(u => u.context.messageCount > 0);
    const avgMemorySize = usersWithMemory.length > 0 
      ? Math.round(usersWithMemory.reduce((sum, u) => sum + u.context.messageCount, 0) / usersWithMemory.length)
      : 0;
    
    return {
      usersWithMemory: usersWithMemory.length,
      totalMemory: getTotalMemorySize(),
      avgMemorySize
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memory Management</h1>
          <p className="text-gray-600">Loading memory data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memory Management</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
        <Card className="p-6">
          <Button onClick={loadUsers}>Retry</Button>
        </Card>
      </div>
    );
  }

  const stats = getMemoryStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memory Management</h1>
          <p className="text-gray-600">Monitor and manage conversation memory data</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={clearAllMemories}
            disabled={actionLoading === 'bulk' || stats.usersWithMemory === 0}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Memory
          </Button>
          
          <Button
            onClick={loadUsers}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Memory Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Memory</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalMemory}</p>
              <p className="text-xs text-blue-600">messages stored</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Users with Memory</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.usersWithMemory}</p>
              <p className="text-xs text-green-600">out of {users.length} total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Memory Size</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.avgMemorySize}</p>
              <p className="text-xs text-purple-600">messages per user</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Memory Usage</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.length > 0 ? Math.round((stats.usersWithMemory / users.length) * 100) : 0}%
              </p>
              <p className="text-xs text-orange-600">users have memory</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="messageCount">Sort by Message Count</option>
              <option value="lastActivity">Sort by Last Activity</option>
              <option value="memorySize">Sort by Memory Size</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            User Memory Data ({filteredUsers.length} users)
          </h2>
          
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No users found</p>
              <p className="text-sm">
                {users.length === 0 
                  ? 'Users will appear here after they start conversations with the bot'
                  : 'Try adjusting your search criteria'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {user.name || 'Unknown'}
                        </span>
                        {user.context.messageCount > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.context.messageCount} msgs
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                      <p className="text-xs text-gray-500">
                        Last active: {formatDate(user.lastActivity)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-3">
                    <Button
                      onClick={() => loadUserMemory(user.id)}
                      size="sm"
                      variant="outline"
                      disabled={user.context.messageCount === 0}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Memory
                    </Button>
                    
                    <Button
                      onClick={() => clearUserMemory(user.id)}
                      disabled={actionLoading === user.id || user.context.messageCount === 0}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Memory Detail Panel */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Memory Details</h2>
          
          {loadingMemory ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading memory data...</p>
            </div>
          ) : !selectedMemory ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a user to view memory details</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900">{selectedMemory.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Memory Size:</span>
                    <span className="text-gray-900">{selectedMemory.memorySize} messages</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Activity:</span>
                    <span className="text-gray-900">{formatDate(selectedMemory.lastActivity)}</span>
                  </div>
                </div>
              </div>

              {/* Conversation Messages */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-2">Conversation History</h3>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedMemory.messages.map((message, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg text-sm ${
                        message.role === 'user' 
                          ? 'bg-blue-50 text-blue-900 ml-4' 
                          : 'bg-gray-50 text-gray-900 mr-4'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">
                          {message.role === 'user' ? 'User' : 'Assistant'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                      <div className="break-words">
                        {message.content.length > 200 
                          ? `${message.content.substring(0, 200)}...` 
                          : message.content
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {selectedMemory.messages.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No messages in memory</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t pt-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => clearUserMemory(selectedMemory.userId)}
                    disabled={actionLoading === selectedMemory.userId}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear This Memory
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}