import { useCallback } from 'react';

/**
 * Enhanced Toast Hook for Admin Dashboard
 * =====================================
 * Professional toast notification system with visual feedback
 * Replaces the basic console.log implementation with proper UI notifications
 */

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast container styles
const TOAST_CONTAINER_ID = 'swan-toast-container';
const TOAST_STYLES = {
  container: `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  `,
  toast: {
    default: `
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: white;
    `,
    destructive: `
      background: linear-gradient(135deg, #dc2626, #ef4444);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: white;
    `,
    success: `
      background: linear-gradient(135deg, #059669, #10b981);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: white;
    `,
    warning: `
      background: linear-gradient(135deg, #d97706, #f59e0b);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: white;
    `,
    info: `
      background: linear-gradient(135deg, #0369a1, #0ea5e9);
      border: 1px solid rgba(14, 165, 233, 0.3);
      color: white;
    `
  },
  base: `
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    pointer-events: auto;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  `,
  title: `
    font-weight: 600;
    margin-bottom: 4px;
    font-size: 15px;
  `,
  description: `
    opacity: 0.9;
    font-size: 13px;
    line-height: 1.3;
  `,
  action: `
    margin-top: 12px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-block;
  `,
  closeButton: `
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 4px;
    color: white;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    transition: all 0.2s ease;
  `
};

// Ensure toast container exists
function ensureToastContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.cssText = TOAST_STYLES.container;
    document.body.appendChild(container);
  }
  return container;
}

// Create and show toast
function createToast(options: ToastOptions): void {
  const {
    title,
    description,
    variant = 'default',
    duration = variant === 'destructive' ? 7000 : 4000,
    action
  } = options;

  const container = ensureToastContainer();
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.style.cssText = TOAST_STYLES.base + TOAST_STYLES.toast[variant];
  
  // Create content
  let content = `<div style="${TOAST_STYLES.title}">${title}</div>`;
  if (description) {
    content += `<div style="${TOAST_STYLES.description}">${description}</div>`;
  }
  if (action) {
    content += `<button class="toast-action" style="${TOAST_STYLES.action}">${action.label}</button>`;
  }
  
  // Add close button
  content += `<button class="toast-close" style="${TOAST_STYLES.closeButton}">×</button>`;
  
  toast.innerHTML = content;
  
  // Add event listeners
  const closeButton = toast.querySelector('.toast-close');
  const actionButton = toast.querySelector('.toast-action');
  
  const removeToast = () => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };
  
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });
  }
  
  if (actionButton && action) {
    actionButton.addEventListener('click', (e) => {
      e.stopPropagation();
      action.onClick();
      removeToast();
    });
  }
  
  // Click to dismiss
  toast.addEventListener('click', removeToast);
  
  // Add to container
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
  
  // Add hover effects
  toast.addEventListener('mouseenter', () => {
    toast.style.transform = 'translateX(0) scale(1.02)';
  });
  
  toast.addEventListener('mouseleave', () => {
    toast.style.transform = 'translateX(0) scale(1)';
  });
}

// Enhanced toast hook
export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    // Create visual toast notification
    createToast(options);
    
    // Also log to console for debugging
    const logLevel = options.variant === 'destructive' ? 'error' : 
                    options.variant === 'warning' ? 'warn' : 
                    options.variant === 'success' ? 'info' : 'log';
    
    console[logLevel](`[Toast ${options.variant?.toUpperCase()}] ${options.title}${options.description ? ': ' + options.description : ''}`);
    
    // Browser alert for critical errors (as fallback)
    if (options.variant === 'destructive') {
      console.error('CRITICAL ERROR:', options.title, options.description);
    }
  }, []);

  return { toast };
}

// Export types for external use
export type { ToastOptions };

// Global toast function for use outside React components
(window as any).showToast = createToast;

console.log('✨ Enhanced toast system loaded - visual notifications ready!');
