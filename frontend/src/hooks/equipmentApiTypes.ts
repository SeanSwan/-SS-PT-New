/**
 * Equipment API runtime contract types.
 *
 * Kept outside useEquipmentAPI so the hook stays focused on transport while the
 * Equipment Manager can share the richer V2 scan response safely.
 */

export interface EquipmentProfile {
  id: number;
  trainerId: number;
  name: string;
  locationType: 'gym' | 'park' | 'home' | 'client_home' | 'custom';
  description: string | null;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  equipmentCount: number;
  coverPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentItem {
  id: number;
  profileId: number;
  name: string;
  trainerLabel: string | null;
  category: string;
  resistanceType: string | null;
  description: string | null;
  photoUrl: string | null;
  aiScanData: AiScanData | null;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'manual';
  approvedAt: string | null;
  isActive: boolean;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiScanData {
  confidence: number;
  boundingBox: { x: number; y: number; w: number; h: number } | null;
  suggestedName: string;
  suggestedCategory: string;
  suggestedExercises: string[];
  rawResponse: Record<string, unknown>;
  latencyMs: number;
  model: string;
  scannedAt: string;
  schemaVersion?: string;
  promptVersion?: string;
  imageQuality?: string;
  sceneSummary?: string;
  visibility?: string;
  equipmentKind?: string;
  quantity?: number;
  alternateNames?: string[];
  movementPatterns?: string[];
  targetMuscles?: string[];
  safetyNotes?: string;
  dedupeKey?: string;
  needsHumanReview?: boolean;
  reasoning?: string;
  candidateIndex?: number;
}

export interface ExerciseMapping {
  id: number;
  equipmentItemId: number;
  exerciseKey: string;
  exerciseName: string;
  isCustomExercise: boolean;
  customExerciseId: number | null;
  isPrimary: boolean;
  isAiSuggested: boolean;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  confidence: number;
  suggestedName: string;
  suggestedCategory: string;
  suggestedExercises: string[];
  boundingBox: { x: number; y: number; w: number; h: number } | null;
}

export interface EquipmentStats {
  profileCount: number;
  itemCount: number;
  pendingApprovals: number;
}

export interface EquipmentScanCandidate extends ScanResult {
  category?: string;
  equipmentKind?: string;
  resistanceType?: string;
  description?: string;
  quantity?: number;
  visibility?: string;
  alternateNames?: string[];
  movementPatterns?: string[];
  targetMuscles?: string[];
  safetyNotes?: string;
  dedupeKey?: string;
  needsHumanReview?: boolean;
  reasoning?: string;
  duplicateWithinScan?: boolean;
  candidateIndex?: number;
}

export interface EquipmentScanDuplicate extends EquipmentScanCandidate {
  duplicateOfItemId?: number;
  matchType?: string;
  status: 'duplicate';
}

export interface EquipmentScanSession {
  schemaVersion?: string;
  promptVersion?: string;
  imageQuality?: string;
  sceneSummary?: string;
  itemCount?: number;
  candidateCount?: number;
  possibleItemCount?: number;
  duplicateCount?: number;
  photoUrl?: string | null;
  latencyMs?: number;
  model?: string;
  reviewSessionId?: number;
  candidateRecordCount?: number;
}

export interface EquipmentScanResponse {
  success: boolean;
  item: EquipmentItem | null;
  items?: EquipmentItem[];
  scanResult: ScanResult | null;
  candidates?: EquipmentScanCandidate[];
  possibleItems?: EquipmentScanCandidate[];
  duplicates?: EquipmentScanDuplicate[];
  scanSession?: EquipmentScanSession;
  /** V3 honesty flags: caption-fallback scans admit they saw a limited scene. */
  degraded?: boolean;
  pipelineVersion?: string | null;
}

export type EquipmentScanCandidateStatus = 'created_item' | 'duplicate' | 'possible';
export type EquipmentScanCandidateOutcome = 'approved' | 'rejected';

export interface EquipmentScanCandidateReviewPayload {
  reviewSessionId: number;
  candidateIndex: number;
  candidateStatus: EquipmentScanCandidateStatus;
  outcome: EquipmentScanCandidateOutcome;
  equipmentItemId?: number;
  duplicateOfItemId?: number;
  trainerCorrection?: {
    name?: string;
    trainerLabel?: string;
    category?: string;
    resistanceType?: string;
    rejectionReason?: string;
  };
}

export interface EquipmentScanCandidateReviewResponse {
  success: boolean;
  review?: {
    candidateId: number;
    sessionId: number;
    status: EquipmentScanCandidateOutcome;
  } | null;
}
export type EquipmentScanErrorPayload = Partial<EquipmentScanResponse> & {
  success?: false;
  error?: string;
};

export type EquipmentScanError = Error & {
  status?: number;
  retryable?: boolean;
  scanResponse?: EquipmentScanErrorPayload;
};