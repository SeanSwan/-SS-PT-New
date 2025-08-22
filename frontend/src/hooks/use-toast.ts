/**
 * Simple Toast Hook - Build Safe Version
 * =====================================
 * Ultra-simple implementation that won't cause build issues
 */

import { useCallback } from 'react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

export const useToast = () => {
  const toast = useCallback((props: ToastProps) => {
    // Simple console logging for now - can be enhanced later
    if (props.variant === 'destructive') {
      console.error(`Error: ${props.title}`, props.description);
    } else if (props.variant === 'success') {
      console.info(`Success: ${props.title}`, props.description);
    } else {
      console.log(`Info: ${props.title}`, props.description);
    }

    // Optional browser alert for important messages (can be removed if needed)
    if (props.variant === 'destructive') {
      alert(`Error: ${props.title}`);
    }

    return Math.random().toString(36).substr(2, 9);
  }, []);

  return {
    toast
  };
};
