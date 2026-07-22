/**
 * FILE: RestoreCard.types.ts
 * PURPOSE: API + view types for the Restore (off-day recovery) panel.
 * SPEC: docs/ai-workflow/AI-HANDOFF/RECOVERY-COMPASS-OFF-DAY-SPEC-2026-07-21.md
 */

export type RestoreDayState =
  | 'rest'
  | 'active-recovery'
  | 'unplanned'
  | 'training'
  | 'already-trained'
  | 'no-plan';

export type RestoreMode = 'full' | 'strip' | 'cold';

export type RestoreBlockKey = 'inhibit' | 'lengthen' | 'activate' | 'cardio';

export interface RestoreItem {
  exerciseId: string;
  name: string;
  dose: string;
  xp: number;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  /** Plain-language provenance — Sean's hard law: never empty. */
  why: string[];
  /** Machine tags for the trainer register (e.g. session_load_72h). */
  dataSources: string[];
}

export interface RestoreBlock {
  key: RestoreBlockKey;
  /** Block-level always-visible provenance line (Kimi K2). */
  provenance: string;
  conflictNote: string | null;
  items: RestoreItem[];
}

export interface RestoreColdStart {
  reason: 'no-plan' | 'pain-needs-coach' | 'library-curating';
  showFoundations: boolean;
}

export interface RestoreTodayData {
  dayState: RestoreDayState;
  mode: RestoreMode;
  localDate: string;
  generatedAt: string;
  blocks: RestoreBlock[];
  coldStart?: RestoreColdStart;
  nextUpFocus?: string | null;
  /** CC-2 client-safe "why" — plain body areas only; syndrome names never reach the client UI. */
  focus?: { clientSummary: string | null; trainerDrivers: string[] } | null;
  completedExerciseIds: string[];
}

export interface RestoreTodayState {
  data: RestoreTodayData | null;
  loading: boolean;
  error: boolean;
  /** Optimistic set of completed exerciseIds (server-confirmed + in-flight). */
  completed: Set<string>;
  completeItem: (item: RestoreItem, blockKey: RestoreBlockKey) => Promise<void>;
  retry: () => void;
  lastXpAwarded: number | null;
}

export const BLOCK_LABELS: Record<RestoreBlockKey, string> = {
  inhibit: 'Release', // SMR / foam rolling (client-facing label)
  lengthen: 'Stretch',
  activate: 'Rebuild', // corrective activation
  cardio: 'Move',
};
