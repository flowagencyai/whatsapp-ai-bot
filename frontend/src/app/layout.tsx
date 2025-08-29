'use client';

import React, { useState } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Header } from '@/components/navigation/Header';
import { WebSocketProvider } from '@/providers/WebSocketProvider';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>WhatsApp Bot Dashboard</title>
        <meta name="description" content="Dashboard para gerenciamento do WhatsApp Bot" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
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
      </body>
    </html>
  );
}