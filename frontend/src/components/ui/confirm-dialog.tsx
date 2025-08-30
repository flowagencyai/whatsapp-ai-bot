'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, X, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from './button';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'success' | 'info';
  icon?: 'warning' | 'danger' | 'success' | 'info';
  onConfirm?: () => void | Promise<void>;
}

interface ConfirmContextType {
  confirm: (options: Omit<ConfirmOptions, 'onConfirm'>) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    options: null,
  });

  const confirm = useCallback((options: Omit<ConfirmOptions, 'onConfirm'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options: options as ConfirmOptions,
        resolve,
      });
    });
  }, []);

  const handleConfirm = async () => {
    if (confirmState.options?.onConfirm) {
      await confirmState.options.onConfirm();
    }
    confirmState.resolve?.(true);
    setConfirmState({ isOpen: false, options: null });
  };

  const handleCancel = () => {
    confirmState.resolve?.(false);
    setConfirmState({ isOpen: false, options: null });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState.isOpen && (
        <ConfirmDialog
          options={confirmState.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

const ConfirmDialog: React.FC<{
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ options, onConfirm, onCancel }) => {
  if (!options) return null;

  const handleCancel = () => {
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  // Icon and color configuration
  const getIconConfig = () => {
    const iconType = options.icon || (options.variant === 'destructive' ? 'danger' : 'warning');
    
    switch (iconType) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          ringColor: 'ring-green-200'
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          ringColor: 'ring-blue-200'
        };
      case 'danger':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          ringColor: 'ring-red-200'
        };
      default:
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-100',
          iconColor: 'text-amber-600',
          ringColor: 'ring-amber-200'
        };
    }
  };

  const iconConfig = getIconConfig();
  const IconComponent = iconConfig.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Enhanced Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 opacity-100"
        onClick={handleCancel}
      />
      
      {/* Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out sm:my-8 sm:w-full sm:max-w-lg opacity-100 scale-100 translate-y-0">
          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 group"
          >
            <X className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          {/* Content */}
          <div className="bg-white px-6 pb-6 pt-6">
            <div className="sm:flex sm:items-start">
              {/* Enhanced Icon - MODAL MODERNIZADO */}
              <div className={`mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full ${iconConfig.bgColor} ring-8 ${iconConfig.ringColor} sm:mx-0 sm:h-12 sm:w-12 sm:ring-4`}>
                <IconComponent className={`h-8 w-8 sm:h-6 sm:w-6 ${iconConfig.iconColor}`} />
              </div>
              
              {/* Text Content */}
              <div className="mt-4 text-center sm:ml-6 sm:mt-0 sm:text-left">
                <h3 className="text-xl font-bold leading-6 text-gray-900 sm:text-lg">
                  🎨 {options.title}
                </h3>
                <div className="mt-3">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {options.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Action Buttons */}
          <div className="bg-gray-50/50 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3">
            <Button
              onClick={handleConfirm}
              variant={options.variant === 'destructive' ? 'destructive' : 'default'}
              className="w-full sm:w-auto min-w-[100px] font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
              {options.confirmText || 'Confirmar'}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="mt-3 w-full sm:mt-0 sm:w-auto min-w-[100px] font-semibold border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              {options.cancelText || 'Cancelar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};