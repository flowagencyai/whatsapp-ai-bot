'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageCircle, 
  Users, 
  Clock, 
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Timer
} from 'lucide-react';
import { DashboardStats } from '@/types';
import { formatNumber, formatUptime } from '@/lib/utils';

interface StatsCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isLoading?: boolean;
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendValue,
  isLoading 
}: StatCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        
        {(description || trendValue) && (
          <div className="flex items-center gap-1 mt-1">
            {trendValue && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{trendValue}</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCard
            key={i}
            title=""
            value=""
            icon={<div />}
            isLoading={true}
          />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Calculate trends (mock data - you should calculate based on historical data)
  const messagesTrend = stats.messagesLastDay > stats.messagesLastHour * 24 ? 'up' : 'down';
  const conversationsTrend = stats.activeConversations > stats.pausedConversations ? 'up' : 'neutral';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total de Conversas"
        value={stats.totalConversations}
        description="Todas as conversas"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        trend={conversationsTrend}
        trendValue={`${stats.activeConversations} ativas`}
      />
      
      <StatCard
        title="Conversas Ativas"
        value={stats.activeConversations}
        description="Conversas em andamento"
        icon={<MessageCircle className="h-4 w-4 text-green-600" />}
        trend="up"
        trendValue={`${stats.pausedConversations} pausadas`}
      />
      
      <StatCard
        title="Mensagens (24h)"
        value={stats.messagesLastDay}
        description="Últimas 24 horas"
        icon={<Activity className="h-4 w-4 text-blue-600" />}
        trend={messagesTrend}
        trendValue={`${stats.messagesLastHour} na última hora`}
      />
      
      <StatCard
        title="Tempo de Resposta"
        value={`${stats.averageResponseTime.toFixed(1)}s`}
        description="Tempo médio"
        icon={<Clock className="h-4 w-4 text-orange-600" />}
        trend={stats.averageResponseTime < 5 ? 'up' : 'neutral'}
        trendValue={stats.averageResponseTime < 5 ? 'Excelente' : 'Bom'}
      />
      
      <StatCard
        title="Total de Mensagens"
        value={stats.totalMessages}
        description="Desde o início"
        icon={<MessageCircle className="h-4 w-4 text-purple-600" />}
      />
      
      <StatCard
        title="Mensagens/Hora"
        value={stats.messagesLastHour}
        description="Última hora"
        icon={<TrendingUp className="h-4 w-4 text-green-600" />}
      />
      
      <StatCard
        title="Uptime do Bot"
        value={formatUptime(parseInt(stats.botUptime) || 0)}
        description="Tempo online"
        icon={<Timer className="h-4 w-4 text-blue-600" />}
        trend="up"
        trendValue="Estável"
      />
      
      <StatCard
        title="Conversas Pausadas"
        value={stats.pausedConversations}
        description="Temporariamente pausadas"
        icon={<MessageCircle className="h-4 w-4 text-yellow-600" />}
      />
    </div>
  );
}