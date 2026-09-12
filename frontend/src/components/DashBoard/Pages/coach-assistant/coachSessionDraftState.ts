export type ScopeToken = string;
export type TargetChangeDecision = 'return' | 'discard';
export type TargetChangeOrigin = 'pin' | 'thread' | 'route' | 'observed-pin';

export interface SelectionAnchor {
  pathname: string;
  search: string;
  hash: string;
  targetUserId: number;
  pinnedClientId: number | null;
  threadId: number | null;
}

export type SelectionIntent =
  | { kind: 'return'; targetUserId: number; anchor?: SelectionAnchor }
  | { kind: 'discard'; targetUserId: number | null; anchor?: SelectionAnchor }
  | { kind: 'none'; reason: 'NO_PENDING_CHANGE' | 'STALE_SCOPE' | 'STALE_REQUEST' | 'INVALID_DECISION' };

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
  requestId: string;
  fromTargetUserId: number;
  nextTargetUserId: number | null;
  origin: TargetChangeOrigin;
  nextThreadId: number | null;
  anchor: SelectionAnchor | null;
}

export interface DraftState {
  actorId: number | null;
  actorRole: string | null;
  generation: number;
  draft: CoachSessionDraft | null;
  submitted: SubmittedDraft | null;
  pendingTargetChange: TargetChange | null;
  selectionAnchor: SelectionAnchor | null;
}

export interface DraftPatch {
  content?: Readonly<Record<string, unknown>>;
}

type IdFactory = () => string;
const targetChangeOrigins = new Set<string>(['pin', 'thread', 'route', 'observed-pin']);
const isTargetChangeOrigin = (value: unknown): value is TargetChangeOrigin => (
  typeof value === 'string' && targetChangeOrigins.has(value)
);
type FailureCode =
  | 'NO_ACTOR'
  | 'ROLE_NOT_AUTHORIZED'
  | 'INVALID_TARGET'
  | 'STALE_SCOPE'
  | 'STALE_REVISION'
  | 'NO_DRAFT'
  | 'INVALID_ORIGIN'
  | 'INVALID_SELECTION_ANCHOR'
  | 'UUID_FACTORY_UNAVAILABLE';

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

const toStrictPositiveSafeInteger = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const toStrictNullablePositiveSafeInteger = (value: unknown): number | null | undefined => {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const parsed = toStrictPositiveSafeInteger(value);
  return parsed === null ? undefined : parsed;
};

const hasControlCharacter = (value: string): boolean => /[\u0000-\u001f\u007f]/.test(value);

const normalizeSelectionAnchor = (value: unknown, expectedTargetUserId?: number): SelectionAnchor | null => {
  if (!isRecord(value)) return null;
  const pathname = value.pathname;
  const search = value.search;
  const hash = value.hash;
  if (typeof pathname !== 'string' || pathname.length === 0 || pathname.length > 512
      || !/^\/(?!\/)/.test(pathname) || /[\\?#]/.test(pathname) || hasControlCharacter(pathname)) return null;
  if (typeof search !== 'string' || search.length > 1024 || (search !== '' && !/^\?[^#]*$/.test(search)) || hasControlCharacter(search)) return null;
  if (typeof hash !== 'string' || hash.length > 512 || (hash !== '' && !/^#[^?]*$/.test(hash)) || hasControlCharacter(hash)) return null;
  const targetUserId = toStrictNullablePositiveSafeInteger(value.targetUserId);
  const pinnedClientId = toStrictNullablePositiveSafeInteger(value.pinnedClientId);
  const threadId = toStrictNullablePositiveSafeInteger(value.threadId);
  if (targetUserId === undefined || targetUserId === null || pinnedClientId === undefined || threadId === undefined) return null;
  if (expectedTargetUserId !== undefined && targetUserId !== expectedTargetUserId) return null;
  return freezeDeep({ pathname, search, hash, targetUserId, pinnedClientId, threadId });
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
  selectionAnchor: null,
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
  if (state.actorRole !== 'admin' && state.actorRole !== 'trainer') return failure(state, 'ROLE_NOT_AUTHORIZED');
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
      selectionAnchor: null,
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

export interface TargetChangeMetadata {
  origin?: TargetChangeOrigin;
  nextThreadId?: unknown;
  anchor?: unknown;
}

export type RememberSelectionResult =
  | { ok: true; state: DraftState; selectionAnchor: SelectionAnchor }
  | DraftOperationFailure;

export const rememberSelection = (
  state: DraftState,
  scopeToken: ScopeToken,
  anchor: unknown,
): RememberSelectionResult => {
  const draft = currentDraft(state, scopeToken);
  if (!draft) return failure(state, 'STALE_SCOPE');
  const normalized = normalizeSelectionAnchor(anchor, draft.targetUserId);
  if (!normalized) return failure(state, 'INVALID_SELECTION_ANCHOR');
  return {
    ok: true,
    state: { ...state, selectionAnchor: normalized },
    selectionAnchor: normalized,
  };
};

export const requestTargetChange = (
  state: DraftState,
  nextTargetUserId: unknown,
  metadata: TargetChangeMetadata | IdFactory = {},
  createId: IdFactory = defaultIdFactory,
): TargetChangeResult => {
  if (!state.draft) return failure(state, 'NO_DRAFT');
  const options: TargetChangeMetadata = typeof metadata === 'function' ? {} : metadata;
  if (!isRecord(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))) {
    return failure(state, 'INVALID_ORIGIN');
  }
  const idFactory: IdFactory = typeof metadata === 'function' ? metadata : createId;
  const target = nextTargetUserId === null ? null : toStrictPositiveSafeInteger(nextTargetUserId);
  if (nextTargetUserId !== null && target === null) return failure(state, 'INVALID_TARGET');
  if (target === state.draft.targetUserId) return failure(state, 'INVALID_TARGET');
  const origin = options.origin === undefined ? 'route' : options.origin;
  if (!isTargetChangeOrigin(origin)) return failure(state, 'INVALID_ORIGIN');
  const nextThreadId = options.nextThreadId === undefined
    ? null
    : toStrictNullablePositiveSafeInteger(options.nextThreadId);
  if (nextThreadId === undefined) return failure(state, 'INVALID_TARGET');
  if (origin === 'thread' && nextThreadId === null) return failure(state, 'INVALID_TARGET');
  let anchor = state.selectionAnchor;
  if (Object.prototype.hasOwnProperty.call(options, 'anchor')) {
    anchor = normalizeSelectionAnchor(options.anchor, state.draft.targetUserId);
    if (!anchor) return failure(state, 'INVALID_SELECTION_ANCHOR');
  }
  if (state.pendingTargetChange) {
    return { ok: true, state, change: state.pendingTargetChange };
  }
  let requestId: string;
  try {
    requestId = idFactory();
  } catch (error) {
    if (error instanceof Error && error.message === 'UUID_FACTORY_UNAVAILABLE') return failure(state, 'UUID_FACTORY_UNAVAILABLE');
    throw error;
  }
  const change = freezeDeep({
    scopeToken: state.draft.scopeToken,
    requestId,
    fromTargetUserId: state.draft.targetUserId,
    nextTargetUserId: target,
    origin,
    nextThreadId,
    anchor,
  }) as TargetChange;
  return { ok: true, state: { ...state, pendingTargetChange: change }, change };
};

export function resolveTargetChange(
  state: DraftState,
  scopeToken: ScopeToken,
  requestId: string,
  decision: TargetChangeDecision,
): { state: DraftState; intent: SelectionIntent };
export function resolveTargetChange(
  state: DraftState,
  scopeToken: ScopeToken,
  requestId: string,
  decision: TargetChangeDecision,
): { state: DraftState; intent: SelectionIntent } {
  const change = state.pendingTargetChange;
  if (!change) return { state, intent: { kind: 'none', reason: 'NO_PENDING_CHANGE' } };
  if (change.scopeToken !== scopeToken || !state.draft || state.draft.scopeToken !== scopeToken) {
    return { state, intent: { kind: 'none', reason: 'STALE_SCOPE' } };
  }
  if (requestId !== change.requestId) return { state, intent: { kind: 'none', reason: 'STALE_REQUEST' } };
  if (decision === 'return') {
    const intent: SelectionIntent = { kind: 'return', targetUserId: change.fromTargetUserId };
    if (change.anchor) intent.anchor = change.anchor;
    return {
      state: { ...state, pendingTargetChange: null },
      intent,
    };
  }
  if (decision === 'discard') {
    const intent: SelectionIntent = { kind: 'discard', targetUserId: change.nextTargetUserId };
    if (change.anchor) intent.anchor = change.anchor;
    return {
      state: {
        ...state,
        generation: state.generation + 1,
        draft: null,
        submitted: null,
        pendingTargetChange: null,
        selectionAnchor: null,
      },
      intent,
    };
  }
  return { state, intent: { kind: 'none', reason: 'INVALID_DECISION' } };
}

export const discardDraft = (state: DraftState, scopeToken: ScopeToken): DraftState => {
  if (!state.draft || state.draft.scopeToken !== scopeToken) return state;
  return {
    ...state,
    generation: state.generation + 1,
    draft: null,
    submitted: null,
    pendingTargetChange: null,
    selectionAnchor: null,
  };
};
