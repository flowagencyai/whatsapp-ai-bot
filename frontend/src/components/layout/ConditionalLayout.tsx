'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Header } from '@/components/navigation/Header';
import { WebSocketProvider } from '@/providers/WebSocketProvider';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

// Rotas que não devem usar o layout do dashboard
const STANDALONE_ROUTES = [
  '/', // Landing page
  '/auth/login',
  '/auth/register', 
  '/admin/login',
  '/admin/unauthorized'
];

// Rotas que devem usar layout simples (sem sidebar)
const SIMPLE_LAYOUT_ROUTES = [
  '/dashboard' // Dashboard de usuário comum
];

// Rotas administrativas que devem usar layout completo
const ADMIN_ROUTES = [
  '/admin',
  '/admin/config',
  '/admin/users', 
  '/admin/logs',
  '/qr',
  '/conversations',
  '/settings'
];

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Landing page e páginas de auth não usam layout
  if (STANDALONE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Dashboard de usuário usa layout simples
  if (SIMPLE_LAYOUT_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Rotas administrativas usam layout completo com sidebar
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  if (isAdminRoute) {
    return (
      <WebSocketProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onToggle={toggleSidebar}
          />
          
          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuToggle={toggleSidebar} />
            
            <main className="flex-1 overflow-y-auto bg-muted/50 p-4 lg:p-6">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </WebSocketProvider>
    );
  }

  // Fallback: retorna sem layout para outras rotas
  return <>{children}</>;
}