/**
 * HOOK: useWorkoutPlannerDraftMutation (plan 58 — P58-R1..R6)
 * The Planner's TWO existing draft state values, moved here mechanically, plus
 * the synchronous identity/revision fence that makes a delayed add/swap lookup
 * attach only to the exact draft, day, actor and mounted instance that accepted
 * it. Called exactly once, by useWorkoutPlannerOrchestration; the ref holds the
 * SAME arrays/plan objects React renders (no copy, no second editable store).
 * Functional updates are evaluated ONCE against that ref, a changed reference
 * advances the revision, then React's setter receives a VALUE.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { GeneratedPlan, PlanExercise } from '../WorkoutPlannerTypes';

export type PlannerAsyncEditKind = 'add' | 'swap';
export type PlannerLiveness = 'current' | 'revision_stale' | 'scope_stale';
export type PlannerDayScope = Readonly<{ kind: 'builder' }>
  | Readonly<{ kind: 'horizon'; weekNumber: number; dayIndex: number }>;
export type PlannerAsyncEditResult =
  | { kind: 'applied'; appliedRevision: number }
  | { kind: 'retired' }
  | { kind: 'declined'; reason: 'denied' | 'busy' | 'invalid' | 'missing' | 'duplicate' }
  | { kind: 'unchanged' }
  | { kind: 'failed'; reason: 'lookup_unavailable' | 'lookup_timeout' };
export interface PlannerAsyncEditToken {
  readonly operation: object;
  readonly surfaceGeneration: object;
  readonly admissionGeneration: object;
  readonly actorId: string | number;
  readonly actorRole: 'admin' | 'trainer';
  readonly targetClientId: number;
  readonly draftEpoch: number;
  readonly revision: number;
  /** Effective scope (explicit week/day wins over the selected day). */
  readonly day: PlannerDayScope;
  readonly baseDayKey: string;
}
export interface PlannerDraftSnapshot {
  readonly planExercises: PlanExercise[];
  readonly generatedPlan: GeneratedPlan | null;
  readonly revision: number;
  readonly draftEpoch: number;
}
export interface PlannerDraftScope {
  actorId: string | number | null | undefined;
  /** RAW role from AuthContext — never a display-role normalization. */
  actorRole: string | null | undefined;
  targetClientId: number | null;
  clientsLoading: boolean;
  day: PlannerDayScope;
  /** Route/plan identity whose change must retire accepted work. */
  configurationKey: string;
}
export interface PlannerCaptureRequest {
  kind: PlannerAsyncEditKind;
  weekNumber?: number;
  dayNumber?: number;
  /** Present only when a producer supplies an explicit target; must match. */
  clientId?: number | null;
}
export type PlannerDraftTransition =
  | { kind: 'applied'; next: { planExercises: PlanExercise[]; generatedPlan: GeneratedPlan | null } }
  | { kind: 'unchanged' }
  | { kind: 'declined'; reason: 'invalid' | 'missing' | 'duplicate' };
export interface PlannerCaptureOptions {
  deadlineMs?: number;
  onDeadline?: (token: PlannerAsyncEditToken) => void;
}
export type PlannerDraftTransitionFn = (current: PlannerDraftSnapshot) => PlannerDraftTransition;
export interface PlannerDraftOwner {
  planExercises: PlanExercise[];
  generatedPlan: GeneratedPlan | null;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  snapshot: () => PlannerDraftSnapshot;
  capture: (request: PlannerCaptureRequest, options?: PlannerCaptureOptions) => PlannerAsyncEditToken | PlannerAsyncEditResult;
  livenessOf: (token: PlannerAsyncEditToken) => PlannerLiveness;
  isCurrent: (token: PlannerAsyncEditToken) => boolean;
  tryApply: (token: PlannerAsyncEditToken, transition: PlannerDraftTransitionFn) => PlannerAsyncEditResult;
  canPublishResult: (token: PlannerAsyncEditToken, appliedRevision: number) => boolean;
  /** Scope replacement intent: clears the live operation and advances epoch. */
  beginReplacement: () => void;
  /** Retire the live operation without an epoch change. */
  retire: () => void;
  bindScope: (scope: PlannerDraftScope) => void;
}
interface Admission {
  generation: object; scopeKey: string;
  actorId: string | number | null; actorRole: string | null;
  targetClientId: number | null; clientsLoading: boolean;
  dayKey: string; day: PlannerDayScope;
}
interface PendingOperation {
  operation: object; token: PlannerAsyncEditToken;
  revoked: boolean; timer: ReturnType<typeof setTimeout> | null;
}

export const dayKeyOf = (day: PlannerDayScope): string =>
  (day.kind === 'builder' ? 'builder' : `horizon:${day.weekNumber}:${day.dayIndex}`);
const isPositiveInt = (value: unknown): value is number =>
  (typeof value === 'number' && Number.isInteger(value) && value > 0);
export const isPlannerAsyncEditToken = (value: PlannerAsyncEditToken | PlannerAsyncEditResult): value is PlannerAsyncEditToken =>
  'operation' in value;

export function useWorkoutPlannerDraftMutation(): PlannerDraftOwner {
  const [planExercises, setPlanExercisesState] = useState<PlanExercise[]>([]);
  const [generatedPlan, setGeneratedPlanState] = useState<GeneratedPlan | null>(null);
  const draftRef = useRef<PlannerDraftSnapshot>({
    planExercises: [], generatedPlan: null, revision: 0, draftEpoch: 0,
  });
  const surfaceRef = useRef<{ mounted: boolean; generation: object }>({ mounted: false, generation: {} });
  const admissionRef = useRef<Admission | null>(null);
  const pendingRef = useRef<PendingOperation | null>(null);
  const consumedRef = useRef<{ operation: object; appliedRevision: number } | null>(null);

  const clearPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending?.timer) clearTimeout(pending.timer);
    pendingRef.current = null;
  }, []);

  // Mount lifecycle is itself a generation: a token from a disposed instance is
  // inadmissible in the next one, including a StrictMode setup/cleanup replay.
  useLayoutEffect(() => {
    const surface = { mounted: true, generation: {} as object };
    surfaceRef.current = surface;
    return () => {
      surface.mounted = false;
      surfaceRef.current = { mounted: false, generation: {} as object };
      clearPending();
    };
  }, [clearPending]);

  const livenessOf = useCallback((token: PlannerAsyncEditToken): PlannerLiveness => {
    const surface = surfaceRef.current;
    if (!surface.mounted || surface.generation !== token.surfaceGeneration) return 'scope_stale';
    const admission = admissionRef.current;
    if (!admission || admission.generation !== token.admissionGeneration) return 'scope_stale';
    if (admission.actorId !== token.actorId) return 'scope_stale';
    if (admission.actorRole !== token.actorRole) return 'scope_stale';
    if (admission.targetClientId !== token.targetClientId) return 'scope_stale';
    if (admission.dayKey !== token.baseDayKey) return 'scope_stale';
    if (draftRef.current.draftEpoch !== token.draftEpoch) return 'scope_stale';
    const pending = pendingRef.current;
    if (!pending || pending.operation !== token.operation) return 'scope_stale';
    if (pending.revoked || draftRef.current.revision !== token.revision) return 'revision_stale';
    return 'current';
  }, []);

  const bindScope = useCallback((scope: PlannerDraftScope) => {
    const dayKey = dayKeyOf(scope.day);
    const scopeKey = [
      String(scope.actorId ?? ''), scope.actorRole ?? '', String(scope.targetClientId ?? ''),
      scope.clientsLoading ? 'loading' : 'ready', dayKey, scope.configurationKey,
    ].join('|');
    if (admissionRef.current?.scopeKey === scopeKey) return;
    admissionRef.current = {
      generation: {}, scopeKey, actorId: scope.actorId ?? null, actorRole: scope.actorRole ?? null,
      targetClientId: scope.targetClientId, clientsLoading: scope.clientsLoading, dayKey, day: scope.day,
    };
    // A committed identity/day/configuration transition retires whatever the
    // previous scope accepted — including an A-B-A that ends where it started.
    clearPending();
  }, [clearPending]);
  const capture = useCallback((
    request: PlannerCaptureRequest, options?: PlannerCaptureOptions,
  ): PlannerAsyncEditToken | PlannerAsyncEditResult => {
    const surface = surfaceRef.current;
    const admission = admissionRef.current;
    if (!surface.mounted || !admission) return { kind: 'declined', reason: 'denied' };
    const role = admission.actorRole;
    if (role !== 'admin' && role !== 'trainer') return { kind: 'declined', reason: 'denied' };
    const actorId = admission.actorId;
    if (actorId === null || String(actorId).trim() === '') return { kind: 'declined', reason: 'denied' };
    const targetClientId = admission.targetClientId;
    if (!isPositiveInt(targetClientId)) return { kind: 'declined', reason: 'denied' };
    if (admission.clientsLoading) return { kind: 'declined', reason: 'denied' };
    if (request.clientId != null && request.clientId !== targetClientId) {
      return { kind: 'declined', reason: 'invalid' };
    }
    // Builder versus horizon is resolved BEFORE any lookup. Explicit addressing
    // is validated against the live plan and never converted to another day.
    let day: PlannerDayScope = admission.day;
    if (request.weekNumber !== undefined || request.dayNumber !== undefined) {
      if (!isPositiveInt(request.weekNumber) || !isPositiveInt(request.dayNumber)) {
        return { kind: 'declined', reason: 'invalid' };
      }
      const week = draftRef.current.generatedPlan?.weeks?.find((w) => w.weekNumber === request.weekNumber);
      const days = (week?.days?.length ? week.days : week?.sessions) ?? [];
      if (!days[request.dayNumber - 1]) return { kind: 'declined', reason: 'missing' };
      day = { kind: 'horizon', weekNumber: request.weekNumber, dayIndex: request.dayNumber - 1 };
    }
    const live = pendingRef.current;
    if (live && livenessOf(live.token) !== 'scope_stale') return { kind: 'declined', reason: 'busy' };
    if (live) clearPending();
    const operation = {};
    const record: PendingOperation = {
      operation, revoked: false, timer: null,
      token: {
        operation, surfaceGeneration: surface.generation, admissionGeneration: admission.generation,
        actorId, actorRole: role, targetClientId, draftEpoch: draftRef.current.draftEpoch,
        revision: draftRef.current.revision, day, baseDayKey: admission.dayKey,
      },
    };
    pendingRef.current = record;
    const deadlineMs = options?.deadlineMs;
    if (deadlineMs && deadlineMs > 0) {
      record.timer = setTimeout(() => {
        if (pendingRef.current !== record) return;
        const stillCurrent = livenessOf(record.token) === 'current';
        clearPending();
        if (stillCurrent) options?.onDeadline?.(record.token);
      }, deadlineMs);
    }
    return record.token;
  }, [clearPending, livenessOf]);

  const writeDraft = useCallback((nextExercises: PlanExercise[], nextPlan: GeneratedPlan | null) => {
    const current = draftRef.current;
    if (nextExercises === current.planExercises && nextPlan === current.generatedPlan) return;
    draftRef.current = {
      planExercises: nextExercises, generatedPlan: nextPlan,
      revision: current.revision + 1, draftEpoch: current.draftEpoch,
    };
    // Any intervening draft mutation makes the live operation permanently
    // inapplicable; it can never be revived by equal final values.
    if (pendingRef.current) pendingRef.current.revoked = true;
    setPlanExercisesState(nextExercises);
    setGeneratedPlanState(nextPlan);
  }, []);
  const setPlanExercises = useCallback<Dispatch<SetStateAction<PlanExercise[]>>>((action) => {
    const previous = draftRef.current.planExercises;
    const next = typeof action === 'function'
      ? (action as (prev: PlanExercise[]) => PlanExercise[])(previous) : action;
    writeDraft(next, draftRef.current.generatedPlan);
  }, [writeDraft]);

  const setGeneratedPlan = useCallback<Dispatch<SetStateAction<GeneratedPlan | null>>>((action) => {
    const previous = draftRef.current.generatedPlan;
    const next = typeof action === 'function'
      ? (action as (prev: GeneratedPlan | null) => GeneratedPlan | null)(previous) : action;
    writeDraft(draftRef.current.planExercises, next);
  }, [writeDraft]);
  const tryApply = useCallback((
    token: PlannerAsyncEditToken, transition: PlannerDraftTransitionFn,
  ): PlannerAsyncEditResult => {
    if (livenessOf(token) !== 'current') return { kind: 'retired' };
    const current = draftRef.current;
    const outcome = transition(current);
    if (outcome.kind !== 'applied') return outcome;
    const { planExercises: nextExercises, generatedPlan: nextPlan } = outcome.next;
    if (nextExercises === current.planExercises && nextPlan === current.generatedPlan) {
      return { kind: 'unchanged' };
    }
    // Consume before any receipt callback can reenter; repeated completion sees
    // a consumed token rather than a second append.
    clearPending();
    const appliedRevision = current.revision + 1;
    draftRef.current = {
      planExercises: nextExercises, generatedPlan: nextPlan,
      revision: appliedRevision, draftEpoch: current.draftEpoch,
    };
    consumedRef.current = { operation: token.operation, appliedRevision };
    setPlanExercisesState(nextExercises);
    setGeneratedPlanState(nextPlan);
    return { kind: 'applied', appliedRevision };
  }, [clearPending, livenessOf]);

  const canPublishResult = useCallback((token: PlannerAsyncEditToken, appliedRevision: number): boolean => {
    const surface = surfaceRef.current;
    const admission = admissionRef.current;
    const consumed = consumedRef.current;
    return surface.mounted && surface.generation === token.surfaceGeneration
      && !!admission && admission.generation === token.admissionGeneration
      && admission.actorId === token.actorId && admission.actorRole === token.actorRole
      && admission.targetClientId === token.targetClientId && admission.dayKey === token.baseDayKey
      && !!consumed && consumed.operation === token.operation
      && consumed.appliedRevision === appliedRevision
      && draftRef.current.revision === appliedRevision;
  }, []);

  const retire = useCallback(() => { clearPending(); }, [clearPending]);
  const beginReplacement = useCallback(() => {
    clearPending();
    consumedRef.current = null;
    draftRef.current = { ...draftRef.current, draftEpoch: draftRef.current.draftEpoch + 1 };
  }, [clearPending]);
  const snapshot = useCallback((): PlannerDraftSnapshot => draftRef.current, []);
  const isCurrent = useCallback((token: PlannerAsyncEditToken) => livenessOf(token) === 'current', [livenessOf]);

  return useMemo<PlannerDraftOwner>(() => ({
    planExercises, generatedPlan, setPlanExercises, setGeneratedPlan,
    snapshot, capture, livenessOf, isCurrent, tryApply, canPublishResult,
    beginReplacement, retire, bindScope,
  }), [
    planExercises, generatedPlan, setPlanExercises, setGeneratedPlan, snapshot,
    capture, livenessOf, isCurrent, tryApply, canPublishResult, beginReplacement, retire, bindScope,
  ]);
}
