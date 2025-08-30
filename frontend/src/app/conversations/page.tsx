'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ConversationMessagesModal } from '@/components/ui/conversation-messages-modal';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  MessageCircle, 
  Pause, 
  Play, 
  RotateCcw,
  Clock,
  Users,
  Phone,
  RefreshCw,
  Eye
} from 'lucide-react';
import { formatRelativeTime, extractNameFromJid } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { SmartBackButton } from '@/components/ui/smart-back-button';
import Link from 'next/link';

export default function ConversationsPage() {
  const { conversations, isLoading, error, refreshConversations } = useConversations();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    userId: string;
    userName: string;
    userPhone: string;
    status: 'active' | 'paused' | 'ended';
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredConversations = conversations.filter(conv => {
    const matchesStatus = selectedStatus === 'all' || conv.status === selectedStatus;
    const matchesSearch = conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleViewMessages = (conversation: any) => {
    const userId = conversation.userId || conversation.remoteJid;
    setSelectedConversation({
      userId,
      userName: conversation.name,
      userPhone: extractNameFromJid(conversation.remoteJid),
      status: conversation.status
    });
    setIsModalOpen(true);
  };

  const handlePauseToggle = async (userId: string, currentStatus: string) => {
    try {
      setActionLoading(userId);
      const endpoint = currentStatus === 'active' ? 'pause' : 'resume';
      
      const response = await fetch(`http://localhost:3000/users/${encodeURIComponent(userId)}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await refreshConversations();
        // Update selected conversation status if it's currently open
        if (selectedConversation?.userId === userId) {
          setSelectedConversation(prev => prev ? {
            ...prev,
            status: endpoint === 'pause' ? 'paused' : 'active'
          } : null);
        }
      } else {
        console.error('Failed to toggle pause status');
      }
    } catch (error) {
      console.error('Error toggling pause status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetContext = async (userId: string) => {
    try {
      setActionLoading(`reset-${userId}`);
      
      const response = await fetch(`http://localhost:3000/users/${encodeURIComponent(userId)}/context`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await refreshConversations();
      } else {
        console.error('Failed to reset context');
      }
    } catch (error) {
      console.error('Error resetting context:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedConversation(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Ativo</Badge>;
      case 'paused':
        return <Badge variant="warning">Pausado</Badge>;
      case 'ended':
        return <Badge variant="error">Finalizado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case 'paused':
        return <div className="h-2 w-2 rounded-full bg-yellow-500" />;
      case 'ended':
        return <div className="h-2 w-2 rounded-full bg-red-500" />;
      default:
        return <div className="h-2 w-2 rounded-full bg-gray-500" />;
    }
  };

  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'active').length,
    paused: conversations.filter(c => c.status === 'paused').length,
    ended: 0, // Mock data doesn't have 'ended' status yet
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <SmartBackButton />
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Conversas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as conversas do WhatsApp
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshConversations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Todas as conversas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausadas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paused}</div>
            <p className="text-xs text-muted-foreground">Temporariamente pausadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ended}</div>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="paused">Pausadas</option>
              <option value="ended">Finalizadas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <MessageCircle className="h-5 w-5" />
              <p className="font-medium">Erro ao carregar conversas</p>
            </div>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={refreshConversations}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Conversas</CardTitle>
          <CardDescription>
            {filteredConversations.length} de {conversations.length} conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
                <p className="text-sm">Tente ajustar os filtros de busca</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.profilePicture} />
                      <AvatarFallback>
                        {conversation.isGroup ? (
                          <Users className="h-6 w-6" />
                        ) : (
                          extractNameFromJid(conversation.remoteJid).substring(0, 2)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      {getStatusIcon(conversation.status)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">
                        {conversation.name}
                      </h3>
                      {conversation.isGroup && (
                        <Badge variant="outline" className="text-xs">
                          Grupo
                        </Badge>
                      )}
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(conversation.lastMessageTime, isClient)}
                      </span>
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">
                        {extractNameFromJid(conversation.remoteJid)}
                      </span>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center gap-2">
                    {getStatusBadge(conversation.status)}
                    
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => handleViewMessages(conversation)}
                        title="Ver mensagens"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => handlePauseToggle(conversation.userId || conversation.remoteJid, conversation.status)}
                        disabled={actionLoading === (conversation.userId || conversation.remoteJid)}
                        title={conversation.status === 'active' ? 'Pausar' : 'Retomar'}
                      >
                        {conversation.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => handleResetContext(conversation.userId || conversation.remoteJid)}
                        disabled={actionLoading === `reset-${(conversation.userId || conversation.remoteJid)}`}
                        title="Reset contexto"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Messages Modal */}
      {selectedConversation && (
        <ConversationMessagesModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          userId={selectedConversation.userId}
          userName={selectedConversation.userName}
          userPhone={selectedConversation.userPhone}
          conversationStatus={selectedConversation.status}
          onPauseToggle={handlePauseToggle}
          onResetContext={handleResetContext}
        />
      )}
    </div>
  );
}