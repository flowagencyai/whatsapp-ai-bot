'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff,
  Loader2
} from 'lucide-react';
import { useBotStatus } from '@/hooks/useBotStatus';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatRelativeTime } from '@/lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { status } = useBotStatus();
  const { isConnected: wsConnected } = useWebSocket();

  const getStatusBadge = () => {
    if (!status) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando...
        </Badge>
      );
    }

    switch (status.status) {
      case 'connected':
        return (
          <Badge variant="success" className="gap-1">
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Conectando
          </Badge>
        );
      case 'qr':
        return (
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aguardando QR
          </Badge>
        );
      default:
        return (
          <Badge variant="error" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page Title - will be dynamic based on route */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>

      {/* Status and Controls */}
      <div className="flex items-center gap-4">
        {/* WebSocket Status */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <div className={cn(
            "h-2 w-2 rounded-full",
            wsConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-xs">
            {wsConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {/* Bot Status */}
        {getStatusBadge()}

        {/* User Info */}
        {status?.user && (
          <div className="hidden lg:flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={status.user.profilePicture} />
              <AvatarFallback>
                {status.user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{status.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {status.user.number}
              </p>
            </div>
          </div>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
        </Button>

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}