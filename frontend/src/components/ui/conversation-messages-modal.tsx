'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Clock, 
  Phone,
  Pause,
  Play,
  RotateCcw,
  User,
  Bot,
  Image as ImageIcon,
  FileAudio,
  File,
  X,
  RefreshCw
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useConversationMessages } from '@/hooks/useConversationMessages';

interface ConversationMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  userPhone: string;
  conversationStatus: 'active' | 'paused' | 'ended';
  onPauseToggle?: (userId: string, currentStatus: string) => Promise<void>;
  onResetContext?: (userId: string) => Promise<void>;
}

export function ConversationMessagesModal({
  isOpen,
  onClose,
  userId,
  userName,
  userPhone,
  conversationStatus,
  onPauseToggle,
  onResetContext
}: ConversationMessagesModalProps) {
  const { messages, metadata, isPaused, isLoading, error, refreshMessages } = useConversationMessages(userId);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'audio':
        return <FileAudio className="h-4 w-4" />;
      case 'video':
      case 'document':
        return <File className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handlePauseToggle = async () => {
    if (userId && onPauseToggle) {
      await onPauseToggle(userId, conversationStatus);
      refreshMessages();
    }
  };

  const handleResetContext = async () => {
    if (userId && onResetContext) {
      await onResetContext(userId);
      refreshMessages();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 w-full max-w-4xl h-[85vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{userName}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="h-4 w-4" />
                  <span>{userPhone}</span>
                  <Badge 
                    variant={isPaused ? "warning" : conversationStatus === 'active' ? "success" : "secondary"}
                    className="ml-2"
                  >
                    {isPaused ? 'Pausado' : conversationStatus === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={refreshMessages}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              {onPauseToggle && (
                <Button size="sm" variant="outline" onClick={handlePauseToggle}>
                  {isPaused || conversationStatus === 'paused' ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </>
                  )}
                </Button>
              )}
              {onResetContext && (
                <Button size="sm" variant="outline" onClick={handleResetContext}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          {metadata && (
            <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="text-center">
                <div className="font-semibold text-lg">{metadata.totalMessages}</div>
                <div className="text-sm text-gray-500">Total Mensagens</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{messages.length}</div>
                <div className="text-sm text-gray-500">Em Cache</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">
                  {formatRelativeTime(metadata.conversationStarted, true)}
                </div>
                <div className="text-sm text-gray-500">Iniciada</div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando mensagens...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MessageCircle className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-red-600">Erro ao carregar mensagens</p>
                <p className="text-xs text-gray-500">{error}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={refreshMessages}>
                  Tentar novamente
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MessageCircle className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
                <p className="text-xs text-gray-500">Esta conversa ainda não possui mensagens em cache</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {messages.map((message, index) => (
                  <div
                    key={`${message.id}-${index}`}
                    className={`flex gap-3 ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!message.fromMe && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`max-w-[70%] ${message.fromMe ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          message.fromMe
                            ? 'bg-blue-500 text-white ml-auto'
                            : 'bg-gray-100'
                        }`}
                      >
                        {message.mediaType && (
                          <div className="flex items-center gap-2 mb-2 text-sm opacity-75">
                            {getMessageIcon(message.mediaType)}
                            <span className="capitalize">{message.mediaType}</span>
                          </div>
                        )}
                        
                        {message.mediaCaption && (
                          <div className="text-xs opacity-75 mb-1">
                            {message.mediaCaption}
                          </div>
                        )}
                        
                        {message.body && (
                          <div className="whitespace-pre-wrap break-words">
                            {message.body}
                          </div>
                        )}
                        
                        {message.isForwarded && (
                          <div className="text-xs opacity-75 mt-1">
                            📤 Encaminhada
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(message.timestamp)}</span>
                      </div>
                    </div>
                    
                    {message.fromMe && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}