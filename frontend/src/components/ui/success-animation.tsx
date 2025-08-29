'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  show,
  message = 'Sucesso!',
  duration = 2000,
  onComplete
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-8 shadow-2xl transform animate-in zoom-in duration-300">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 animate-bounce" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message}
          </h3>
          <div className="w-24 h-1 bg-green-500 rounded-full mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};