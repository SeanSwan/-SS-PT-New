/**
 * ============================================================================
 * FILE: GlobalClientContext.tsx
 * PURPOSE: Global active-client state shared across all trainer/admin tabs
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a shared context for selecting and managing
 * the "active client" across all dashboard pages. When a trainer/admin selects
 * a client, every tab (Progress, Workouts, Nutrition) instantly sees that client.
 *
 * HOW IT FITS IN THE APP: Wraps UniversalDashboardLayout for trainer/admin roles
 * KEY DECISIONS: sessionStorage persistence, role-based endpoint selection
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from './AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Interfaces for active client and context shape
// ─────────────────────────────────────────────────────────────

export interface ActiveClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  role?: string;
}

export interface GlobalClientContextType {
  activeClient: ActiveClient | null;
  setActiveClient: (client: ActiveClient | null) => void;
  clearActiveClient: () => void;
  clientList: ActiveClient[];
  loadingClients: boolean;
  refreshClients: () => Promise<void>;
}

const SESSION_KEY = 'ss-active-client';

const GlobalClientContext = createContext<GlobalClientContextType | null>(null);

// ─────────────────────────────────────────────────────────────
// SECTION: Provider
// PURPOSE: Fetches client list based on role, manages active selection
// ─────────────────────────────────────────────────────────────

export const GlobalClientProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, authAxios } = useAuth();
  const [activeClient, setActiveClientState] = useState<ActiveClient | null>(null);
  const [clientList, setClientList] = useState<ActiveClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Restore active client from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        setActiveClientState(JSON.parse(stored));
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  /** Normalize API responses into a flat ActiveClient array */
  const normalizeClients = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any, role: string): ActiveClient[] => {
      if (role === 'admin') {
        const raw = data?.data?.clients ?? (Array.isArray(data?.data) ? data.data : []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return raw.map((c: any) => ({
          id: c.id,
          firstName: c.firstName ?? '',
          lastName: c.lastName ?? '',
          email: c.email ?? '',
          photo: c.profileImageUrl ?? c.photo,
          role: c.role,
        }));
      }

      // Trainer — assignments have a nested client object
      const assignments = Array.isArray(data?.data) ? data.data : data?.data?.assignments ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return assignments.map((a: any) => {
        const c = a.client ?? a.Client ?? a;
        return {
          id: c.id,
          firstName: c.firstName ?? '',
          lastName: c.lastName ?? '',
          email: c.email ?? '',
          photo: c.profileImageUrl ?? c.photo,
          role: c.role,
        };
      });
    },
    [],
  );

  /** Fetch the client list from the role-appropriate endpoint */
  const refreshClients = useCallback(async () => {
    if (!user || !authAxios || (user.role !== 'admin' && user.role !== 'trainer')) return;

    setLoadingClients(true);
    try {
      const endpoint =
        user.role === 'admin'
          ? '/api/admin/clients'
          : `/api/client-trainer-assignments/trainer/${user.id}`;

      const response = await authAxios.get(endpoint);
      setClientList(normalizeClients(response.data, user.role));
    } catch (err) {
      console.error('[GlobalClientContext] Failed to fetch clients:', err);
    } finally {
      setLoadingClients(false);
    }
  }, [user, authAxios, normalizeClients]);

  // Fetch on mount when user is available
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'trainer')) {
      refreshClients();
    }
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Set active client and persist to sessionStorage */
  const setActiveClient = useCallback((client: ActiveClient | null) => {
    setActiveClientState(client);
    if (client) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(client));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const clearActiveClient = useCallback(() => {
    setActiveClientState(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo<GlobalClientContextType>(
    () => ({
      activeClient,
      setActiveClient,
      clearActiveClient,
      clientList,
      loadingClients,
      refreshClients,
    }),
    [activeClient, setActiveClient, clearActiveClient, clientList, loadingClients, refreshClients],
  );

  return (
    <GlobalClientContext.Provider value={value}>
      {children}
    </GlobalClientContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// PURPOSE: Convenience hook with safety check
// ─────────────────────────────────────────────────────────────

export const useGlobalClient = (): GlobalClientContextType => {
  const ctx = useContext(GlobalClientContext);
  if (!ctx) {
    throw new Error('useGlobalClient must be used within a GlobalClientProvider');
  }
  return ctx;
};

export default GlobalClientContext;
