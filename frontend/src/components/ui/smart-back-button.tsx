'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

interface SmartBackButtonProps {
  title?: string;
  variant?: 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  forceShow?: boolean;
}

export function SmartBackButton({ 
  title = "Voltar ao Dashboard", 
  variant = "ghost", 
  size = "icon",
  className = "",
  forceShow = false
}: SmartBackButtonProps) {
  const { smartBack, getDashboardRoute } = useSmartNavigation();
  const { user } = useAuth();
  const pathname = usePathname();

  // Não mostrar o botão se já estamos na página de dashboard correspondente ao usuário
  // A menos que forceShow seja true
  if (!forceShow) {
    const userDashboard = getDashboardRoute();
    if (pathname === userDashboard || pathname === `${userDashboard}/dashboard`) {
      return null;
    }
  }

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={smartBack}
      title={title}
      className={className}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}