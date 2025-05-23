import { useCallback } from 'react';

/**
 * Simple toast hook for showing notifications
 * In a real implementation, this would use a toast library or component
 */
export function useToast() {
  const toast = useCallback(({ title, description, variant = 'default' }) => {
    // In a production implementation, this would show a toast notification
    // For now, we just log to console
    console.log(`[${variant.toUpperCase()}] ${title}: ${description}`);
    
    // If this is a critical error, also use browser alert for visibility
    if (variant === 'destructive') {
      alert(`${title}\n${description}`);
    }
  }, []);

  return { toast };
}
