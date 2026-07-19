/**
 * workoutHandoff.types.ts — shared types for the Post-Save Handoff (Slice 1).
 * Mirrors the backend contract: workoutProofSeriesService + nextBestActionResolverService.
 * Kept as the single type source for the handoff UI so shells never re-declare shapes (Rule 58).
 */

export type LoggerRole = 'client' | 'trainer' | 'admin';

export type NbaKind = 'ADJUST_PLAN' | 'DO_NEXT_WORKOUT' | 'RECOVERY_FLEXIBILITY' | 'VIEW_PROGRESS';

export type HeadlineKind = 'pr' | 'streak' | 'first' | 'default';

export interface ProofPoint {
  sessionId: string;
  dateISO: string;
  e1rm: number;
  isToday?: boolean;
  isPendingSync?: boolean;
}

export interface ProofSeries {
  /** Normalized exercise name that unifies the dual data sources (WorkoutLog + Set). */
  nameKey: string;
  exerciseName: string;
  points: ProofPoint[];
  todayE1rm: number | null;
  pr: boolean;
  prDeltaLbs: number;
  totalVolumeLbs: number;
  exerciseCount: number;
  durationMin: number | null;
  sessionsThisWeek: number;
  streakWeeks: number;
  isFirstEver: boolean;
}

export interface NextBestAction {
  kind: NbaKind;
  title: string;
  body?: string;
  ctaLabel: string;
  href: string;
  /** Trainer-indispensability: a client must never receive a trainerOnly action. */
  trainerOnly: boolean;
}

export interface ShareEligibility {
  eligible: boolean;
  reason: 'owner' | 'not-owner';
}

/**
 * The full server-assembled handoff payload the UI renders.
 * proof/nba are nullable to match the assembler exactly (postSaveHandoffAssembler returns
 * `proof ?? null` / `nba ?? null` — e.g. first workout, all-bodyweight day, or the create/degraded
 * path). headline + share are always emitted. `pendingSync` is a CLIENT concern (offline-queue state),
 * injected by the shell — the server never sends it — so it's optional here (Chunk C passes it as a prop).
 */
export interface HandoffData {
  headline: HeadlineKind;
  proof: ProofSeries | null;
  nba: NextBestAction | null;
  share: ShareEligibility;
  pendingSync?: boolean;
}

export interface PostSaveHandoffProps {
  data: HandoffData;
  viewerRole: LoggerRole;
  /** Offline-queue state, injected by the shell (the server never sends it). Shows the PENDING SYNC
   *  chip when true. Falls back to data.pendingSync for back-compat if the prop is omitted. */
  pendingSync?: boolean;
  /** Feature-flag gate — the component renders null unless enabled (default reads the env flag). */
  enabled?: boolean;
  /** Dismiss (the "Done" affordance) — returns to the logger / route home. */
  onDismiss: () => void;
  /** Navigate to the NBA/CTA href (router push injected by the shell). */
  onNavigate: (href: string) => void;
  /** Optional analytics sink (defaults to a no-op). */
  onEvent?: (event: string, payload?: Record<string, unknown>) => void;
}
