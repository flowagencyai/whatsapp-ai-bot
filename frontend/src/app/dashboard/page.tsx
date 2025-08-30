'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useBotStatus } from '@/hooks/useBotStatus';
import { useConversations } from '@/hooks/useConversations';
import { QRCodeDisplay } from '@/components/qr-code/QRCodeDisplay';
import { 
  MessageCircle, 
  Users, 
  BarChart3, 
  Activity,
  TrendingUp,
  Clock,
  Smartphone,
  Bot,
  LogOut,
  RefreshCcw,
  QrCode,
  Settings,
  CheckCircle,
  AlertCircle,
  Phone,
  Search,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Palette,
  Save,
  Loader2,
  CreditCard,
  User,
  ShoppingCart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatRelativeTime, extractNameFromJid } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ConversationMessagesModal } from '@/components/ui/conversation-messages-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function UserDashboardPage() {
  const { user, logout, getToken } = useAuth();
  const router = useRouter();
  const { status, isLoading: botLoading, refetch, pauseBot, resumeBot } = useBotStatus();
  const { conversations, isLoading: conversationsLoading, refreshConversations } = useConversations();
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsSection, setSettingsSection] = useState('account'); // account, personalization, plans
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Personalization states
  const [personalizationLoading, setPersonalizationLoading] = useState(false);
  const [savingPersonalization, setSavingPersonalization] = useState(false);
  const [personality, setPersonality] = useState('');
  const [importantInfo, setImportantInfo] = useState('');
  const [responseStyle, setResponseStyle] = useState('friendly');
  const [customName, setCustomName] = useState('');
  const [customGreeting, setCustomGreeting] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<{
    remoteJid: string;
    name: string;
    status: 'active' | 'paused' | 'ended';
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load personalization when personalization section is opened
  useEffect(() => {
    if (activeTab === 'settings' && settingsSection === 'personalization') {
      loadPersonalization();
    }
  }, [activeTab, settingsSection]);

  const responseStyles = [
    { value: 'formal', label: 'Formal', description: 'Linguagem respeitosa e profissional' },
    { value: 'casual', label: 'Descontraído', description: 'Linguagem casual e relaxada' },
    { value: 'friendly', label: 'Amigável', description: 'Linguagem acolhedora e simpática' },
    { value: 'professional', label: 'Profissional', description: 'Linguagem técnica e direta' },
  ];

  const loadPersonalization = async () => {
    try {
      setPersonalizationLoading(true);
      const token = await getToken();
      const response = await fetch('/api/user/personalization', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update form fields
        setPersonality(data.data.ai.personality || '');
        setImportantInfo(data.data.ai.importantInfo || '');
        setCustomName(data.data.bot.customName || '');
        setCustomGreeting(data.data.bot.customGreeting || '');
        setResponseStyle(data.data.preferences.responseStyle || 'friendly');
      }
    } catch (error) {
      console.error('Error loading personalization:', error);
    } finally {
      setPersonalizationLoading(false);
    }
  };

  const savePersonalization = async () => {
    try {
      setSavingPersonalization(true);
      const token = await getToken();
      
      const updateData = {
        ai: {
          ...(personality && { personality }),
          ...(importantInfo && { importantInfo }),
        },
        bot: {
          ...(customName && { customName }),
          ...(customGreeting && { customGreeting }),
        },
        preferences: {
          responseStyle,
        },
      };

      const response = await fetch('/api/user/personalization', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Personalização salva!',
          description: 'Suas preferências foram atualizadas com sucesso.',
        });
      } else {
        throw new Error('Failed to save personalization');
      }
    } catch (error) {
      console.error('Error saving personalization:', error);
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas personalizações.',
      });
    } finally {
      setSavingPersonalization(false);
    }
  };

  // Função para encontrar o número WhatsApp do usuário logado
  const findUserWhatsAppNumber = async (): Promise<string | null> => {
    try {
      // Buscar conversas ativas para encontrar o número do usuário
      const response = await fetch('http://localhost:3000/api/conversations');
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.success || !data.conversations?.length) return null;
      
      // Para usuário não-admin, retornar o primeiro número encontrado nas conversas
      // (assumindo que é o número do usuário que está usando o dashboard)
      const firstConversation = data.conversations[0];
      if (firstConversation?.userId) {
        return firstConversation.userId;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar número WhatsApp:', error);
      return null;
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const handleViewMessages = (conversation: any) => {
    setSelectedConversation({
      remoteJid: conversation.remoteJid,
      name: conversation.name,
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
        if (selectedConversation?.remoteJid === userId) {
          setSelectedConversation(prev => prev ? {
            ...prev,
            status: endpoint === 'pause' ? 'paused' : 'active'
          } : null);
        }
      }
    } catch (error) {
      console.error('Error toggling pause status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetUserContext = async (userId: string) => {
    try {
      setActionLoading(`reset-${userId}`);
      
      const response = await fetch(`http://localhost:3000/users/${encodeURIComponent(userId)}/context`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await refreshConversations();
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

  const handlePauseBot = async () => {
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    
    const confirmed = await confirm({
      title: isAdmin ? 'Pausar Bot WhatsApp (Global)' : 'Pausar Atendimento',
      description: isAdmin 
        ? 'O bot será pausado GLOBALMENTE por 1 hora. Todos os usuários deixarão de receber respostas.'
        : 'Você será pausado por 1 hora. Durante este período, o bot não responderá às suas mensagens.',
      confirmText: 'Sim, pausar',
      cancelText: 'Cancelar',
      variant: 'default',
      icon: 'warning'
    });

    if (confirmed) {
      setIsActionLoading(true);
      try {
        if (isAdmin) {
          // Admin pausa globalmente
          await pauseBot(3600); // 1 hour in seconds
        } else {
          // Usuário pausa apenas para si - buscar número automaticamente
          const userWhatsAppNumber = await findUserWhatsAppNumber();
          
          if (!userWhatsAppNumber) {
            throw new Error('Nenhuma conversa WhatsApp encontrada. Envie uma mensagem primeiro.');
          }
          
          const response = await fetch(`http://localhost:3000/users/${encodeURIComponent(userWhatsAppNumber)}/pause`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ duration: 3600000 }), // 1 hour in milliseconds
          });
          
          if (!response.ok) {
            throw new Error('Falha ao pausar usuário');
          }
        }
        setIsPaused(true);
      } catch (error) {
        console.error('Erro ao pausar:', error);
        // Mostrar erro para o usuário via toast ou alert
        alert((error as Error).message);
      }
      setIsActionLoading(false);
    }
  };

  const handleResumeBot = async () => {
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    
    const confirmed = await confirm({
      title: isAdmin ? 'Retomar Bot WhatsApp (Global)' : 'Retomar Atendimento',
      description: isAdmin
        ? 'O bot voltará a responder mensagens de todos os usuários normalmente.'
        : 'Você voltará a receber respostas do bot normalmente.',
      confirmText: 'Sim, retomar',
      cancelText: 'Cancelar',
      variant: 'success',
      icon: 'success'
    });

    if (confirmed) {
      setIsActionLoading(true);
      try {
        if (isAdmin) {
          // Admin retoma globalmente
          await resumeBot();
        } else {
          // Usuário retoma apenas para si - buscar número automaticamente
          const userWhatsAppNumber = await findUserWhatsAppNumber();
          
          if (!userWhatsAppNumber) {
            throw new Error('Nenhuma conversa WhatsApp encontrada. Envie uma mensagem primeiro.');
          }
          
          const response = await fetch(`http://localhost:3000/users/${encodeURIComponent(userWhatsAppNumber)}/resume`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Falha ao retomar usuário');
          }
        }
        setIsPaused(false);
      } catch (error) {
        console.error('Erro ao retomar:', error);
        // Mostrar erro para o usuário via toast ou alert
        alert((error as Error).message);
      }
      setIsActionLoading(false);
    }
  };

  const handleResetContext = async () => {
    const confirmed = await confirm({
      title: 'Reset de Contexto',
      description: 'Esta ação limpará o histórico de conversas de todos os usuários. Não é possível desfazer.',
      confirmText: 'Sim, limpar',
      cancelText: 'Cancelar',
      variant: 'destructive',
      icon: 'danger'
    });

    if (confirmed) {
      setIsActionLoading(true);
      try {
        // Implementar reset de contexto via API se disponível
        alert('Funcionalidade em desenvolvimento');
      } catch (error) {
        console.error('Erro ao resetar contexto:', error);
      }
      setIsActionLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getBotStatusDisplay = () => {
    if (!status) return { icon: <AlertCircle className="h-5 w-5 text-red-500" />, text: 'Desconectado', color: 'text-red-600' };
    
    switch (status.status) {
      case 'connected':
        return { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Conectado', color: 'text-green-600' };
      case 'connecting':
        return { icon: <AlertCircle className="h-5 w-5 text-yellow-500" />, text: 'Conectando', color: 'text-yellow-600' };
      case 'qr':
        return { icon: <QrCode className="h-5 w-5 text-blue-500" />, text: 'Aguardando QR', color: 'text-blue-600' };
      default:
        return { icon: <AlertCircle className="h-5 w-5 text-red-500" />, text: 'Desconectado', color: 'text-red-600' };
    }
  };

  const botStatusDisplay = getBotStatusDisplay();

  const TabButton = ({ id, label, icon: Icon, active }: { id: string; label: string; icon: any; active: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        active 
          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
          : 'hover:bg-gray-100 text-gray-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  );

  const SettingsButton = ({ id, label, icon: Icon, active }: { id: string; label: string; icon: any; active: boolean }) => (
    <button
      onClick={() => setSettingsSection(id)}
      className={`flex items-center space-x-3 px-4 py-3 w-full text-left rounded-lg transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
          : 'hover:bg-gray-50 text-gray-600'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">ZecaBot Dashboard</h1>
                  <p className="text-xs text-gray-500">Painel Unificado</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {botStatusDisplay.icon}
                  <span className={`text-sm font-medium ${botStatusDisplay.color}`}>
                    {botStatusDisplay.text}
                  </span>
                  {isPaused && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Pausado
                    </span>
                  )}
                </div>
                
                {user && (
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.role === 'viewer' ? 'Usuário' : user.role}
                      </p>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sair
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bem-vindo, {user?.username}! 👋
            </h2>
            <p className="text-gray-600">
              Painel centralizado para monitorar e gerenciar seu bot WhatsApp
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <TabButton id="overview" label="Visão Geral" icon={BarChart3} active={activeTab === 'overview'} />
              <TabButton id="conversations" label="Conversas" icon={MessageCircle} active={activeTab === 'conversations'} />
              <TabButton id="qr" label="QR Code" icon={QrCode} active={activeTab === 'qr'} />
              <TabButton id="settings" label="Configurações" icon={Settings} active={activeTab === 'settings'} />
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Bot Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-blue-500" />
                    Controles do Bot
                  </CardTitle>
                  <CardDescription>
                    Controle básico do seu bot WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => refetch()}
                      variant="outline"
                      size="sm"
                      disabled={botLoading}
                    >
                      <RefreshCcw className={`h-4 w-4 mr-2 ${botLoading ? 'animate-spin' : ''}`} />
                      {botLoading ? 'Atualizando...' : 'Atualizar Status'}
                    </Button>
                    
                    {status?.status === 'connected' && (
                      <>
                        {!isPaused ? (
                          <Button
                            onClick={handlePauseBot}
                            variant="outline"
                            size="sm"
                            disabled={isActionLoading}
                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {isActionLoading ? 'Pausando...' : (user?.role === 'super_admin' || user?.role === 'admin' ? 'Pausar Bot' : 'Pausar Atendimento')}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleResumeBot}
                            variant="outline"
                            size="sm"
                            disabled={isActionLoading}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            {isActionLoading ? 'Retomando...' : (user?.role === 'super_admin' || user?.role === 'admin' ? 'Retomar Bot' : 'Retomar Atendimento')}
                          </Button>
                        )}
                        
                        <Button
                          onClick={handleResetContext}
                          variant="outline" 
                          size="sm"
                          disabled={isActionLoading}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          <RefreshCcw className="h-4 w-4 mr-2" />
                          Reset Contexto
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{conversations.length}</div>
                    <p className="text-xs text-muted-foreground">Todas as conversas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
                    <div className="h-4 w-4 rounded-full bg-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{conversations.filter(c => c.status === 'active').length}</div>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status do Bot</CardTitle>
                    <Smartphone className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${botStatusDisplay.color}`}>
                      {botStatusDisplay.text}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {status?.lastUpdate ? `Atualizado ${formatRelativeTime(status.lastUpdate, isClient)}` : 'Status desconhecido'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    Atividade Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conversationsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-muted animate-pulse rounded-full" />
                          <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                          <div className="w-16 h-4 bg-muted animate-pulse rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversations.slice(0, 5).map((conversation, index) => (
                        <div key={conversation.id} className="flex items-center space-x-3 text-sm">
                          {getStatusIcon(conversation.status)}
                          <span className="flex-1 truncate">{conversation.name}: {conversation.lastMessage}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(conversation.lastMessageTime, isClient)}
                          </span>
                        </div>
                      ))}
                      {conversations.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">Nenhuma conversa encontrada</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'conversations' && (
            <div className="space-y-4">
              {/* Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar conversas..."
                      className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Conversations List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Lista de Conversas</CardTitle>
                    <Button onClick={refreshConversations} variant="outline" size="sm">
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                  </div>
                  <CardDescription>
                    {filteredConversations.length} de {conversations.length} conversas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {conversationsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                          <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                          </div>
                          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                        </div>
                      ))
                    ) : filteredConversations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma conversa encontrada</p>
                      </div>
                    ) : (
                      filteredConversations.map((conversation) => (
                        <div key={conversation.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
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

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{conversation.name}</h3>
                              {conversation.isGroup && (
                                <Badge variant="outline" className="text-xs">Grupo</Badge>
                              )}
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">{conversation.unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
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
                                onClick={() => handlePauseToggle(conversation.remoteJid, conversation.status)}
                                disabled={actionLoading === (conversation.remoteJid)}
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
                                onClick={() => handleResetUserContext(conversation.remoteJid)}
                                disabled={actionLoading === `reset-${(conversation.remoteJid)}`}
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
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <QrCode className="w-5 h-5 mr-2" />
                    Código QR WhatsApp
                  </CardTitle>
                  <CardDescription>
                    Use este código para conectar seu WhatsApp ao bot
                  </CardDescription>
                </CardHeader>
              </Card>

              <QRCodeDisplay
                qrCode={status?.qrCode}
                isLoading={botLoading}
                onRefresh={refetch}
                size="lg"
                showInstructions={true}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Como usar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Passos:</h4>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Abra o WhatsApp no seu celular</li>
                        <li>Vá em Configurações → Dispositivos conectados</li>
                        <li>Toque em "Conectar um dispositivo"</li>
                        <li>Escaneie este QR Code</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status da Conexão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      {botStatusDisplay.icon}
                      <div>
                        <p className={`font-medium ${botStatusDisplay.color}`}>
                          {botStatusDisplay.text}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {status?.lastUpdate ? `Atualizado ${formatRelativeTime(status.lastUpdate, isClient)}` : 'Status desconhecido'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Settings Sidebar */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configurações</CardTitle>
                    <CardDescription>
                      Gerencie suas preferências
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <SettingsButton 
                      id="account" 
                      label="Informações da Conta" 
                      icon={User} 
                      active={settingsSection === 'account'} 
                    />
                    <SettingsButton 
                      id="personalization" 
                      label="Personalização do Bot" 
                      icon={Palette} 
                      active={settingsSection === 'personalization'} 
                    />
                    <SettingsButton 
                      id="plans" 
                      label="Planos & Assinatura" 
                      icon={CreditCard} 
                      active={settingsSection === 'plans'} 
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Settings Content */}
              <div className="lg:col-span-3">
                {/* Account Section */}
                {settingsSection === 'account' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        Informações da Conta
                      </CardTitle>
                      <CardDescription>
                        Visualize suas informações de conta e permissões
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Dados da Conta</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Usuário</label>
                            <p className="text-sm text-gray-600 mt-1">{user?.username}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Tipo de Conta</label>
                            <p className="text-sm text-gray-600 mt-1">
                              {user?.role === 'viewer' ? 'Usuário Comum' : user?.role}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <div className="mt-1">
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Ativo
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-lg font-medium mb-4">Permissões</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700 mb-3">Como usuário comum, você pode:</p>
                          <ul className="text-sm text-gray-600 space-y-2">
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                              Visualizar conversas e estatísticas
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                              Acessar o código QR para conexão
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                              Monitorar o status do bot
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                              Personalizar interações com o bot
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Personalization Section */}
                {settingsSection === 'personalization' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Palette className="w-5 h-5 mr-2" />
                        Personalização do Bot
                      </CardTitle>
                      <CardDescription>
                        Configure como você gostaria que o ZecaBot interaja especificamente com você
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {personalizationLoading ? (
                        <div className="flex items-center gap-2 text-gray-600 py-8">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Carregando personalizações...</span>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Personalidade */}
                          <div>
                            <Label htmlFor="personality" className="text-sm font-medium">
                              Personalidade do Bot
                            </Label>
                            <p className="text-xs text-gray-600 mb-2">
                              Descreva como você gostaria que o bot se comporte nas conversas com você
                            </p>
                            <textarea
                              id="personality"
                              className="w-full min-h-[80px] p-3 border rounded-md resize-none text-sm"
                              placeholder="Ex: Seja mais enérgico e entusiástico nas respostas, use emojis quando apropriado..."
                              value={personality}
                              onChange={(e) => setPersonality(e.target.value)}
                            />
                          </div>

                          {/* Informações Importantes */}
                          <div>
                            <Label htmlFor="important-info" className="text-sm font-medium">
                              Informações Importantes sobre Você
                            </Label>
                            <p className="text-xs text-gray-600 mb-2">
                              Informações que o bot deve saber para te atender melhor
                            </p>
                            <textarea
                              id="important-info"
                              className="w-full min-h-[60px] p-3 border rounded-md resize-none text-sm"
                              placeholder="Ex: Trabalho com vendas online, prefiro respostas diretas, sou do setor de marketing..."
                              value={importantInfo}
                              onChange={(e) => setImportantInfo(e.target.value)}
                            />
                          </div>

                          {/* Estilo de Resposta */}
                          <div>
                            <Label className="text-sm font-medium">Estilo de Resposta</Label>
                            <p className="text-xs text-gray-600 mb-3">
                              Escolha o tom das respostas do bot
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              {responseStyles.map((style) => (
                                <div
                                  key={style.value}
                                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    responseStyle === style.value
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                  onClick={() => setResponseStyle(style.value)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-sm">{style.label}</div>
                                      <div className="text-xs text-gray-600">
                                        {style.description}
                                      </div>
                                    </div>
                                    {responseStyle === style.value && (
                                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Customizações */}
                          <div>
                            <Label className="text-sm font-medium">Customizações (Opcional)</Label>
                            <p className="text-xs text-gray-600 mb-3">
                              Personalize nome e saudação do bot
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="custom-name" className="text-xs text-gray-600">
                                  Nome Personalizado do Bot
                                </Label>
                                <Input
                                  id="custom-name"
                                  placeholder="Ex: MeuAssistente (padrão: ZecaBot)"
                                  value={customName}
                                  onChange={(e) => setCustomName(e.target.value)}
                                  className="text-sm mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="custom-greeting" className="text-xs text-gray-600">
                                  Saudação Personalizada
                                </Label>
                                <Input
                                  id="custom-greeting"
                                  placeholder="Ex: Olá! Sou seu assistente pessoal..."
                                  value={customGreeting}
                                  onChange={(e) => setCustomGreeting(e.target.value)}
                                  className="text-sm mt-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-4 border-t">
                            <Button 
                              onClick={savePersonalization} 
                              disabled={savingPersonalization}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {savingPersonalization ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Salvar Personalizações
                                </>
                              )}
                            </Button>
                            
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setPersonality('');
                                setImportantInfo('');
                                setCustomName('');
                                setCustomGreeting('');
                                setResponseStyle('friendly');
                              }}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Limpar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Plans Section */}
                {settingsSection === 'plans' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Planos & Assinatura
                      </CardTitle>
                      <CardDescription>
                        Gerencie sua assinatura e veja os planos disponíveis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-medium text-blue-900 mb-2">Plano Atual</h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-800 font-medium">Plano Gratuito</p>
                              <p className="text-sm text-blue-600">Acesso básico às funcionalidades</p>
                            </div>
                            <Badge variant="outline" className="border-blue-300 text-blue-700">
                              Ativo
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium text-gray-900 mb-3">Funcionalidades Incluídas</h3>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                              <span>Visualização de conversas e estatísticas</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                              <span>Acesso ao QR Code para conexão</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                              <span>Personalização básica do bot</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900">Upgrade seu Plano</h3>
                            <Button 
                              onClick={() => router.push('/plans')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Ver Planos
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600">
                            Desbloqueie recursos avançados como IA ilimitada, análise de imagem, 
                            transcrição de áudio e muito mais.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Conversation Messages Modal */}
        {selectedConversation && (
          <ConversationMessagesModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            userId={selectedConversation.remoteJid}
            userName={selectedConversation.name}
            userPhone={selectedConversation.remoteJid}
            conversationStatus={selectedConversation.status}
            onPauseToggle={handlePauseToggle}
            onResetContext={handleResetUserContext}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}