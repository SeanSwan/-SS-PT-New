/**
 * useToast Hook - Professional Toast Notification System
 * =====================================================
 * A modern, accessible toast notification system for the Universal Master Schedule
 * and other SwanStudios components.
 * 
 * Features:
 * - Multiple toast variants (default, success, warning, destructive)
 * - Auto-dismiss with configurable duration
 * - Stacked notifications with smooth animations
 * - Accessibility support with ARIA live regions
 * - Mobile-responsive design
 * - Stellar theme integration
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// Types
export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Styled Components
const ToastContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  width: 400px;
  max-width: 90vw;
  pointer-events: none;
  
  @media (max-width: 768px) {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
    width: auto;
  }
`;

const ToastWrapper = styled(motion.div)<{ variant: Toast['variant'] }>`
  background: ${props => {
    switch (props.variant) {
      case 'success':
        return 'rgba(34, 197, 94, 0.1)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.1)';
      case 'destructive':
        return 'rgba(239, 68, 68, 0.1)';
      case 'info':
        return 'rgba(59, 130, 246, 0.1)';
      default:
        return 'rgba(30, 41, 59, 0.95)';
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'success':
        return 'rgba(34, 197, 94, 0.3)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.3)';
      case 'destructive':
        return 'rgba(239, 68, 68, 0.3)';
      case 'info':
        return 'rgba(59, 130, 246, 0.3)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props => {
      switch (props.variant) {
        case 'success':
          return 'linear-gradient(90deg, #22c55e, #16a34a)';
        case 'warning':
          return 'linear-gradient(90deg, #f59e0b, #d97706)';
        case 'destructive':
          return 'linear-gradient(90deg, #ef4444, #dc2626)';
        case 'info':
          return 'linear-gradient(90deg, #3b82f6, #2563eb)';
        default:
          return 'linear-gradient(90deg, #00ffff, #3b82f6)';
      }
    }};
  }
`;

const ToastContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const ToastIcon = styled.div<{ variant: Toast['variant'] }>`
  width: 20px;
  height: 20px;
  color: ${props => {
    switch (props.variant) {
      case 'success':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'destructive':
        return '#ef4444';
      case 'info':
        return '#3b82f6';
      default:
        return '#00ffff';
    }
  }};
  
  flex-shrink: 0;
  margin-top: 1px;
`;

const ToastText = styled.div`
  flex: 1;
  min-width: 0;
`;

const ToastTitle = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: white;
  margin-bottom: 0.25rem;
  line-height: 1.4;
`;

const ToastDescription = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
`;

const ToastActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const ToastAction = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
`;

// Toast Component
const ToastComponent: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.variant) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'destructive':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <CheckCircle size={20} />;
    }
  };

  return (
    <ToastWrapper
      variant={toast.variant}
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <ToastContent>
        <ToastIcon variant={toast.variant}>
          {getIcon()}
        </ToastIcon>
        
        <ToastText>
          {toast.title && (
            <ToastTitle>{toast.title}</ToastTitle>
          )}
          <ToastDescription>{toast.description}</ToastDescription>
          
          {toast.action && (
            <ToastActions>
              <ToastAction onClick={toast.action.onClick}>
                {toast.action.label}
              </ToastAction>
            </ToastActions>
          )}
        </ToastText>
      </ToastContent>
      
      <CloseButton
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </CloseButton>
    </ToastWrapper>
  );
};

// Provider Component
interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const toast = useCallback((toastOptions: Omit<Toast, 'id'>) => {
    const id = generateId();
    const duration = toastOptions.duration ?? 4000;
    
    const newToast: Toast = {
      id,
      variant: 'default',
      ...toastOptions,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      const timeout = setTimeout(() => {
        dismiss(id);
      }, duration);
      
      timeoutRefs.current.set(id, timeout);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    // Clear timeout
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
    
    // Remove toast
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    
    // Remove all toasts
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    toast,
    dismiss,
    dismissAll
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer>
        <div role="region" aria-label="Notifications" aria-live="polite">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <ToastComponent
                key={toast.id}
                toast={toast}
                onDismiss={dismiss}
              />
            ))}
          </AnimatePresence>
        </div>
      </ToastContainer>
    </ToastContext.Provider>
  );
};

// Convenience functions for common toast types
export const toastSuccess = (message: string, title?: string) => {
  const context = useContext(ToastContext);
  if (context) {
    context.toast({
      variant: 'success',
      title,
      description: message
    });
  }
};

export const toastError = (message: string, title?: string) => {
  const context = useContext(ToastContext);
  if (context) {
    context.toast({
      variant: 'destructive',
      title,
      description: message
    });
  }
};

export const toastWarning = (message: string, title?: string) => {
  const context = useContext(ToastContext);
  if (context) {
    context.toast({
      variant: 'warning',
      title,
      description: message
    });
  }
};

export const toastInfo = (message: string, title?: string) => {
  const context = useContext(ToastContext);
  if (context) {
    context.toast({
      variant: 'info',
      title,
      description: message
    });
  }
};

export default useToast;
