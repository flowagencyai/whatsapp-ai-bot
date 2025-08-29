'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  QrCode,
  MessageCircle,
  ScrollText,
  Settings,
  Bot,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
  description?: string;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Visão geral do sistema',
  },
  {
    title: 'QR Code',
    href: '/qr',
    icon: QrCode,
    description: 'Autenticação WhatsApp',
  },
  {
    title: 'Conversas',
    href: '/conversations',
    icon: MessageCircle,
    description: 'Gerenciar conversas',
  },
  {
    title: 'Logs',
    href: '/logs',
    icon: ScrollText,
    description: 'Histórico de eventos',
  },
  {
    title: 'Configurações',
    href: '/settings',
    icon: Settings,
    description: 'Configurações do bot',
  },
];

export function Sidebar({ isOpen = true, onToggle, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-whatsapp-green" />
            <div>
              <h1 className="text-lg font-semibold">WhatsApp Bot</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggle}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => {
                  // Close mobile menu when navigating
                  if (window.innerWidth < 768 && onToggle) {
                    onToggle();
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">Sistema Online</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Todos os serviços funcionando normalmente
            </p>
          </div>
        </div>
      </div>
    </>
  );
}