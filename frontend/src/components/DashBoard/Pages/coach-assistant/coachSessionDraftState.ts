export type ScopeToken = string;
export type TargetChangeDecision = 'return' | 'discard';

export type SelectionIntent =
  | { kind: 'return'; targetUserId: number }
  | { kind: 'discard'; targetUserId: number }
  | { kind: 'none'; reason: 'NO_PENDING_CHANGE' | 'STALE_SCOPE' | 'INVALID_DECISION' };

export interface CoachSessionDraft {
  taskId: string;
  requestKey: string;
  actorId: number;
  actorRole: string;
  targetUserId: number;
  origin: string;
  revision: number;
  content: Readonly<Record<string, unknown>>;
  dirty: boolean;
  scopeToken: ScopeToken;
}

export interface SubmittedDraft {
  taskId: string;
  requestKey: string;
  submittedRevision: number;
  actorId: number;
  targetUserId: number;
  snapshot: Readonly<CoachSessionDraft>;
}

export interface TargetChange {
  scopeToken: ScopeToken;
  fromTargetUserId: number;
  nextTargetUserId: number;
}

export interface DraftState {
  actorId: number | null;
  actorRole: string | null;
  generation: number;
  draft: CoachSessionDraft | null;
  submitted: SubmittedDraft | null;
  pendingTargetChange: TargetChange | null;
}

export interface DraftPatch {
  content?: Readonly<Record<string, unknown>>;
}

type IdFactory = () => string;
type FailureCode =
  | 'NO_ACTOR'
  | 'INVALID_TARGET'
  | 'STALE_SCOPE'
  | 'STALE_REVISION'
  | 'NO_DRAFT'
  | 'INVALID_ORIGIN';

export type DraftOperationFailure = {
  ok: false;
  state: DraftState;
  code: FailureCode;
};

const defaultIdFactory: IdFactory = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  throw new Error('UUID_FACTORY_UNAVAILABLE');
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const cloneValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  return value;
};

const freezeDeep = <T,>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};

export const toPositiveSafeInteger = (value: unknown): number | null => {
  const numberValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const failure = (state: DraftState, code: FailureCode): DraftOperationFailure => ({
  ok: false,
  state,
  code,
});

const currentDraft = (state: DraftState, scopeToken: ScopeToken): CoachSessionDraft | null => (
  state.draft?.scopeToken === scopeToken ? state.draft : null
);

export const createInitialDraftState = (
  actorId: string | number | null | undefined,
  actorRole: string | null | undefined,
  generation = 0,
): DraftState => ({
  actorId: toPositiveSafeInteger(actorId),
  actorRole: typeof actorRole === 'string' && actorRole.trim() ? actorRole : null,
  generation,
  draft: null,
  submitted: null,
  pendingTargetChange: null,
});

export type BeginDraftResult =
  | { ok: true; state: DraftState; scopeToken: ScopeToken }
  | DraftOperationFailure;

export const beginDraft = (
  state: DraftState,
  targetUserId: unknown,
  origin: string,
  createId: IdFactory = defaultIdFactory,
): BeginDraftResult => {
  if (!state.actorId || !state.actorRole) return failure(state, 'NO_ACTOR');
  const target = toPositiveSafeInteger(targetUserId);
  if (!target) return failure(state, 'INVALID_TARGET');
  if (typeof origin !== 'string' || !origin.trim()) return failure(state, 'INVALID_ORIGIN');
  const taskId = createId();
  const scopeToken = `${taskId}:${state.generation + 1}`;
  const draft: CoachSessionDraft = {
    taskId,
    requestKey: createId(),
    actorId: state.actorId,
    actorRole: state.actorRole,
    targetUserId: target,
    origin: origin.trim(),
    revision: 0,
    content: Object.freeze({}),
    dirty: false,
    scopeToken,
  };
  return {
    ok: true,
    scopeToken,
    state: {
      ...state,
      generation: state.generation + 1,
      draft,
      submitted: null,
      pendingTargetChange: null,
    },
  };
};

export type EditDraftResult =
  | { ok: true; state: DraftState; draft: CoachSessionDraft }
  | DraftOperationFailure;

export const editDraft = (
  state: DraftState,
  scopeToken: ScopeToken,
  expectedRevision: number,
  patch: DraftPatch,
  createId: IdFactory = defaultIdFactory,
): EditDraftResult => {
  const draft = currentDraft(state, scopeToken);
  if (!draft) return failure(state, 'STALE_SCOPE');
  if (draft.revision !== expectedRevision) return failure(state, 'STALE_REVISION');
  const content = patch && isRecord(patch.content)
    ? cloneValue({ ...draft.content, ...patch.content }) as Record<string, unknown>
    : cloneValue(draft.content) as Record<string, unknown>;
  const nextDraft: CoachSessionDraft = {
    ...draft,
    requestKey: createId(),
    revision: draft.revision + 1,
    content,
    dirty: true,
  };
  const nextState = { ...state, draft: nextDraft };
  return { ok: true, state: nextState, draft: nextDraft };
};

export type FreezeDraftResult =
  | { ok: true; state: DraftState; submitted: SubmittedDraft }
  | DraftOperationFailure;

export const freezeForSubmit = (
  state: DraftState,
  scopeToken: ScopeToken,
  expectedRevision: number,
  createId: IdFactory = defaultIdFactory,
): FreezeDraftResult => {
  const draft = currentDraft(state, scopeToken);
  if (!draft) return failure(state, 'STALE_SCOPE');
  if (draft.revision !== expectedRevision) return failure(state, 'STALE_REVISION');
  const requestKey = createId();
  const snapshot = freezeDeep({
    ...draft,
    requestKey,
    content: cloneValue(draft.content) as Record<string, unknown>,
  }) as Readonly<CoachSessionDraft>;
  const submitted = freezeDeep({
    taskId: snapshot.taskId,
    requestKey,
    submittedRevision: snapshot.revision,
    actorId: snapshot.actorId,
    targetUserId: snapshot.targetUserId,
    snapshot,
  }) as SubmittedDraft;
  return {
    ok: true,
    state: { ...state, submitted },
    submitted,
  };
};

export type TargetChangeResult =
  | { ok: true; state: DraftState; change: TargetChange }
  | DraftOperationFailure;

export const requestTargetChange = (
  state: DraftState,
  nextTargetUserId: unknown,
): TargetChangeResult => {
  if (!state.draft) return failure(state, 'NO_DRAFT');
  const target = toPositiveSafeInteger(nextTargetUserId);
  if (!target || target === state.draft.targetUserId) return failure(state, 'INVALID_TARGET');
  const change = {
    scopeToken: state.draft.scopeToken,
    fromTargetUserId: state.draft.targetUserId,
    nextTargetUserId: target,
  };
  return { ok: true, state: { ...state, pendingTargetChange: change }, change };
};

export const resolveTargetChange = (
  state: DraftState,
  scopeToken: ScopeToken,
  decision: TargetChangeDecision,
): { state: DraftState; intent: SelectionIntent } => {
  const change = state.pendingTargetChange;
  if (!change) return { state, intent: { kind: 'none', reason: 'NO_PENDING_CHANGE' } };
  if (change.scopeToken !== scopeToken || !state.draft || state.draft.scopeToken !== scopeToken) {
    return { state, intent: { kind: 'none', reason: 'STALE_SCOPE' } };
  }
  if (decision === 'return') {
    return {
      state: { ...state, pendingTargetChange: null },
      intent: { kind: 'return', targetUserId: change.fromTargetUserId },
    };
  }
  if (decision === 'discard') {
    return {
      state: {
        ...state,
        generation: state.generation + 1,
        draft: null,
        submitted: null,
        pendingTargetChange: null,
      },
      intent: { kind: 'discard', targetUserId: change.nextTargetUserId },
    };
  }
  return { state, intent: { kind: 'none', reason: 'INVALID_DECISION' } };
};

export const discardDraft = (state: DraftState, scopeToken: ScopeToken): DraftState => {
  if (!state.draft || state.draft.scopeToken !== scopeToken) return state;
  return {
    ...state,
    generation: state.generation + 1,
    draft: null,
    submitted: null,
    pendingTargetChange: null,
  };
};
