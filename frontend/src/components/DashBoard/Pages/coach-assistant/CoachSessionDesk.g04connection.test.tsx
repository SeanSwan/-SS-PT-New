/** G04C-T04 — current/frozen presentation, truthful preparation copy and no-op guards. */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachSessionDesk from './CoachSessionDesk';
import type { CoachSessionDraft, DraftState, SubmittedDraft } from './coachSessionDraftState';
import type { CoachWorkoutDraftContent } from './coachWorkoutDraftContract';

vi.mock('react-window', () => ({
  useListRef: () => ({ current: { scrollToRow: vi.fn() } }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, id, role, 'aria-label': ariaLabel }: any) => (
    <div id={id} role={role} aria-label={ariaLabel} style={{ height: rowHeight }}>
      {Array.from({ length: rowCount }).map((_, index) => <RowComponent key={index} index={index} style={{}} />)}
    </div>
  ),
}));

vi.mock('../../../WorkoutLogger/useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    results: [], allExercises: [], isSearching: false, isLoading: false, loadError: null,
    setQuery: vi.fn(), setCategory: vi.fn(), query: '', category: null, refresh: vi.fn(),
  }),
}));

const exercise = {
  exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
  exerciseId: '33333333-3333-4333-8333-333333333333',
  exerciseKey: 'bench-press',
  exerciseName: 'Bench Press',
  unit: 'lb' as const,
  sets: [{ setNumber: 1, reps: 8, weight: 185 }],
};

const content = (title: string, complete = true): CoachWorkoutDraftContent => ({
  date: '2026-09-12', title, notes: null, duration: 45, intensity: 7, source: 'coach',
  exercises: [{ ...exercise, sets: [{ setNumber: 1, reps: complete ? 8 : null, weight: complete ? 185 : null }] }],
});

const state = vi.hoisted(() => ({
  draft: null as CoachSessionDraft | null,
  submitted: null as SubmittedDraft | null,
  pendingTargetChange: null as DraftState['pendingTargetChange'],
  actorId: 7, actorRole: 'trainer', generation: 2,
  begin: vi.fn(), edit: vi.fn(), freezeForSubmit: vi.fn(), resolveTargetChange: vi.fn(), discard: vi.fn(),
}));
const submitState = vi.hoisted(() => ({ submitting: false, error: null as Error | null, lastResponse: null as any, submit: vi.fn() }));

vi.mock('./useCoachSessionDraft', () => ({ useCoachSessionDraft: () => state }));
vi.mock('./useCoachSurfaceContext', () => ({ useCoachSurfaceContext: () => ({
  routeKey: '/dashboard/trainer/coach-assistant', surfaceKey: 'coach-assistant', targetUserId: 42,
  selectedEntityIds: [], generation: 2, surfaceToken: 'coach-assistant:42:2', deskReady: true,
}) }));
vi.mock('./useCoachWorkoutDraftSubmit', () => ({ useCoachWorkoutDraftSubmit: () => submitState }));

const makeDraft = (nextContent: CoachWorkoutDraftContent, revision = 5): CoachSessionDraft => ({
  taskId: 'aaaa1111-2222-4333-8444-555566667777', requestKey: 'bbbb1111-2222-4333-8444-555566667777',
  actorId: 7, actorRole: 'trainer', targetUserId: 42, origin: 'desk', revision,
  content: nextContent as unknown as Readonly<Record<string, unknown>>, dirty: true,
  scopeToken: { generation: 2, actorId: 7 } as unknown as CoachSessionDraft['scopeToken'],
});
const makeSubmitted = (draft: CoachSessionDraft): SubmittedDraft => ({
  taskId: draft.taskId, requestKey: draft.requestKey, submittedRevision: draft.revision,
  actorId: draft.actorId, targetUserId: draft.targetUserId, snapshot: draft,
} as unknown as SubmittedDraft);

const reset = () => {
  state.draft = null; state.submitted = null; state.pendingTargetChange = null;
  state.actorId = 7; state.actorRole = 'trainer'; state.generation = 2;
  state.begin.mockReset(); state.edit.mockReset(); state.freezeForSubmit.mockReset(); state.resolveTargetChange.mockReset(); state.discard.mockReset();
  submitState.submitting = false; submitState.error = null; submitState.lastResponse = null; submitState.submit.mockReset();
};

beforeEach(() => { reset(); vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; }); });

describe('G04.1 Session Desk connection', () => {
  it('G04C-T04 keeps current and frozen revisions separate, preserves metadata, and exposes validation', () => {
    const current = makeDraft(content('Current revision', false), 5);
    const frozen = makeDraft(content('Frozen revision', true), 4);
    state.draft = current; state.submitted = makeSubmitted(frozen);
    state.edit.mockReturnValue({ ok: true, draft: current });
    state.freezeForSubmit.mockReturnValue(makeSubmitted(current));
    const view = render(<CoachSessionDesk onOpenLogger={vi.fn()} />);

    expect(screen.getByTestId('coach-session-desk-state')).toHaveTextContent(/Review this workout/i);
    expect(screen.getByTestId('coach-workout-draft-title')).toHaveValue('Frozen revision');
    fireEvent.click(screen.getByTestId('coach-session-desk-edit-draft'));
    expect(screen.getByTestId('coach-workout-draft-title')).toHaveValue('Current revision');
    fireEvent.change(screen.getByTestId('coach-workout-draft-title'), { target: { value: 'Current edited' } });
    expect(state.edit.mock.calls.at(-1)?.[2].content).toMatchObject({ title: 'Current edited', duration: 45, intensity: 7, source: 'coach' });
    fireEvent.click(screen.getByTestId('coach-session-desk-review-save'));
    expect(screen.getByTestId('coach-workout-error-REPS_REQUIRED')).toBeInTheDocument();
    expect(view.container.querySelector('[data-testid="coach-session-desk-confirm"]')).toBeNull();
  });

  it('G04C-T04 labels proposal preparation honestly and never calls it Saved', () => {
    const current = makeDraft(content('Prepared revision', true));
    state.draft = current; state.submitted = makeSubmitted(current);
    submitState.lastResponse = { success: true, intentId: 'intent-1', proposalId: 'proposal-1' };
    render(<CoachSessionDesk onOpenLogger={vi.fn()} />);
    expect(screen.getByTestId('coach-session-desk-state')).toHaveTextContent(/Ready for approval/i);
    expect(screen.queryByText(/Saved/)).toBeNull();
    expect(screen.queryByTestId('coach-session-desk-confirm')).toBeNull();
  });

  it('G04C-T04 does not present no-op Ask or Review progress actions without callbacks', () => {
    render(<CoachSessionDesk />);
    expect(screen.getByTestId('coach-session-desk-ask')).toBeDisabled();
    expect(screen.getByTestId('coach-session-desk-review-progress')).toBeDisabled();
    expect(screen.getByTestId('coach-session-desk-unavailable-action-reason')).toHaveTextContent(/workflows are unavailable/i);
  });
});
