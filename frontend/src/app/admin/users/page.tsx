'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { UserManagementRoute } from '@/components/auth/ProtectedRoute';
import { api } from '@/lib/api';
import { AdminUser, AdminMemoryInfo } from '@/types';
import { 
  Users, 
  MessageSquare,
  Clock,
  Play,
  Pause,
  Trash2,
  Eye,
  RotateCcw,
  UserCheck,
  UserX
} from 'lucide-react';

export default function AdminUsers() {
  return (
    <UserManagementRoute>
      <AdminUsersContent />
    </UserManagementRoute>
  );
}

function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userMemory, setUserMemory] = useState<AdminMemoryInfo | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    loadUsers();
  }, []);

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
        setUserMemory(response.data);
      }
    } catch (err) {
      console.error('Failed to load user memory:', err);
    } finally {
      setLoadingMemory(false);
    }
  };

  const handleUserAction = async (action: 'pause' | 'resume' | 'clear_memory', userId: string) => {
    try {
      setActionLoading(userId);
      let response;
      
      switch (action) {
        case 'pause':
          response = await api.pauseUser(userId, 3600000, 'admin-interface'); // 1 hour
          break;
        case 'resume':
          response = await api.resumeUser(userId, 'admin-interface');
          break;
        case 'clear_memory':
          response = await api.clearUserMemory(userId, 'admin-interface');
          break;
      }

      if (response.success) {
        await loadUsers(); // Refresh user list
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
          setUserMemory(null);
        }
        
        const actionMessages = {
          pause: 'Usuário pausado com sucesso!',
          resume: 'Usuário reativado com sucesso!',
          clear_memory: 'Memória do usuário limpa com sucesso!'
        };
        
        addToast({
          type: 'success',
          title: actionMessages[action],
          description: `Ação executada para o usuário.`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: `Erro ao ${action === 'pause' ? 'pausar' : action === 'resume' ? 'reativar' : 'limpar memória'}`,
          description: response.error || 'Erro desconhecido',
          duration: 5000
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: `Erro ao executar ação`,
        description: String(err),
        duration: 5000
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: 'clear_memory' | 'pause_users' | 'resume_users') => {
    const selectedUserIds = users.filter(u => u.status === 'active').map(u => u.id);
    
    if (selectedUserIds.length === 0) {
      addToast({
        type: 'warning',
        title: 'Nenhum usuário ativo encontrado',
        description: 'Não há usuários ativos para executar esta ação.',
        duration: 4000
      });
      return;
    }

    const actionTitles = {
      clear_memory: 'Limpar Memória de Todos os Usuários',
      pause_users: 'Pausar Todos os Usuários',
      resume_users: 'Reativar Todos os Usuários'
    };

    const actionDescriptions = {
      clear_memory: `Tem certeza que deseja limpar a memória de conversa de ${selectedUserIds.length} usuário${selectedUserIds.length > 1 ? 's' : ''}?`,
      pause_users: `Tem certeza que deseja pausar ${selectedUserIds.length} usuário${selectedUserIds.length > 1 ? 's' : ''} ativo${selectedUserIds.length > 1 ? 's' : ''}?`,
      resume_users: `Tem certeza que deseja reativar ${selectedUserIds.length} usuário${selectedUserIds.length > 1 ? 's' : ''}?`
    };

    const confirmed = await confirm({
      title: actionTitles[action],
      description: actionDescriptions[action],
      confirmText: 'Sim, executar',
      cancelText: 'Cancelar',
      variant: action === 'clear_memory' ? 'destructive' : 'default'
    });

    if (confirmed) {
      try {
        setActionLoading('bulk');
        const response = await api.performBulkAction({
          action,
          userIds: selectedUserIds,
          duration: action === 'pause_users' ? 3600000 : undefined,
          admin: 'admin-interface'
        });

        if (response.success) {
          await loadUsers();
          
          const successMessages = {
            clear_memory: 'Memória limpa para todos os usuários!',
            pause_users: 'Todos os usuários foram pausados!',
            resume_users: 'Todos os usuários foram reativados!'
          };
          
          addToast({
            type: 'success',
            title: successMessages[action],
            description: `Ação executada com sucesso para ${selectedUserIds.length} usuário${selectedUserIds.length > 1 ? 's' : ''}.`,
            duration: 4000
          });
        } else {
          addToast({
            type: 'error',
            title: 'Erro na ação em massa',
            description: response.error || 'Erro desconhecido',
            duration: 5000
          });
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Erro na ação em massa',
          description: String(err),
          duration: 5000
        });
      } finally {
        setActionLoading(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUserStatusBadge = (status: 'active' | 'paused') => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <UserCheck className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        <UserX className="w-3 h-3 mr-1" />
        Paused
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
        <Card className="p-6">
          <button 
            onClick={loadUsers}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage active bot users and their conversations</p>
        </div>
        
        {/* Bulk Actions */}
        <div className="flex space-x-2">
          <LoadingButton
            onClick={() => handleBulkAction('clear_memory')}
            loading={actionLoading === 'bulk'}
            loadingText="Limpando..."
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Memória
          </LoadingButton>
          <LoadingButton
            onClick={() => handleBulkAction('pause_users')}
            loading={actionLoading === 'bulk'}
            loadingText="Pausando..."
            variant="outline"
            size="sm"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pausar Todos
          </LoadingButton>
          <LoadingButton
            onClick={() => handleBulkAction('resume_users')}
            loading={actionLoading === 'bulk'}
            loadingText="Reativando..."
            variant="outline"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Reativar Todos
          </LoadingButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <UserX className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Paused Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.status === 'paused').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Messages</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.reduce((sum, u) => sum + u.messageCount, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Users</h2>
          
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No users found</p>
              <p className="text-sm">Users will appear here after they start conversations with the bot</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {user.name || 'Unknown'}
                        </span>
                        {getUserStatusBadge(user.status)}
                      </div>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                      <p className="text-xs text-gray-500">
                        Last: {user.lastMessage.substring(0, 50)}...
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {user.messageCount} messages
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(user.lastActivity)}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        loadUserMemory(user.id);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {user.status === 'active' ? (
                      <LoadingButton
                        onClick={() => handleUserAction('pause', user.id)}
                        loading={actionLoading === user.id}
                        loadingText="Pausando..."
                        disabled={actionLoading === 'bulk'}
                        size="sm"
                        variant="outline"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pausar
                      </LoadingButton>
                    ) : (
                      <LoadingButton
                        onClick={() => handleUserAction('resume', user.id)}
                        loading={actionLoading === user.id}
                        loadingText="Reativando..."
                        disabled={actionLoading === 'bulk'}
                        size="sm"
                        variant="outline"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Reativar
                      </LoadingButton>
                    )}
                    
                    <LoadingButton
                      onClick={() => handleUserAction('clear_memory', user.id)}
                      loading={actionLoading === user.id}
                      loadingText="Limpando..."
                      disabled={actionLoading === 'bulk'}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpar
                    </LoadingButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* User Detail Panel */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Details</h2>
          
          {!selectedUser ? (
            <div className="text-center py-8 text-gray-500">
              <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a user to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="text-gray-900">{selectedUser.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900">{selectedUser.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    {getUserStatusBadge(selectedUser.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Messages:</span>
                    <span className="text-gray-900">{selectedUser.messageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Activity:</span>
                    <span className="text-gray-900">{formatDate(selectedUser.lastActivity)}</span>
                  </div>
                </div>
              </div>

              {/* Memory Information */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-2">Conversation Memory</h3>
                
                {loadingMemory ? (
                  <p className="text-sm text-gray-500">Loading memory...</p>
                ) : userMemory ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      {userMemory.memorySize} messages in memory
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {userMemory.messages.map((message, index) => (
                        <div 
                          key={index}
                          className={`p-2 rounded text-xs ${
                            message.role === 'user' 
                              ? 'bg-blue-50 text-blue-900' 
                              : 'bg-gray-50 text-gray-900'
                          }`}
                        >
                          <div className="font-medium mb-1">
                            {message.role === 'user' ? 'User' : 'Assistant'}
                            <span className="font-normal text-gray-500 ml-2">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                          <div>{message.content.substring(0, 200)}...</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No memory data available</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={loadUsers} disabled={loading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {loading ? 'Refreshing...' : 'Refresh Users'}
        </Button>
      </div>
    </div>
  );
}