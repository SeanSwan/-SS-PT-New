import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

export interface ActiveClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  bodyMapHeadPhoto?: string;
  gender?: string;
  role?: string;
  availableSessions?: number;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external';
  membershipLevel?: 'basic' | 'premium' | 'elite';
  totalWorkouts?: number;
  lastWorkoutDate?: string;
  nextSessionDate?: string;
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
export const ADMIN_CLIENT_LIST_LIMIT = 500;

const optionalGender = (value: unknown) => (value ? { gender: String(value) } : {});

export function normalizeClientListResponse(data: any, role: string): ActiveClient[] {
  if (role === 'admin') {
    const raw = data?.data?.clients ?? (Array.isArray(data?.data) ? data.data : []);
    return raw.map((c: any) => ({
      id: c.id,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      photo: c.profileImageUrl ?? c.photo,
      bodyMapHeadPhoto: c.bodyMapHeadPhoto ?? undefined,
      ...optionalGender(c.gender),
      role: c.role,
      availableSessions: typeof c.availableSessions === 'number' ? c.availableSessions : undefined,
      clientSource: c.clientSource ?? undefined,
      membershipLevel: c.membershipLevel ?? undefined,
      totalWorkouts: typeof c.totalWorkouts === 'number' ? c.totalWorkouts : undefined,
      lastWorkoutDate: c.lastWorkoutDate ?? c.lastWorkout?.date ?? c.lastWorkout?.sessionDate ?? undefined,
      nextSessionDate: c.nextSessionDate ?? c.nextSession?.sessionDate ?? c.nextSession?.date ?? undefined,
    }));
  }

  const assignments = Array.isArray(data?.assignments)
    ? data.assignments
    : Array.isArray(data?.data)
    ? data.data
    : data?.data?.assignments ?? [];

  return assignments.map((a: any) => {
    const c = a.client ?? a.Client ?? a;
    return {
      id: c.id,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      photo: c.profileImageUrl ?? c.photo,
      bodyMapHeadPhoto: c.bodyMapHeadPhoto ?? undefined,
      ...optionalGender(c.gender),
      role: c.role,
      availableSessions: typeof c.availableSessions === 'number' ? c.availableSessions : undefined,
      clientSource: c.clientSource ?? undefined,
      totalWorkouts: typeof c.totalWorkouts === 'number' ? c.totalWorkouts : undefined,
      lastWorkoutDate: c.lastWorkoutDate ?? c.lastWorkout?.date ?? c.lastWorkout?.sessionDate ?? undefined,
      nextSessionDate: c.nextSessionDate ?? c.nextSession?.sessionDate ?? c.nextSession?.date ?? undefined,
    };
  });
}

const normalizeClients = normalizeClientListResponse;
const GlobalClientContext = createContext<GlobalClientContextType | null>(null);

export const GlobalClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authAxios } = useAuth();
  const [activeClient, setActiveClientState] = useState<ActiveClient | null>(null);
  const [clientList, setClientList] = useState<ActiveClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setActiveClientState(JSON.parse(stored));
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const refreshClients = useCallback(async () => {
    if (!user || !authAxios || (user.role !== 'admin' && user.role !== 'trainer')) return;
    setLoadingClients(true);
    try {
      const endpoint = user.role === 'admin'
        ? '/api/admin/clients'
        : `/api/client-trainer-assignments/trainer/${user.id}`;
      const config = user.role === 'admin' ? { params: { limit: ADMIN_CLIENT_LIST_LIMIT } } : undefined;
      const response = await authAxios.get(endpoint, config);
      setClientList(normalizeClients(response.data, user.role));
    } catch (err) {
      console.error('[GlobalClientContext] Failed to fetch clients:', err);
    } finally {
      setLoadingClients(false);
    }
  }, [user, authAxios]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'trainer')) refreshClients();
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeClient || clientList.length === 0) return;
    const fresh = clientList.find((client) => client.id === activeClient.id);
    if (!fresh) return;
    const merged = { ...activeClient, ...fresh };
    const changed = JSON.stringify(merged) !== JSON.stringify(activeClient);
    if (changed) {
      setActiveClientState(merged);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    }
  }, [activeClient?.id, clientList]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveClient = useCallback((client: ActiveClient | null) => {
    setActiveClientState(client);
    if (client) sessionStorage.setItem(SESSION_KEY, JSON.stringify(client));
    else sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const clearActiveClient = useCallback(() => {
    setActiveClientState(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo<GlobalClientContextType>(() => ({
    activeClient,
    setActiveClient,
    clearActiveClient,
    clientList,
    loadingClients,
    refreshClients,
  }), [activeClient, setActiveClient, clearActiveClient, clientList, loadingClients, refreshClients]);

  return <GlobalClientContext.Provider value={value}>{children}</GlobalClientContext.Provider>;
};

export function useGlobalClient() {
  const context = useContext(GlobalClientContext);
  if (!context) throw new Error('useGlobalClient must be used within GlobalClientProvider');
  return context;
}

/**
 * Non-throwing variant of {@link useGlobalClient}. Returns null when rendered
 * outside a GlobalClientProvider, so fail-safe read-only callers (e.g. resolving
 * a client's PDF brand identity from the roster, or an isolated test harness)
 * degrade gracefully instead of crashing the tree.
 */
export function useOptionalGlobalClient(): GlobalClientContextType | null {
  return useContext(GlobalClientContext);
}

export default GlobalClientContext;
