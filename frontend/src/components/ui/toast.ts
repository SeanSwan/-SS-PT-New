import { ExternalToast } from 'sonner';

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
} & Partial<ExternalToast>;

/**
 * Toast utility that provides consistent toast notifications
 * throughout the application. This is a wrapper around sonner's toast
 * functionality with our custom styling and configuration.
 */
// We'll implement the actual toast functions once sonner is installed
export const toast = {
  // Default toast
  default: (props: ToastProps) => {
    console.warn('Sonner package needs to be installed to show toast notifications');
    console.info('Toast notification:', props);
  },
  
  // Success toast
  success: (props: ToastProps) => {
    console.warn('Sonner package needs to be installed to show toast notifications');
    console.info('Success toast notification:', props);
  },

  // Error toast
  error: (props: ToastProps) => {
    console.warn('Sonner package needs to be installed to show toast notifications');
    console.info('Error toast notification:', props);
  },

  // Warning toast
  warning: (props: ToastProps) => {
    console.warn('Sonner package needs to be installed to show toast notifications');
    console.info('Warning toast notification:', props);
  },

  // Info toast
  info: (props: ToastProps) => {
    console.warn('Sonner package needs to be installed to show toast notifications');
    console.info('Info toast notification:', props);
  },

  // Promise toast
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    } & ToastProps
  ) => {
    console.warn('Sonner package needs to be installed to show toast notifications');
    console.info('Promise toast notification:', options);
    return promise;
  },
};
