/**
 * Pain Entry Service
 * ==================
 * Typed API layer for the Pain/Injury Tracking system.
 * Uses the production apiService (authAxios) for token refresh and auth headers.
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type PainSide = 'left' | 'right' | 'center' | 'bilateral';
export type PainType = 'sharp' | 'dull' | 'aching' | 'burning' | 'tingling' | 'numbness' | 'stiffness' | 'throbbing';
export type PosturalSyndrome = 'upper_crossed' | 'lower_crossed' | 'none';

export interface PainEntry {
  id: number;
  userId: number;
  createdById: number;
  bodyRegion: string;
  side: PainSide;
  painLevel: number;
  painType: PainType;
  description: string | null;
  onsetDate: string | null;
  isActive: boolean;
  resolvedAt: string | null;
  aggravatingMovements: string | null;
  relievingFactors: string | null;
  trainerNotes: string | null;
  aiNotes: string | null;
  posturalSyndrome: PosturalSyndrome;
  assessmentFindings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePainEntryPayload {
  bodyRegion: string;
  side: PainSide;
  painLevel: number;
  painType: PainType;
  description?: string;
  onsetDate?: string;
  aggravatingMovements?: string;
  relievingFactors?: string;
  trainerNotes?: string;
  aiNotes?: string;
  posturalSyndrome?: PosturalSyndrome;
  assessmentFindings?: Record<string, unknown>;
}

export interface UpdatePainEntryPayload extends Partial<CreatePainEntryPayload> {}

// ── Service factory ────────────────────────────────────────────────────────

export function createPainEntryService(authAxios: any) {
  const BASE = '/api/pain-entries';

  return {
    /** Get all pain entries for a user (active + resolved) */
    async getAll(userId: number): Promise<{ success: boolean; entries: PainEntry[]; count: number }> {
      const { data } = await authAxios.get(`${BASE}/${userId}`);
      return data;
    },

    /** Get only active pain entries for a user */
    async getActive(userId: number): Promise<{ success: boolean; entries: PainEntry[]; count: number }> {
      const { data } = await authAxios.get(`${BASE}/${userId}/active`);
      return data;
    },

    /** Create a new pain entry */
    async create(userId: number, payload: CreatePainEntryPayload): Promise<{ success: boolean; entry: PainEntry }> {
      const { data } = await authAxios.post(`${BASE}/${userId}`, payload);
      return data;
    },

    /** Update an existing pain entry */
    async update(userId: number, entryId: number, payload: UpdatePainEntryPayload): Promise<{ success: boolean; entry: PainEntry }> {
      const { data } = await authAxios.put(`${BASE}/${userId}/${entryId}`, payload);
      return data;
    },

    /** Mark a pain entry as resolved */
    async resolve(userId: number, entryId: number): Promise<{ success: boolean; entry: PainEntry }> {
      const { data } = await authAxios.put(`${BASE}/${userId}/${entryId}/resolve`);
      return data;
    },

    /** Delete a pain entry (admin only) */
    async remove(userId: number, entryId: number): Promise<{ success: boolean; message: string }> {
      const { data } = await authAxios.delete(`${BASE}/${userId}/${entryId}`);
      return data;
    },
  };
}
