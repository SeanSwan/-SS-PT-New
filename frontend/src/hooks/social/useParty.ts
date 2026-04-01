/**
 * ============================================================================
 * FILE: useParty.ts
 * PURPOSE: Hook for party/linkshell management and HP tracking
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface PartyMember {
  userId: number;
  role: 'leader' | 'member';
  joinedAt: string;
}

export interface Party {
  id: number;
  name: string;
  leaderId: number;
  maxMembers: number;
  currentHP: number;
  maxHP: number;
  isActive: boolean;
  inviteCode: string;
  members: PartyMember[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useParty() {
  const [party, setParty] = useState<Party | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchParty = useCallback(async () => {
    try {
      const res = await api.get('/api/social/parties/my');
      setParty(res.data.party || null);
      setMyRole(res.data.role || null);
    } catch {
      setParty(null);
    }
  }, []);

  const createParty = useCallback(async (name: string) => {
    try {
      const res = await api.post('/api/social/parties', { name });
      await fetchParty();
      return res.data.party;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create party');
    }
  }, [fetchParty]);

  const joinParty = useCallback(async (code: string) => {
    try {
      await api.post(`/api/social/parties/join/${code}`);
      await fetchParty();
      return true;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to join party');
    }
  }, [fetchParty]);

  const leaveParty = useCallback(async () => {
    try {
      await api.post('/api/social/parties/leave');
      setParty(null);
      setMyRole(null);
      return true;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to leave party');
    }
  }, []);

  useEffect(() => {
    fetchParty().finally(() => setIsLoading(false));
  }, [fetchParty]);

  return {
    party,
    myRole,
    isLoading,
    createParty,
    joinParty,
    leaveParty,
    refresh: fetchParty,
  };
}
