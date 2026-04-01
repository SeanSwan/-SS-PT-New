/**
 * ============================================================================
 * FILE: useFaction.ts
 * PURPOSE: Hook for faction membership, selection, and leaderboard data
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface Faction {
  id: number;
  name: string;
  slug: string;
  description: string;
  motto: string;
  color: string;
  icon: string;
  totalPoints: number;
  memberCount: number;
}

export interface FactionMembership {
  id: number;
  userId: number;
  factionId: number;
  contributionPoints: number;
  rank: string;
  faction: Faction;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useFaction() {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [membership, setMembership] = useState<FactionMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFactions = useCallback(async () => {
    try {
      const res = await api.get('/api/social/factions');
      setFactions(res.data.factions || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchMembership = useCallback(async () => {
    try {
      const res = await api.get('/api/social/factions/my');
      setMembership(res.data.membership || null);
    } catch {
      // Not in a faction — that's fine
    }
  }, []);

  const joinFaction = useCallback(async (slug: string) => {
    try {
      const res = await api.post(`/api/social/factions/${slug}/join`);
      setMembership(res.data.membership ? { ...res.data.membership, faction: res.data.faction } : null);
      await fetchFactions();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      return false;
    }
  }, [fetchFactions]);

  const leaveFaction = useCallback(async () => {
    try {
      await api.post('/api/social/factions/leave');
      setMembership(null);
      await fetchFactions();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      return false;
    }
  }, [fetchFactions]);

  useEffect(() => {
    Promise.all([fetchFactions(), fetchMembership()]).finally(() => setIsLoading(false));
  }, [fetchFactions, fetchMembership]);

  return {
    factions,
    membership,
    isLoading,
    error,
    joinFaction,
    leaveFaction,
    refresh: () => Promise.all([fetchFactions(), fetchMembership()]),
  };
}
