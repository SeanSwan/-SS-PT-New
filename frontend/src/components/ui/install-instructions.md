# Installation Instructions for Sonner

To fix the import error and enable the toast functionality, you need to install the "sonner" package in your project. Follow these steps:

## Installation

Run one of the following commands in your project directory:

```bash
# Using npm
npm install sonner

# Using yarn
yarn add sonner

# Using pnpm
pnpm add sonner
```

## After Installation

Once installed, you'll need to update the `toast.ts` file to use the actual sonner implementation instead of the placeholder. Replace the contents of your toast.ts file with:

```typescript
import { toast as sonnerToast, ExternalToast } from 'sonner';

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
export const toast = {
  // Default toast
  default: ({ title, description, ...props }: ToastProps) => {
    return sonnerToast(title, {
      description,
      ...props,
    });
  },
  
  // Success toast
  success: ({ title, description, ...props }: ToastProps) => {
    return sonnerToast.success(title, {
      description,
      ...props,
    });
  },

  // Error toast
  error: ({ title, description, ...props }: ToastProps) => {
    return sonnerToast.error(title, {
      description,
      ...props,
    });
  },

  // Warning toast
  warning: ({ title, description, ...props }: ToastProps) => {
    return sonnerToast(title, {
      description,
      style: { backgroundColor: 'var(--warning-bg, #FFF7E6)', borderColor: 'var(--warning-border, #FFBD5A)' },
      ...props,
    });
  },

  // Info toast
  info: ({ title, description, ...props }: ToastProps) => {
    return sonnerToast(title, {
      description,
      style: { backgroundColor: 'var(--info-bg, #E6F7FF)', borderColor: 'var(--info-border, #69C0FF)' },
      ...props,
    });
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
    return sonnerToast.promise(promise, options);
  },
};
```

## Add the Toaster Component to Your Application Layout

Also, add the Sonner Toaster component to your root layout or app component:

```jsx
import { Toaster } from 'sonner';

function MyApp() {
  return (
    <div>
      {/* Your app content */}
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default MyApp;
```

This will ensure the toast notifications appear properly in your application.
