'use client';

import React from 'react';
import { Button, ButtonProps } from './button';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <Button
      disabled={loading || disabled}
      className={`relative ${loading ? 'cursor-not-allowed' : ''} ${className || ''}`}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {loading ? (loadingText || 'Salvando...') : children}
    </Button>
  );
};