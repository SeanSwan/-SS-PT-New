/**
 * Authentication context runtime shared by the provider and consumer hook.
 *
 * Keeping this non-component module separate prevents hook exports from
 * invalidating the AuthProvider Fast Refresh boundary.
 */
import { createContext, useContext } from 'react';
import type { AuthContextType } from './AuthContextProvider';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
