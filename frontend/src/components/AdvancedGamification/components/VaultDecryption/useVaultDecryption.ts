/**
 * ============================================================================
 * FILE: useVaultDecryption.ts
 * PURPOSE: React hook for vault loot drops — roll, animate, collect
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import apiService from '../../../../services/api.service';
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
    const err = res.data as { error?: string; message?: string } | undefined;
    throw new Error(err?.error || err?.message || `API error ${res.status}`);
  }

  return res.data as T;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useVaultDecryption(userId: number | null | undefined) {
  const [currentDrop, setCurrentDrop] = useState<VaultDrop | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inventory, setInventory] = useState<VaultDrop[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Roll for a loot drop after a qualifying action.
   * If a drop occurs, triggers the animation automatically.
   */
  const rollForDrop = useCallback(async (actionType: string): Promise<VaultDropResult | null> => {
    if (!userId) return null;

    try {
      const result = await apiFetch<VaultApiResponse>(`/users/${userId}/vault/roll`, {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      });

      if (result.success && result.data.dropped) {
        setCurrentDrop(result.data.drop);
        setIsAnimating(true);
        return result.data;
      }

      return result.data;
    } catch (err) {
      console.error('[Vault] Roll failed:', err);
      return null;
    }
  }, [userId]);

  /**
   * Called when the decryption animation finishes (item revealed).
   */
  const onDecryptionComplete = useCallback(() => {
    // Animation reached 100% — item is now visible
  }, []);

  /**
   * Called when user clicks "Collect" to dismiss the animation.
   */
  const onCollect = useCallback(() => {
    if (currentDrop) {
      setInventory((prev) => [currentDrop, ...prev]);
    }
    setCurrentDrop(null);
    setIsAnimating(false);
  }, [currentDrop]);

  /**
   * Fetch the user's full loot inventory.
   */
  const fetchInventory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await apiFetch<VaultInventoryResponse>(`/users/${userId}/vault/inventory`);
      if (result.success) {
        setInventory(result.data.inventory || []);
      }
    } catch (err) {
      console.error('[Vault] Fetch inventory failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Manually trigger a drop animation (for testing/admin).
   */
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
