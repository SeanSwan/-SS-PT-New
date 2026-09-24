/**
 * FILE: CoachSessionDesk.test.tsx
 * PURPOSE: G04c — Session Desk state machine (S6 state table) and transport wiring.
 *          Covers the state copy table (empty/draft/offline/review/executing/committed/
 *          unknown/verified/rolled_back/access_revoked), the desk owning no draft state
 *          (owner begin/edit/freezeForSubmit), the allowlisted Logger bridge payload,
 *          terminal receipts retained on the timeline, and the target-switch dialog.
 *
 *          Hook seams (draft owner / surface identity / G04b transport) are hoisted-state
 *          mocks so each scenario reconfigures the desk without a parallel draft store.
 *          deskState is derived from the owner's `submitted` object, so the review-family
 *          scenarios seed `submitted` directly (and freezeForSubmit sets it as a side
 *          effect, mirroring the G04a owner contract).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import CoachSessionDesk, { type CoachSessionDeskProps } from './CoachSessionDesk';
import type { CoachSessionDraft, DraftState, SubmittedDraft } from './coachSessionDraftState';
import type { CoachWorkoutDraftContent } from './coachWorkoutDraftContract';

const exerciseContent = (): CoachWorkoutDraftContent => ({
  date: '2026-09-08',
  title: 'Push day',
  notes: null,
  exercises: [
    {
      exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
      exerciseId: '33333333-3333-4333-8333-333333333333',
      exerciseName: 'Bench Press',
      unit: 'lb',
      sets: [{ setNumber: 1, reps: 8, weight: 185 }],
    },
  ],
});

const makeDraft = (overrides: Partial<CoachSessionDraft> = {}): CoachSessionDraft => ({
  taskId: 'aaaa1111-2222-4333-8444-555566667777',
  requestKey: 'bbbb1111-2222-4333-8444-555566667777',
  actorId: 7,
  actorRole: 'trainer',
  targetUserId: 42,
  origin: 'desk',
  revision: 3,
  content: exerciseContent() as unknown as Readonly<Record<string, unknown>>,
  dirty: true,
  scopeToken: { generation: 2, actorId: 7 } as unknown as CoachSessionDraft['scopeToken'],
  ...overrides,
});

const makeSubmitted = (draft: CoachSessionDraft): SubmittedDraft =>
  ({
    taskId: draft.taskId,
    requestKey: draft.requestKey,
    submittedRevision: draft.revision,
    actorId: draft.actorId,
    targetUserId: draft.targetUserId,
    snapshot: draft,
  }) as unknown as SubmittedDraft;

const draftApiState = vi.hoisted(() => ({
  current: {
    actorId: 7,
    actorRole: 'trainer',
    generation: 2,
    draft: null as CoachSessionDraft | null,
    submitted: null as SubmittedDraft | null,
    pendingTargetChange: null as DraftState['pendingTargetChange'],
    begin: vi.fn(),
    edit: vi.fn(),
    freezeForSubmit: vi.fn(),
    resolveTargetChange: vi.fn(),
    discard: vi.fn(),
  },
}));

const surfaceState = vi.hoisted(() => ({
  current: {
    routeKey: '/dashboard/trainer/coach-assistant',
    surfaceKey: 'coach-assistant',
    targetUserId: 42 as number | null,
    selectedEntityIds: [] as ReadonlyArray<string>,
    generation: 2,
    surfaceToken: 'coach-assistant:42:2',
    deskReady: true,
  },
}));

const submitState = vi.hoisted(() => ({
  current: {
    submitting: false,
    error: null as { message: string } | null,
    lastResponse: null as { success: boolean; intentId?: string } | null,
    submit: vi.fn(),
  },
}));

vi.mock('./useCoachSessionDraft', () => ({
  useCoachSessionDraft: () => draftApiState.current,
}));

vi.mock('./useCoachSurfaceContext', () => ({
  useCoachSurfaceContext: () => surfaceState.current,
}));

vi.mock('./useCoachWorkoutDraftSubmit', () => ({
  useCoachWorkoutDraftSubmit: () => submitState.current,
}));

const setDraftApi = (partial: Partial<typeof draftApiState.current>) => {
  Object.assign(draftApiState.current, partial);
  vi.mocked(draftApiState.current.begin).mockReset();
  vi.mocked(draftApiState.current.edit).mockReset();
  vi.mocked(draftApiState.current.freezeForSubmit).mockReset();
  vi.mocked(draftApiState.current.resolveTargetChange).mockReset();
  vi.mocked(draftApiState.current.discard).mockReset();
};

const setSubmit = (partial: Partial<typeof submitState.current>) => {
  Object.assign(submitState.current, partial);
  vi.mocked(submitState.current.submit).mockReset();
};

beforeEach(() => {
  setDraftApi({ actorId: 7, actorRole: 'trainer', generation: 2, draft: null, submitted: null, pendingTargetChange: null });
  surfaceState.current = {
    routeKey: '/dashboard/trainer/coach-assistant',
    surfaceKey: 'coach-assistant',
    targetUserId: 42,
    selectedEntityIds: [],
    generation: 2,
    surfaceToken: 'coach-assistant:42:2',
    deskReady: true,
  };
  setSubmit({ submitting: false, error: null, lastResponse: null });
});

afterEach(cleanup);

const setup = (props: Partial<CoachSessionDeskProps> = {}) => {
  const onOpenLogger = vi.fn();
  const onCheckResult = vi.fn();
  const onOpenRecord = vi.fn();
  const onBeginTask = vi.fn();
  const view = render(
    <CoachSessionDesk
      onOpenLogger={onOpenLogger}
      onCheckResult={onCheckResult}
      onOpenRecord={onOpenRecord}
      onBeginTask={onBeginTask}
      {...props}
    />,
  );
  return { onOpenLogger, onCheckResult, onOpenRecord, onBeginTask, ...view };
};

const deskRoot = (container: HTMLElement) => container.querySelector('.coach-session-desk');

describe('G04c session desk', () => {
  it('renders the empty state with the three begin actions and no draft surface', () => {
    const { container } = setup();
    expect(deskRoot(container)?.getAttribute('data-desk-state')).toBe('empty');
    expect(screen.getByTestId('coach-session-desk-state').textContent).toBe('What are we working on?');
    expect(screen.getByTestId('coach-session-desk-log')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-review-progress')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-ask')).toBeTruthy();
    expect(screen.queryByTestId('coach-workout-draft')).toBeNull();
  });

  it('renders the draft state and task chip when the owner has work', () => {
    const draft = makeDraft();
    setDraftApi({ draft });
    const { container } = setup();
    expect(deskRoot(container)?.getAttribute('data-desk-state')).toBe('draft');
    expect(screen.getByTestId('coach-session-desk-state').textContent).toBe('Draft — not saved');
    expect(screen.getByTestId('coach-workout-draft')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-task').textContent).toContain(`Task ${draft.taskId.slice(0, 8)}`);
  });

  it('folds content edits through the owner with scopeToken + expectedRevision', () => {
    const draft = makeDraft();
    setDraftApi({ draft });
    vi.mocked(draftApiState.current.edit).mockReturnValue({ ok: true, draft });
    setup();
    fireEvent.change(screen.getByTestId('coach-workout-draft-title'), { target: { value: 'Push day v2' } });
    expect(draftApiState.current.edit).toHaveBeenCalledTimes(1);
    const args = (draftApiState.current.edit as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBe(draft.scopeToken);
    expect(args[1]).toBe(draft.revision);
    expect((args[2] as { content: CoachWorkoutDraftContent }).content.title).toBe('Push day v2');
  });

  it('freezes the draft into the review state via Review and save', () => {
    const draft = makeDraft();
    const frozen = makeSubmitted(draft);
    setDraftApi({ draft });
    vi.mocked(draftApiState.current.edit).mockReturnValue({ ok: true, draft });
    // Mirror the G04a owner contract: freezing installs the submitted snapshot on the state.
    vi.mocked(draftApiState.current.freezeForSubmit).mockImplementation(() => {
      draftApiState.current.submitted = frozen;
      return frozen;
    });
    const { container } = setup();
    expect(deskRoot(container)?.getAttribute('data-desk-state')).toBe('draft');
    fireEvent.click(screen.getByTestId('coach-session-desk-review-save'));
    expect(draftApiState.current.freezeForSubmit).toHaveBeenCalledWith(draft.scopeToken, draft.revision);
    // The desk re-derives review from the owner's installed submitted snapshot.
    expect(deskRoot(container)?.getAttribute('data-desk-state')).toBe('review');
    expect(screen.getByTestId('coach-session-desk-state').textContent).toBe('Review this workout');
    expect(screen.getByTestId('coach-session-desk-confirm')).toBeTruthy();
  });

  it('emits the allowlisted Logger bridge payload (taskId/requestKey/revision/target/content) — nothing else', () => {
    const draft = makeDraft();
    setDraftApi({ draft });
    const { onOpenLogger } = setup();
    fireEvent.click(screen.getByTestId('coach-session-desk-open-logger-draft'));
    expect(onOpenLogger).toHaveBeenCalledTimes(1);
    expect(onOpenLogger.mock.calls[0]?.[0]).toEqual({
      taskId: draft.taskId,
      requestKey: draft.requestKey,
      revision: draft.revision,
      targetUserId: draft.targetUserId,
      content: exerciseContent(),
    });
  });

  it('enters the review state when the owner has a submitted snapshot and nothing else is in flight', () => {
    const draft = makeDraft();
    setDraftApi({ draft, submitted: makeSubmitted(draft) });
    const { container } = setup();
    expect(deskRoot(container)?.getAttribute('data-desk-state')).toBe('review');
    // Frozen preview is read-only (disabled) and shows the frozen snapshot.
    const preview = screen.getByTestId('coach-workout-draft');
    expect(preview).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-confirm')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-edit-draft')).toBeTruthy();
  });

  it('shows the executing state and disables the stop control while the transport is in flight', () => {
    const draft = makeDraft();
    setDraftApi({ draft, submitted: makeSubmitted(draft) });
    setSubmit({ submitting: true });
    const { container } = setup();
    expect(deskRoot(container)?.getAttribute('data-desk-state')).toBe('executing');
    expect(deskRoot(container)?.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByTestId('coach-session-desk-saving')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-stop-response').hasAttribute('disabled')).toBe(true);
  });

  it('moves to committed on a success intent receipt and offers check/open', () => {
    const draft = makeDraft();
    setDraftApi({ draft, submitted: makeSubmitted(draft) });
    setSubmit({ lastResponse: { success: true, intentId: 'intent-1' } });
    const { container } = setup();
    expect(deskRoot(container)?.getAttribute('data-desk-state')).toBe('committed');
    expect(screen.getByTestId('coach-session-desk-check-result')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-open-record')).toBeTruthy();
  });

  it('reports verified / rolled_back as terminal states and retains the receipt note', () => {
    const draft = makeDraft();
    const submitted = makeSubmitted(draft);
    setDraftApi({ draft, submitted });
    setSubmit({ lastResponse: { success: true, intentId: 'i' } });
    let container = setup({ lastCheckOutcome: 'verified' }).container;
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-desk-state')).toBe('verified');
    expect(screen.getByTestId('coach-session-desk-terminal-note')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-open-verified')).toBeTruthy();

    setDraftApi({ draft, submitted });
    setSubmit({ lastResponse: { success: true, intentId: 'i' } });
    container = setup({ lastCheckOutcome: 'rolled_back' }).container;
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-desk-state')).toBe('rolled_back');
    expect(screen.getByTestId('coach-session-desk-review-retry')).toBeTruthy();
  });

  it('prefers offline and access_revoked over all other states', () => {
    const draft = makeDraft();
    setDraftApi({ draft });
    let { container } = setup({ offline: true });
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-desk-state')).toBe('offline');
    expect(screen.getByTestId('coach-session-desk-offline').textContent).toContain('open in this tab only');

    setDraftApi({ draft });
    cleanup();
    container = setup({ accessRevoked: true }).container;
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-desk-state')).toBe('access_revoked');
    expect(screen.getByTestId('coach-session-desk-state').textContent).toBe('This record is no longer available.');
  });

  it('surfaces the target-switch dialog and resolves return/discard through the owner', () => {
    const draft = makeDraft();
    const targetChange = { scopeToken: draft.scopeToken, fromTargetUserId: 42, nextTargetUserId: 55 } as DraftState['pendingTargetChange'];
    setDraftApi({ draft, pendingTargetChange: targetChange });
    const setupResult = setup();
    const dialog = screen.getByTestId('coach-session-desk-target-choice');
    expect(dialog.getAttribute('data-from-target')).toBe('42');
    expect(dialog.getAttribute('data-next-target')).toBe('55');

    vi.mocked(draftApiState.current.resolveTargetChange).mockReturnValue({ kind: 'none', reason: 'OK' });
    fireEvent.click(screen.getByTestId('coach-session-desk-target-return'));
    expect(draftApiState.current.resolveTargetChange).toHaveBeenCalledWith(draft.scopeToken, 'return');

    vi.mocked(draftApiState.current.resolveTargetChange).mockReturnValue({ kind: 'none', reason: 'STALE_SCOPE' });
    fireEvent.click(screen.getByTestId('coach-session-desk-target-discard'));
    expect(draftApiState.current.discard).toHaveBeenCalledWith(draft.scopeToken);
  });

  it('routes Confirm through the G04b transport submit()', () => {
    const draft = makeDraft();
    const submit = vi.fn().mockResolvedValue(undefined);
    setDraftApi({ draft, submitted: makeSubmitted(draft) });
    setSubmit({ submitting: false, error: null, lastResponse: null, submit });
    const { container } = setup();
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-desk-state')).toBe('review');
    const confirm = container.querySelector('[data-testid="coach-session-desk-confirm"]') as HTMLElement;
    expect(confirm).toBeTruthy();
    fireEvent.click(confirm);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('reports unknown when the transport had no deterministic receipt', () => {
    const draft = makeDraft();
    setDraftApi({ draft, submitted: makeSubmitted(draft) });
    setSubmit({ lastResponse: { success: false }, error: { message: 'Network dropped after send.' } });
    const { container } = setup();
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-desk-state')).toBe('unknown');
    expect(screen.getByTestId('coach-session-desk-check-result-unknown')).toBeTruthy();
    expect(screen.getByTestId('coach-session-desk-close-unknown')).toBeTruthy();
  });

  it('reports empty when a stale surface generation has no live draft', () => {
    // surface.generation (2) !== owner generation (3) and no draft/submitted -> empty (remask).
    Object.assign(draftApiState.current, { generation: 3 });
    const { container } = setup();
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-desk-state')).toBe('empty');
    expect(container.querySelector('.coach-session-desk')?.getAttribute('data-surface-token')).toBe(surfaceState.current.surfaceToken);
  });
});
