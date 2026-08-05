export type PainSide = 'left' | 'right' | 'center' | 'bilateral';
export type PainContext = 'rest' | 'daily_activity' | 'loaded_movement';
export type PainType = 'sharp' | 'dull' | 'aching' | 'burning' | 'tingling' | 'numbness' | 'stiffness' | 'throbbing';
export type PosturalSyndrome = 'upper_crossed' | 'lower_crossed' | 'none';
export type BodyMapEvidenceStatus = 'pending' | 'processing' | 'needs_review' | 'approved' | 'rejected' | 'failed';

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
  /** Slice 1 (F5): rest pain escalates the safety tier server-side. */
  painContext?: PainContext;
  /** Slice 4 (F6): same-region entries within 30d share an episode. */
  episodeId?: string | null;
  lastConfirmedAt?: string | null;
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
  painContext?: PainContext;
  trainerNotes?: string;
  aiNotes?: string;
  posturalSyndrome?: PosturalSyndrome;
  assessmentFindings?: Record<string, unknown>;
}

export interface UpdatePainEntryPayload extends Partial<CreatePainEntryPayload> {}

export interface BodyMapEvidenceCaptureContext {
  movement?: string | null;
  exerciseName?: string | null;
  phaseOfMovement?: string | null;
  cameraAngle?: string | null;
  moment?: string | null;
  clientCaption?: string | null;
}

export interface BodyMapEvidence {
  id: number;
  painEntryId: number;
  userId: number;
  uploadedById: number | null;
  reviewedById: number | null;
  originalFilename: string | null;
  mimeType: string;
  fileSize: number;
  mediaType: 'image' | 'video';
  mediaUrl: string | null;
  captureContext: BodyMapEvidenceCaptureContext;
  analysisStatus: BodyMapEvidenceStatus;
  aiAnalysis?: Record<string, any> | null;
  trainerReview?: Record<string, any> | null;
  analysisSummary?: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BodyMapEvidenceReviewPayload {
  decision: 'approved' | 'rejected';
  clientSummary?: string;
  swanCoachNotes?: string;
  safetyConstraints?: string[];
  internalNotes?: string;
}

export function createPainEntryService(authAxios: any) {
  const BASE = '/api/pain-entries';
  const EVIDENCE_BASE = '/api/body-map-evidence';

  return {
    async getAll(userId: number): Promise<{ success: boolean; entries: PainEntry[]; count: number }> {
      const { data } = await authAxios.get(`${BASE}/${userId}`);
      return { success: data.success, entries: data.data || [], count: data.count || 0 };
    },

    async getActive(userId: number): Promise<{ success: boolean; entries: PainEntry[]; count: number }> {
      const { data } = await authAxios.get(`${BASE}/${userId}/active`);
      return { success: data.success, entries: data.data || [], count: data.count || 0 };
    },

    async create(userId: number, payload: CreatePainEntryPayload): Promise<{ success: boolean; entry: PainEntry }> {
      const { data } = await authAxios.post(`${BASE}/${userId}`, payload);
      return data;
    },

    async update(userId: number, entryId: number, payload: UpdatePainEntryPayload): Promise<{ success: boolean; entry: PainEntry }> {
      const { data } = await authAxios.put(`${BASE}/${userId}/${entryId}`, payload);
      return data;
    },

    async resolve(userId: number, entryId: number): Promise<{ success: boolean; entry: PainEntry }> {
      const { data } = await authAxios.put(`${BASE}/${userId}/${entryId}/resolve`);
      return data;
    },

    async remove(userId: number, entryId: number): Promise<{ success: boolean; message: string }> {
      const { data } = await authAxios.delete(`${BASE}/${userId}/${entryId}`);
      return data;
    },

    async getEvidence(userId: number, entryId: number): Promise<{ success: boolean; evidence: BodyMapEvidence[]; count: number }> {
      const { data } = await authAxios.get(`${EVIDENCE_BASE}/${userId}/${entryId}`);
      return { success: data.success, evidence: data.data || [], count: data.count || 0 };
    },

    async uploadEvidence(userId: number, entryId: number, file: File, captureContext: BodyMapEvidenceCaptureContext): Promise<{ success: boolean; evidence: BodyMapEvidence }> {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('captureContext', JSON.stringify(captureContext));
      const { data } = await authAxios.post(`${EVIDENCE_BASE}/${userId}/${entryId}`, formData);
      return { success: data.success, evidence: data.data };
    },

    async analyzeEvidence(userId: number, entryId: number, mediaId: number): Promise<{ success: boolean; evidence: BodyMapEvidence }> {
      const { data } = await authAxios.post(`${EVIDENCE_BASE}/${userId}/${entryId}/${mediaId}/analyze`);
      return { success: data.success, evidence: data.data };
    },

    async reviewEvidence(userId: number, entryId: number, mediaId: number, payload: BodyMapEvidenceReviewPayload): Promise<{ success: boolean; evidence: BodyMapEvidence }> {
      const { data } = await authAxios.put(`${EVIDENCE_BASE}/${userId}/${entryId}/${mediaId}/review`, payload);
      return { success: data.success, evidence: data.data };
    },

    async removeEvidence(userId: number, entryId: number, mediaId: number): Promise<{ success: boolean; message: string }> {
      const { data } = await authAxios.delete(`${EVIDENCE_BASE}/${userId}/${entryId}/${mediaId}`);
      return data;
    },
  };
}
