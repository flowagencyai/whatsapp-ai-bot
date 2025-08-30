import { useState, useEffect } from 'react';

export interface ConversationMessage {
  id: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  body?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  mediaCaption?: string;
  quotedMessage?: ConversationMessage;
  isForwarded: boolean;
}

export interface ConversationMetadata {
  userName?: string;
  userPhone?: string;
  conversationStarted: number;
  totalMessages: number;
}

interface ConversationMessagesResponse {
  success: boolean;
  messages: ConversationMessage[];
  total: number;
  userId: string;
  metadata?: ConversationMetadata;
  isPaused?: boolean;
  timestamp: string;
  note?: string;
}

export function useConversationMessages(userId: string | null) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [metadata, setMetadata] = useState<ConversationMetadata | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async (targetUserId: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await fetch(`http://localhost:3000/api/conversations/${encodeURIComponent(targetUserId)}/messages`);
      const data: ConversationMessagesResponse = await response.json();

      if (data.success) {
        setMessages(data.messages);
        setMetadata(data.metadata || null);
        setIsPaused(data.isPaused || false);
      } else {
        throw new Error('Failed to fetch conversation messages');
      }
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMessages([]);
      setMetadata(null);
      setIsPaused(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchMessages(userId);
    } else {
      setMessages([]);
      setMetadata(null);
      setIsPaused(false);
      setError(null);
    }
  }, [userId]);

  const refreshMessages = () => {
    if (userId) {
      fetchMessages(userId);
    }
  };

  return {
    messages,
    metadata,
    isPaused,
    isLoading,
    error,
    refreshMessages,
  };
}