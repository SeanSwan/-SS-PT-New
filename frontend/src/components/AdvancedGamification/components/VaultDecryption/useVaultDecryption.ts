/**
 * FILE: useVaultDecryption.ts
 * PURPOSE: Roll, animate, and collect vault drops through safe user paths.
 */

import { useCallback, useState } from 'react';
import apiService from '../../../../services/api.service';
import { getGamificationUserPath } from '../../utils/gamificationPath';
import type { VaultDrop, VaultDropResult } from './VaultDecryptionTypes';

const API_BASE = '/api/gamification';

interface VaultApiResponse {
  success: boolean;
  data: VaultDropResult;
}

interface VaultInventoryResponse {
  success: boolean;
  data: {
    inventory: VaultDrop[];
  };
}

const parseBody = (body: BodyInit | null | undefined) => {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const method = (opts?.method || 'GET').toUpperCase();
  const data = parseBody(opts?.body);
  const config = { validateStatus: () => true };
  const url = `${API_BASE}${path}`;
  const res = method === 'POST'
    ? await apiService.post(url, data, config)
    : method === 'PUT'
      ? await apiService.put(url, data, config)
      : method === 'DELETE'
        ? await apiService.delete(url, config)
        : await apiService.get(url, config);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`API error ${res.status}`);
  }

  const payload = res.data as { success?: unknown } | null | undefined;
  if (payload?.success === false) {
    throw new Error('API error');
  }

  return res.data as T;
}

export function useVaultDecryption(userId: number | null | undefined) {
  const [currentDrop, setCurrentDrop] = useState<VaultDrop | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inventory, setInventory] = useState<VaultDrop[]>([]);
  const [loading, setLoading] = useState(false);

  const rollForDrop = useCallback(async (actionType: string): Promise<VaultDropResult | null> => {
    const rollPath = getGamificationUserPath(userId, '/vault/roll');
    if (!rollPath) return null;

    try {
      const result = await apiFetch<VaultApiResponse>(rollPath, {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      });

      if (result.success && result.data.dropped) {
        setCurrentDrop(result.data.drop);
        setIsAnimating(true);
        return result.data;
      }

      return result.data;
    } catch {
      return null;
    }
  }, [userId]);

  const onDecryptionComplete = useCallback(() => {
    // Animation reached 100%; item is now visible.
  }, []);

  const onCollect = useCallback(() => {
    if (currentDrop) {
      setInventory((previous) => [currentDrop, ...previous]);
    }
    setCurrentDrop(null);
    setIsAnimating(false);
  }, [currentDrop]);

  const fetchInventory = useCallback(async () => {
    const inventoryPath = getGamificationUserPath(userId, '/vault/inventory');
    if (!inventoryPath) return;

    setLoading(true);
    try {
      const result = await apiFetch<VaultInventoryResponse>(inventoryPath);
      if (result.success) {
        setInventory(result.data.inventory || []);
      }
    } catch {
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const triggerTestDrop = useCallback((drop: VaultDrop) => {
    setCurrentDrop(drop);
    setIsAnimating(true);
  }, []);

  return {
    currentDrop,
    isAnimating,
    inventory,
    loading,
    rollForDrop,
    onDecryptionComplete,
    onCollect,
    fetchInventory,
    triggerTestDrop,
  };
}

export default useVaultDecryption;
