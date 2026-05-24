/**
 * ============================================================================
 * FILE: useCompanionPet.ts
 * PURPOSE: Hook for fetching and interacting with the companion pet
 * ============================================================================
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../../../services/api.service';
import type { PetData, PetSpeciesId, InteractionType } from './CompanionPetTypes';

const API_BASE = '/api/gamification';

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

export function useCompanionPet(userId: number | null) {
  const [pet, setPet] = useState<PetData | null>(null);
  const [hasPet, setHasPet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interacting, setInteracting] = useState(false);
  const mountedRef = useRef(true);

  const fetchPet = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiFetch<{ success: boolean; data: { hasPet: boolean; pet: PetData | null } }>(
        `/users/${userId}/pet`
      );
      if (!mountedRef.current) return;
      if (res.success) {
        setHasPet(res.data.hasPet);
        setPet(res.data.pet);
      }
      setError(null);
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  const adoptPet = useCallback(async (species: PetSpeciesId, petName: string) => {
    if (!userId) return;
    try {
      setInteracting(true);
      await apiFetch(`/users/${userId}/pet/adopt`, {
        method: 'POST',
        body: JSON.stringify({ species, petName }),
      });
      if (mountedRef.current) await fetchPet();
    } catch (err: any) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setInteracting(false);
    }
  }, [userId, fetchPet]);

  const interact = useCallback(async (type: InteractionType) => {
    if (!userId) return;
    try {
      setInteracting(true);
      await apiFetch(`/users/${userId}/pet/interact`, {
        method: 'POST',
        body: JSON.stringify({ interactionType: type }),
      });
      if (mountedRef.current) await fetchPet();
    } catch (err: any) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setInteracting(false);
    }
  }, [userId, fetchPet]);

  const renamePet = useCallback(async (newName: string) => {
    if (!userId) return;
    try {
      await apiFetch(`/users/${userId}/pet/rename`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      });
      if (mountedRef.current) await fetchPet();
    } catch (err: any) {
      if (mountedRef.current) setError(err.message);
    }
  }, [userId, fetchPet]);

  const releasePet = useCallback(async () => {
    if (!userId) return;
    try {
      await apiFetch(`/users/${userId}/pet`, { method: 'DELETE' });
      if (!mountedRef.current) return;
      setPet(null);
      setHasPet(false);
    } catch (err: any) {
      if (mountedRef.current) setError(err.message);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPet();
    return () => { mountedRef.current = false; };
  }, [fetchPet]);

  return { pet, hasPet, loading, error, interacting, adoptPet, interact, renamePet, releasePet, refetch: fetchPet };
}
