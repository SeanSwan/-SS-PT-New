/**
 * AI Workout Service
 * ==================
 * Typed API layer for the Smart Workout Logger Coach Copilot.
 * Uses the production apiService (authAxios) for token refresh and auth headers.
 *
 * Phase 5B -- Frontend Integration
 */

// ── Types (aligned with Phase 5B contract + live backend shapes) ──────────

export interface Exercise {
  name: string;
  setScheme?: string | null;
  repGoal?: string | null;
  restPeriod?: number | null;
  tempo?: string | null;
  intensityGuideline?: string | null;
  notes?: string | null;
  isOptional?: boolean | null;
}

export interface WorkoutDay {
  dayNumber: number;
  name: string;
  focus?: string | null;
  dayType?: string;
  estimatedDuration?: number | null;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  planName: string;
  durationWeeks: number;
  summary?: string;
  days: WorkoutDay[];
}

export interface MesocycleBlock {
  sequence: number;
  nasmFramework: 'OPT' | 'CES' | 'GENERAL';
  optPhase: number | null;
  phaseName: string;
  focus: string | null;
  durationWeeks: number;
  sessionsPerWeek: number | null;
  entryCriteria: string | null;
  exitCriteria: string | null;
  notes: string | null;
  rationale?: string | null;
}

export interface LongHorizonPlan {
  planName: string;
  horizonMonths: 3 | 6 | 12;
  summary?: string;
  blocks: MesocycleBlock[];
}

export interface LoadRecommendation {
  minLoad: number;
  maxLoad: number;
  targetReps: string;
  explanation: string;
}

export interface ExerciseRecommendation {
  exerciseName: string;
  totalSets: number;
  bestWeight: number;
  bestReps: number;
  avgRpe: number;
  estimated1RM: number;
  loadRecommendation: LoadRecommendation | null;
}

export interface Explainability {
  dataSources: string[];
  phaseRationale: string;
  progressFlags: string[];
  safetyFlags: string[];
  dataQuality: string;
}

export interface SafetyConstraints {
  medicalClearanceRequired: boolean;
  maxIntensityPct: number;
  movementRestrictions: string[];
}

export interface ValidationError {
  code: string;
  field?: string;
  message: string;
}

export interface TemplateSuggestion {
  id: string;
  label: string;
  category: string;
}

export interface TemplateEntry {
  id: string;
  label: string;
  category: string;
  status: string;
  nasmFramework: string;
  optPhase?: number;
  supportsAiContext: boolean;
  tags: string[];
}

// ── Response types ────────────────────────────────────────────────────────

export interface DraftSuccessResponse {
  success: true;
  draft: true;
  plan: WorkoutPlan;
  generationMode: string;
  explainability: Explainability;
  safetyConstraints: SafetyConstraints;
  exerciseRecommendations: ExerciseRecommendation[];
  warnings: string[];
  missingInputs: string[];
  provider: string;
  auditLogId: number | null;
}

export interface DegradedResponse {
  success: true;
  degraded: true;
  code: 'AI_DEGRADED_MODE';
  message: string;
  fallback: {
    type: string;
    templateSuggestions: TemplateSuggestion[];
    reasons: string[];
  };
  failoverTrace: string[];
}

export interface LongHorizonDraftResponse {
  success: true;
  draft: true;
  plan: LongHorizonPlan;
  horizonMonths: 3 | 6 | 12;
  warnings: string[];
  provider: string;
  auditLogId: number | null;
}

export interface LongHorizonApproveResponse {
  success: true;
  planId: number;
  sourceType: string;
  summary: string;
  blockCount: number;
  validationWarnings: string[];
  eligibilityWarnings: string[];
}

export interface ApproveSuccessResponse {
  success: true;
  planId: number;
  sourceType: string;
  summary: string;
  unmatchedExercises: Array<{ dayNumber: number; name: string }>;
  validationWarnings: ValidationError[];
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: ValidationError[];
  warnings?: ValidationError[];
}

export type GenerateResponse = DraftSuccessResponse | DegradedResponse;
export type LongHorizonGenerateResponse = LongHorizonDraftResponse | DegradedResponse;
export type AnyGenerateResponse = GenerateResponse | LongHorizonGenerateResponse;

export function isDegraded(resp: AnyGenerateResponse): resp is DegradedResponse {
  return 'degraded' in resp && (resp as DegradedResponse).degraded === true;
}

export function isDraftSuccess(resp: GenerateResponse): resp is DraftSuccessResponse {
  return 'draft' in resp && (resp as DraftSuccessResponse).draft === true;
}

export function isLongHorizonDraft(
  resp: LongHorizonGenerateResponse,
): resp is LongHorizonDraftResponse {
  return 'draft' in resp && (resp as LongHorizonDraftResponse).draft === true;
}

// ── Service factory ───────────────────────────────────────────────────────

export function createAiWorkoutService(authAxios: any) {
  const BASE = '/api/ai';

  return {
    /** Fetch active NASM templates for template selector */
    async listTemplates(): Promise<{
      success: boolean;
      templates: TemplateEntry[];
      count: number;
      registryVersion: string;
    }> {
      const { data } = await authAxios.get(`${BASE}/templates`, {
        params: { status: 'active', includeSchema: 'false' },
      });
      return data;
    },

    /** Generate a draft workout plan for coach review */
    async generateDraft(userId: number): Promise<GenerateResponse> {
      const { data } = await authAxios.post(`${BASE}/workout-generation`, {
        userId,
        mode: 'draft',
      });
      return data;
    },

    /** Approve and persist a coach-reviewed draft */
    async approveDraft(params: {
      userId: number;
      plan: WorkoutPlan;
      auditLogId?: number | null;
      trainerNotes?: string;
    }): Promise<ApproveSuccessResponse> {
      const { data } = await authAxios.post(
        `${BASE}/workout-generation/approve`,
        {
          userId: params.userId,
          plan: params.plan,
          auditLogId: params.auditLogId ?? undefined,
          trainerNotes: params.trainerNotes || undefined,
        },
      );
      return data;
    },

    /** Generate a long-horizon draft plan (3/6/12 month periodization) */
    async generateLongHorizonDraft(params: {
      userId: number;
      horizonMonths: 3 | 6 | 12;
      overrideReason?: string;
    }): Promise<LongHorizonGenerateResponse> {
      const { data } = await authAxios.post(`${BASE}/long-horizon/generate`, {
        userId: params.userId,
        horizonMonths: params.horizonMonths,
        overrideReason: params.overrideReason?.trim() || undefined,
      });
      return data;
    },

    /** Approve and persist a long-horizon draft plan */
    async approveLongHorizonDraft(params: {
      userId: number;
      plan: LongHorizonPlan;
      horizonMonths: 3 | 6 | 12;
      auditLogId: number;
      overrideReason?: string;
      trainerNotes?: string;
    }): Promise<LongHorizonApproveResponse> {
      const { data } = await authAxios.post(`${BASE}/long-horizon/approve`, {
        userId: params.userId,
        plan: params.plan,
        horizonMonths: params.horizonMonths,
        auditLogId: params.auditLogId,
        overrideReason: params.overrideReason?.trim() || undefined,
        trainerNotes: params.trainerNotes?.trim() || undefined,
      });
      return data;
    },
  };
}
