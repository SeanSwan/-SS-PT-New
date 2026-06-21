/**
 * ============================================================================
 * FILE: useCompanionPet.ts
 * PURPOSE: Hook for fetching and interacting with the companion pet
 * ============================================================================
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../../../services/api.service';
import { GAMIFICATION_SAFE_ERROR_COPY, getGamificationUserPath } from '../../utils/gamificationPath';
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
    throw new Error(`API error ${res.status}`);
  }

  if ((res.data as { success?: unknown } | null | undefined)?.success === false) {
    throw new Error(`API error ${res.status}`);
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
  const requestSeqRef = useRef(0);
  const mutationInFlightRef = useRef(false);

  const fetchPet = useCallback(async () => {
    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    const petPath = getGamificationUserPath(userId, '/pet');
    if (!petPath) {
      if (mountedRef.current) {
        setPet(null);
        setHasPet(false);
        setLoading(false);
        setError(null);
      }
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; data: { hasPet: boolean; pet: PetData | null } }>(
        petPath
      );
      if (!mountedRef.current || requestSeqRef.current !== requestId) return;
      if (res.success) {
        setHasPet(res.data.hasPet);
        setPet(res.data.pet);
      }
      setError(null);
    } catch {
      if (!mountedRef.current || requestSeqRef.current !== requestId) return;
      setPet(null);
      setHasPet(false);
      setError(GAMIFICATION_SAFE_ERROR_COPY);
    } finally {
      if (mountedRef.current && requestSeqRef.current === requestId) setLoading(false);
    }
  }, [userId]);

  const runPetMutation = useCallback(async (operation: () => Promise<void>) => {
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    try {
      setInteracting(true);
      await operation();
    } catch {
      if (mountedRef.current) setError(GAMIFICATION_SAFE_ERROR_COPY);
    } finally {
      mutationInFlightRef.current = false;
      if (mountedRef.current) setInteracting(false);
    }
  }, []);

  const adoptPet = useCallback(async (species: PetSpeciesId, petName: string) => {
    const petPath = getGamificationUserPath(userId, '/pet/adopt');
    if (!petPath) return;
    await runPetMutation(async () => {
      await apiFetch(petPath, {
        method: 'POST',
        body: JSON.stringify({ species, petName }),
      });
      if (mountedRef.current) await fetchPet();
    });
  }, [userId, fetchPet, runPetMutation]);

  const interact = useCallback(async (type: InteractionType) => {
    const petPath = getGamificationUserPath(userId, '/pet/interact');
    if (!petPath) return;
    await runPetMutation(async () => {
      await apiFetch(petPath, {
        method: 'POST',
        body: JSON.stringify({ interactionType: type }),
      });
      if (mountedRef.current) await fetchPet();
    });
  }, [userId, fetchPet, runPetMutation]);

  const renamePet = useCallback(async (newName: string) => {
    const petPath = getGamificationUserPath(userId, '/pet/rename');
    if (!petPath) return;
    await runPetMutation(async () => {
      await apiFetch(petPath, {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      });
      if (mountedRef.current) await fetchPet();
    });
  }, [userId, fetchPet, runPetMutation]);

  const releasePet = useCallback(async () => {
    const petPath = getGamificationUserPath(userId, '/pet');
    if (!petPath) return;
    await runPetMutation(async () => {
      await apiFetch(petPath, { method: 'DELETE' });
      if (!mountedRef.current) return;
      requestSeqRef.current += 1;
      setPet(null);
      setHasPet(false);
      setError(null);
    });
  }, [userId, runPetMutation]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPet();
    return () => { mountedRef.current = false; };
  }, [fetchPet]);

  return { pet, hasPet, loading, error, interacting, adoptPet, interact, renamePet, releasePet, refetch: fetchPet };
}
