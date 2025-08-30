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
  Search
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatRelativeTime, extractNameFromJid } from '@/lib/utils';

export default function UserDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { status, isLoading: botLoading, refetch } = useBotStatus();
  const { conversations, isLoading: conversationsLoading, refreshConversations } = useConversations();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
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
                  <h1 className="text-xl font-bold text-gray-900">WhatsApp Bot Dashboard</h1>
                  <p className="text-xs text-gray-500">Painel Unificado</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {botStatusDisplay.icon}
                  <span className={`text-sm font-medium ${botStatusDisplay.color}`}>
                    {botStatusDisplay.text}
                  </span>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Configurações do Usuário
                </CardTitle>
                <CardDescription>
                  Personalize sua experiência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Informações da Conta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Usuário</label>
                        <p className="text-sm text-muted-foreground">{user?.username}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Tipo de Conta</label>
                        <p className="text-sm text-muted-foreground">
                          {user?.role === 'viewer' ? 'Usuário Comum' : user?.role}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Badge variant="success" className="text-xs">Ativo</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Permissões</h3>
                    <div className="text-sm text-muted-foreground">
                      <p>Como usuário comum, você pode:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Visualizar conversas e estatísticas</li>
                        <li>Acessar o código QR para conexão</li>
                        <li>Monitorar o status do bot</li>
                        <li>Ver informações básicas do sistema</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}