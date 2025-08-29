import { useState, useEffect } from 'react';

export interface Conversation {
  id: string;
  remoteJid: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  status: 'active' | 'paused' | 'ended';
  profilePicture?: string;
}

interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
  total: number;
  timestamp: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchConversations = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3000/api/conversations');
      const data: ConversationsResponse = await response.json();

      if (data.success) {
        setConversations(data.conversations);
        setLastFetch(new Date());
      } else {
        throw new Error('Failed to fetch conversations');
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Refresh conversations every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshConversations = () => {
    setIsLoading(true);
    fetchConversations();
  };

  return {
    conversations,
    isLoading,
    error,
    lastFetch,
    refreshConversations,
  };
}