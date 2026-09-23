import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api.service';
import { mapStorefrontItemToStoreItem } from './components/storeCatalog';
import type { StoreItem } from './components/storeCatalog.types';

export type StorefrontCatalogStatus = 'loading' | 'ready' | 'empty' | 'error';
export interface StorefrontCatalogState {
  items: StoreItem[];
  pricesVisible: boolean;
  status: StorefrontCatalogStatus;
  error: string | null;
  retry: () => void;
}
type InternalCatalogState = Omit<StorefrontCatalogState, 'retry'> & { identityKey: string | null };

const getItems = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.packages)) return record.packages;
  if (Array.isArray(record.data)) return record.data;
  return [];
};

const getTheme = (item: unknown, index: number): string => {
  const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
  const order = typeof record.displayOrder === 'number' ? record.displayOrder : index + 1;
  return ['ruby', 'emerald', 'cosmic', 'purple'][(Math.max(1, Math.trunc(order)) - 1) % 4];
};

export const useStorefrontCatalog = (): StorefrontCatalogState => {
  const { isAuthenticated, user } = useAuth();
  const identityKey = isAuthenticated && user?.id ? String(user.id) : 'anonymous';
  const requestGeneration = useRef(0);
  const [state, setState] = useState<InternalCatalogState>({ items: [], pricesVisible: false, status: 'loading', error: null, identityKey: null });
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => setRetryToken((value) => value + 1), []);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    let mounted = true;
    const isCurrent = () => mounted && requestGeneration.current === generation;

    // Clear privileged values synchronously with identity changes. A late response
    // from the prior identity is rejected by the generation guard below.
    setState({ items: [], pricesVisible: false, status: 'loading', error: null, identityKey });

    void Promise.resolve(api.get('/api/storefront')).then((response) => {
      if (!isCurrent()) return;
      const rawItems = getItems(response.data);
      const items = rawItems.map((item, index) => mapStorefrontItemToStoreItem(item, getTheme(item, index)));
      setState({ items, pricesVisible: response.data?.pricesVisible === true, status: items.length ? 'ready' : 'empty', error: null, identityKey });
    }).catch(() => {
      if (!isCurrent()) return;
      setState({ items: [], pricesVisible: false, status: 'error', error: 'Failed to load packages', identityKey });
    });

    return () => { mounted = false; };
  }, [identityKey, retryToken]);

  const visibleState = state.identityKey === identityKey
    ? state
    : { items: [], pricesVisible: false, status: 'loading' as const, error: null, identityKey };
  return useMemo(() => ({ items: visibleState.items, pricesVisible: visibleState.pricesVisible, status: visibleState.status, error: visibleState.error, retry }), [retry, visibleState]);
};

export default useStorefrontCatalog;
