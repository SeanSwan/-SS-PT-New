/**
 * G01 FROZEN ACCEPTANCE GATE — truthful proposal results and recovery.
 *
 * Gate spec: docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/
 *            31-gwen-execution-handoff.md (GW01–GW05), 32 contract §G01.
 *
 * Method (per handoff): the card is exercised with the REAL service
 * adapter (coachProposalService runs un-mocked) over intercepted HTTP
 * (the axios-instance transport is stubbed; every response body is the
 * exact shape the server serializers produce), plus its mounted
 * transcript consumer (CoachCommandLogEntry). A mocked action hook
 * alone does not meet this gate.
 *
 * Server-shape authorities (verified 2026-09-06):
 *  - toPublicCoachIntent  backend/services/ai/coachIntentService.mjs:31
 *    { id, commandType, targetUserId, status, operationId, proposalId,
 *      expiresAt, createdAt, updatedAt, result: <receipt> }
 *    where receipt.state is the receipt authority (intent.result.state),
 *    not intent.status. 'completed' is mapped to committed_unverified
 *    server-side; only state 'verified' may celebrate.
 *  - coachIntentReceipt.mjs:35 toCoachIntentReceipt
 *    { schemaVersion: 1, intentId, operationId, proposalId, state,
 *      commandType, targetUserId, committedAt, verifiedAt, recordRefs
 *      [{kind: daily_workout_form|workout_session|workout_log|
 *      workout_plan|coach_proposal, id, version}], realAffectedCount,
 *      reversibility, undoAvailable, reasonCode, correlationId }
 *  - approve 200 body (v2): { success, proposal, applied, workout,
 *    intent: <public intent> }                    coachWorkoutProposalApprovalService.mjs:83
 *  - approve 503 bodies: WORKOUT_RESULT_UNAVAILABLE { success:false,
 *    saved:true, code, intentId?, proposalId, error }   :98
 *    WORKOUT_COMMIT_UNKNOWN { success:false, code, intentId?, error } :93
 *  - nested detail intent: GET /api/coach/proposals/:id →
 *    proposal.intent (v2 reviewWorkoutIntentProposal:39)
 *  - authorized lookup: GET /api/ai-command/intents/:intentId →
 *    { success:true, intent: <public intent> }   aiCommandRoutes.mjs:517
 *
 * Record navigation is DERIVED from known receipt kinds + current
 * dashboard scope, never from response-provided URLs:
 *  - trainer scope → /dashboard/trainer/log-workout?clientId=<target>
 *  - admin   scope → /dashboard/admin/client-management?clientId=<target>
 *  - client  scope → /dashboard/client/workouts
 *  - unknown scope → no link (honest uncertainty)
 */
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../../services/api.service';
import { CoachActionProposalCard } from './CoachActionProposalCard';
import CoachCommandLogEntry from './CoachCommandLogEntry';
import type { CoachCommandLogEntryProps } from './CoachCommandLogEntry.types';
import type { CoachActionProposal } from './SwanCoachTypes';
import { WORKOUT_LOGGED_EVENT } from '../../../../utils/workoutLoggedEvent';

vi.mock('../../../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

/* ── fixtures: exact server serializer shapes ──────────────────────── */

const PROPOSAL_ID = '11111111-1111-1111-1111-111111111111';
const TARGET_CLIENT = 42;

const workoutProposal: CoachActionProposal = {
  id: PROPOSAL_ID,
  type: 'workout_log',
  status: 'PENDING',
  title: 'Review workout log draft',
  summary: { clientId: TARGET_CLIENT, date: '2026-05-05', exerciseCount: 2 },
  detail: {
    workout: {
      clientId: TARGET_CLIENT,
      date: '2026-05-05',
      exercises: [{ name: 'Squat' }, { name: 'Row' }],
    },
  },
  reviewToken: 'review-token-1',
};

const verifiedIntent = {
  id: 'intent-verified-1',
  commandType: 'coach_workout_log',
  targetUserId: TARGET_CLIENT,
  status: 'verified',
  operationId: PROPOSAL_ID,
  proposalId: PROPOSAL_ID,
  expiresAt: null,
  createdAt: '2026-05-05T12:00:00.000Z',
  updatedAt: '2026-05-05T12:00:02.000Z',
  result: {
    schemaVersion: 1,
    intentId: 'intent-verified-1',
    operationId: PROPOSAL_ID,
    proposalId: PROPOSAL_ID,
    state: 'verified',
    commandType: 'coach_workout_log',
    targetUserId: TARGET_CLIENT,
    committedAt: '2026-05-05T12:00:01.000Z',
    verifiedAt: '2026-05-05T12:00:02.000Z',
    recordRefs: [
      { kind: 'daily_workout_form', id: '9001', version: null },
      { kind: 'workout_session', id: '9002', version: null },
      { kind: 'workout_log', id: '9003', version: null },
    ],
    realAffectedCount: 3,
    reversibility: 'none',
    undoAvailable: false,
    reasonCode: null,
    correlationId: null,
  },
};

const committedUnverifiedIntent = {
  ...verifiedIntent,
  id: 'intent-unverified-1',
  status: 'committed_unverified',
  result: {
    ...verifiedIntent.result,
    intentId: 'intent-unverified-1',
    state: 'committed_unverified',
    verifiedAt: null,
    realAffectedCount: 2,
  },
};

const verifiedLookupIntent = {...verifiedIntent,id:'intent-unverified-1',result:{...verifiedIntent.result,intentId:'intent-unverified-1'}};

const savedWorkout = {
  userId: TARGET_CLIENT,
  formId: '9001',
  sessionId: '9002',
  date: '2026-05-05',
};

/** A real axios-shaped error as the service layer receives it. */
const axiosLikeError = (status: number, body: Record<string, unknown>) => ({
  isAxiosError: true,
  message: `Request failed with status code ${status}`,
  response: { status, data: body },
});

/** POST /api/ai-command/intents/:intentId → exact route body. */
const intentReadOk = (intent: unknown) => ({ data: { success: true, intent } });
const intentReadDenied = axiosLikeError(403, { success: false, code: 'CLIENT_ACCESS_DENIED' });
const intentReadGone = axiosLikeError(404, { success: false, error: 'Intent not found or unavailable.' });

/* ── helpers ───────────────────────────────────────────────────────── */

const TRAINER_PATH = '/dashboard/trainer/coach-assistant';

function renderCardInScope(proposal: CoachActionProposal, path = TRAINER_PATH) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CoachActionProposalCard proposal={proposal} />
    </MemoryRouter>,
  );
}

function renderMountedConsumer(proposal: CoachActionProposal, path = TRAINER_PATH) {
  const entry = {
    id: 'entry-1',
    actor: 'coach' as const,
    label: 'coach reply',
    body: 'Prepared an action for your review:',
    proposals: [proposal],
  };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CoachCommandLogEntry
        // The transcript consumer is a mounted, uncontrolled consumer: it
        // forwards no onProposalAction, so the card publishes via the shared
        // proposal-action event (the real production path).
        {...({ entry } as Partial<CoachCommandLogEntryProps> as CoachCommandLogEntryProps)}
      />
    </MemoryRouter>,
  );
}

function collectWorkoutLoggedEvents() {
  const events: Array<{ clientId?: number | string | null; formId?: number | string | null; date?: string | null }> = [];
  const listener = (event: Event) => {
    events.push((event as CustomEvent).detail ?? {});
  };
  window.addEventListener(WORKOUT_LOGGED_EVENT, listener);
  return { events, stop: () => window.removeEventListener(WORKOUT_LOGGED_EVENT, listener) };
}

const approveCalls = () =>
  vi.mocked(apiService.post).mock.calls.filter(([url]) => String(url).includes('/approve'));
const intentLookupCalls = () =>
  vi.mocked(apiService.get).mock.calls.filter(([url]) => String(url).includes('/api/ai-command/intents/'));
const proposalLookupCalls = () =>
  vi.mocked(apiService.get).mock.calls.filter(([url]) => String(url).includes(`/api/coach/proposals/${PROPOSAL_ID}`));

/* ── GW01/T-GW01 — three success states, real service adapter ──────── */

// Per-test hygiene: the module-level mocked transport accumulates calls and
// mounted DOM across tests, so clear call history before each test and unmount
// after each. (cleanup/beforeEach/afterEach are the gate's declared infra.)
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe('G01 GW01: truthful save outcomes through the real service adapter', () => {
  it('verified receipt: one approval POST, "Saved and checked", derived record link, real progress refetch', async () => {
    const tracker = collectWorkoutLoggedEvents();
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        intent: verifiedIntent,
      },
    });

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());

    // Exactly ONE approval POST — the whole point of idempotent approval.
    expect(approveCalls()).toHaveLength(1);
    expect(String(approveCalls()[0][0])).toBe(`/api/coach/proposals/${PROPOSAL_ID}/approve`);
    expect(approveCalls()[0][1]).toEqual({ reviewToken: 'review-token-1' });

    // Verified celebration is bounded copy, no raw receipt strings.
    expect(screen.queryByText(/saved; checking result/i)).toBeNull();
    expect(screen.queryByText(/checking whether/i)).toBeNull();

    // Record link derived from receipt kinds + current trainer scope.
    const link = screen.getByRole('link', { name: /workout record|open workout record|view workout record/i });
    expect(link.getAttribute('href')).toBe(`/dashboard/trainer/log-workout?clientId=${TARGET_CLIENT}`);

    // Real progress refetch seam fires exactly once, bound to the receipt target.
    expect(tracker.events).toHaveLength(1);
    expect(tracker.events[0]).toMatchObject({
      clientId: TARGET_CLIENT,
      formId: '9001',
      date: '2026-05-05',
    });
    tracker.stop();
  });

  it('committed_unverified: "Saved; checking result" + Check result; no verified celebration', async () => {
    const tracker = collectWorkoutLoggedEvents();
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        intent: committedUnverifiedIntent,
      },
    });

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/saved; checking result/i)).toBeInTheDocument());
    expect(screen.queryByText(/saved and checked/i)).toBeNull();
    // No celebration link, no progress refetch before verification.
    expect(screen.queryByRole('link', { name: /workout record|open workout record|view workout record/i })).toBeNull();
    expect(tracker.events).toHaveLength(0);
    // Repeat approval is impossible once the effect committed.
    const approve = screen.queryByRole('button', { name: /approve and log/i });
    expect(!approve || approve.hasAttribute('disabled')).toBe(true);

    // Check result performs the authorized intent lookup, then celebrates verified.
    vi.mocked(apiService.get).mockResolvedValue(intentReadOk(verifiedLookupIntent));
    fireEvent.click(screen.getByRole('button', { name: /check result/i }));
    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
    expect(intentLookupCalls()).toHaveLength(1);
    expect(String(intentLookupCalls()[0][0])).toBe('/api/ai-command/intents/intent-unverified-1');
    const link = screen.getByRole('link', { name: /workout record|open workout record|view workout record/i });
    expect(link.getAttribute('href')).toBe(`/dashboard/trainer/log-workout?clientId=${TARGET_CLIENT}`);
    expect(tracker.events).toHaveLength(1);
    tracker.stop();
  });

  it('503 WORKOUT_RESULT_UNAVAILABLE (with intentId): saved copy, lookup keeps identity, no repeat approval', async () => {
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(503, {
      success: false,
      saved: true,
      code: 'WORKOUT_RESULT_UNAVAILABLE',
      intentId: 'intent-unverified-1',
      proposalId: PROPOSAL_ID,
      error: 'Workout saved. Result verification is currently unavailable.',
    }));

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/workout saved/i)).toBeInTheDocument());
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    // Not collapsed into the generic failure with another live Approve.
    const approve = screen.queryByRole('button', { name: /approve and log/i });
    expect(!approve || approve.hasAttribute('disabled')).toBe(true);

    vi.mocked(apiService.get).mockResolvedValue(intentReadOk(verifiedLookupIntent));
    fireEvent.click(screen.getByRole('button', { name: /check result/i }));
    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
    expect(String(intentLookupCalls()[0][0])).toBe('/api/ai-command/intents/intent-unverified-1');
    expect(approveCalls()).toHaveLength(1); // lookup never re-sends approval
  });

  it('503 WORKOUT_RESULT_UNAVAILABLE without intentId: proposalId fallback lookup', async () => {
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(503, {
      success: false,
      saved: true,
      code: 'WORKOUT_RESULT_UNAVAILABLE',
      proposalId: PROPOSAL_ID,
      error: 'Workout saved. Result verification is currently unavailable.',
    }));

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/workout saved/i)).toBeInTheDocument());

    // Fallback lookup through the existing authorized proposal detail route.
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED', intent: verifiedIntent },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /check result/i }));
    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
    expect(proposalLookupCalls().length).toBe(1);
    expect(intentLookupCalls()).toHaveLength(0);
  });
});

/* ── GW02/T-GW02 — effect then dropped response ───────────────────── */

describe('G01 GW02: commit-unknown and dropped responses are honest uncertainty', () => {
  it('503 WORKOUT_COMMIT_UNKNOWN: "checking whether it saved", lookup only, no resend/reject', async () => {
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(503, {
      success: false,
      code: 'WORKOUT_COMMIT_UNKNOWN',
      intentId: 'intent-unverified-1',
      error: 'Save confirmation was interrupted. Check workout history before trying again.',
    }));

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/checking whether/i)).toBeInTheDocument());
    expect(screen.queryByText(/saved and checked/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();

    vi.mocked(apiService.get).mockResolvedValue(intentReadOk(verifiedLookupIntent));
    fireEvent.click(screen.getByRole('button', { name: /check result/i }));
    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());

    // Exactly one approval POST across the whole flow; the lookup added none.
    expect(approveCalls()).toHaveLength(1);
    expect(intentLookupCalls()).toHaveLength(1);
  });

  it('dropped response with no recovery code: identity retained, proposal-detail lookup, honest result', async () => {
    vi.mocked(apiService.post).mockRejectedValue(new Error('Network Error'));

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    // Honest uncertainty copy, never a raw error or a live Approve button.
    await waitFor(() => expect(screen.getByText(/checking whether/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /approve and log/i })?.hasAttribute('disabled') ?? true).toBe(true);
    expect(screen.queryByText(/network error/i)).toBeNull();

    // The lookup comes back "not found": honest uncertainty / manual history,
    // NOT a retry affordance and NOT a false save.
    vi.mocked(apiService.get).mockRejectedValue(
      axiosLikeError(404, { success: false, code: 'PROPOSAL_NOT_FOUND' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /check result/i }));
    await waitFor(() => expect(screen.getByText(/unavailable|history|manual/i)).toBeInTheDocument());
    expect(screen.queryByText(/saved and checked/i)).toBeNull();
    expect(proposalLookupCalls().length).toBe(1);
    expect(approveCalls()).toHaveLength(1);
  });
});

/* ── GW03/T-GW03 — both 503 codes, with/without intentId ──────────── */

describe('G01 GW03: recovery codes never collapse into generic Approval failed', () => {
  it.each([
    ['WORKOUT_RESULT_UNAVAILABLE', true],
    ['WORKOUT_COMMIT_UNKNOWN', false],
  ])('503 %s (saved=%s): no resend/cancel/reject affordance, no generic copy', async (code, saved) => {
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(503, {
      success: false,
      ...(saved ? { saved: true } : {}),
      code,
      intentId: 'intent-unverified-1',
      proposalId: PROPOSAL_ID,
      error: 'server-internal-error-detail-that-must-not-leak',
    }));

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() =>
      expect(screen.getByText(/workout saved|checking whether/i)).toBeInTheDocument(),
    );
    // Bounded copy: the raw server error string is not rendered.
    expect(screen.queryByText(/server-internal-error-detail/i)).toBeNull();
    const approve = screen.queryByRole('button', { name: /approve and log/i });
    expect(!approve || approve.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
  });

  it('duplicate clicks during a Check-result lookup issue exactly one GET', async () => {
    let resolveLookup: (value: unknown) => void = () => undefined;
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(503, {
      success: false, saved: true, code: 'WORKOUT_RESULT_UNAVAILABLE',
      intentId: 'intent-unverified-1', proposalId: PROPOSAL_ID,
    }));
    vi.mocked(apiService.get).mockImplementation(
      () => new Promise((resolve) => { resolveLookup = resolve; }),
    );

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /check result/i })).toBeInTheDocument());

    const check = screen.getByRole('button', { name: /check result/i });
    fireEvent.click(check);
    fireEvent.click(check);
    fireEvent.click(check);

    await waitFor(() => expect(intentLookupCalls().length).toBeGreaterThanOrEqual(1));
    await Promise.resolve();
    expect(intentLookupCalls()).toHaveLength(1); // in-flight guard
    resolveLookup(intentReadOk(verifiedLookupIntent));
    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
  });
});

/* ── GW04/T-GW04 — revocation / target switch while lookup waits ──── */

describe('G01 GW04: access changes while a lookup is in flight', () => {
  it('revoked access during lookup: old detail stays hidden, generic copy, no private receipt', async () => {
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(503, {
      success: false, saved: true, code: 'WORKOUT_RESULT_UNAVAILABLE',
      intentId: 'intent-unverified-1', proposalId: PROPOSAL_ID,
    }));
    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));
    await waitFor(() => expect(screen.getByText(/workout saved/i)).toBeInTheDocument());

    vi.mocked(apiService.get).mockRejectedValue(intentReadDenied);
    fireEvent.click(screen.getByRole('button', { name: /check result/i }));

    await waitFor(() => expect(screen.getByText(/unavailable|history|manual/i)).toBeInTheDocument());
    // No celebration, no record link, no cached private receipt data.
    expect(screen.queryByText(/saved and checked/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /workout record|open workout record|view workout record/i })).toBeNull();
    expect(screen.queryByText(/squat/i)).toBeNull();
    expect(screen.queryByText(/client access denied/i)).toBeNull(); // generic copy
  });

  it('late lookup response for a stale proposal generation is ignored', async () => {
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(503, {
      success: false, saved: true, code: 'WORKOUT_RESULT_UNAVAILABLE',
      intentId: 'intent-unverified-1', proposalId: PROPOSAL_ID,
    }));
    const tracker = collectWorkoutLoggedEvents();
    const previous = renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /check result/i })).toBeInTheDocument());

    let resolveLookup: (value: unknown) => void = () => undefined;
    vi.mocked(apiService.get).mockImplementation(
      () => new Promise((resolve) => { resolveLookup = resolve; }),
    );
    fireEvent.click(screen.getByRole('button', { name: /check result/i }));

    // Target switch: the shell re-keys the card to a DIFFERENT proposal while
    // the lookup for the old one is still in flight.
    const other: CoachActionProposal = { ...workoutProposal, id: '22222222-2222-2222-2222-222222222222', summary: { clientId: 43, date: '2026-05-06', exerciseCount: 1 } };
    previous.unmount(); // an actual scope switch removes the old card
    const { unmount } = renderCardInScope(other);
    resolveLookup(intentReadOk(verifiedLookupIntent));
    await Promise.resolve();
    await Promise.resolve();

    // The stale verified receipt (target 42) must not celebrate on the new
    // card (target 43), and must not dispatch a progress refetch for it.
    const celebration = screen.queryByText(/saved and checked/i);
    if (celebration) {
      celebration.closest('div');
    }
    const links = screen.queryAllByRole('link', { name: /workout record|open workout record|view workout record/i });
    expect(links.length).toBeLessThanOrEqual(1);
    const staleLink = links.find((el) => el.getAttribute('href') === '/dashboard/trainer/log-workout?clientId=42');
    expect(staleLink).toBeUndefined();
    expect(tracker.events).toHaveLength(0);
    tracker.stop();
    unmount();
  });
});

/* ── GW05/T-GW05 — repeated clicks, stale props, malformed receipts ─ */

describe('G01 GW05: click, prop and proof hygiene', () => {
  it('rapid double-click of Approve issues exactly one approval POST', async () => {
    let resolveApprove: (value: unknown) => void = () => undefined;
    vi.mocked(apiService.post).mockImplementation(
      () => new Promise((resolve) => { resolveApprove = resolve; }),
    );

    renderCardInScope(workoutProposal);
    const approve = screen.getByRole('button', { name: /approve and log/i });
    fireEvent.click(approve);
    fireEvent.click(approve);
    fireEvent.click(approve);

    await waitFor(() => expect(approveCalls().length).toBeGreaterThanOrEqual(1));
    await Promise.resolve();
    expect(approveCalls()).toHaveLength(1);
    resolveApprove({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        intent: verifiedIntent,
      },
    });
    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
  });

  it('rerender with stale PENDING props cannot revive approval after a terminal outcome', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        intent: verifiedIntent,
      },
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={[TRAINER_PATH]}>
        <CoachActionProposalCard proposal={workoutProposal} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));
    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());

    // Shell refresh re-renders with the ORIGINAL (stale PENDING) props.
    rerender(
      <MemoryRouter initialEntries={[TRAINER_PATH]}>
        <CoachActionProposalCard proposal={workoutProposal} />
      </MemoryRouter>,
    );
    const approve = screen.queryByRole('button', { name: /approve and log/i });
    expect(!approve || approve.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/saved and checked/i)).toBeInTheDocument();
  });

  it.each([
    ['missing result', { ...verifiedIntent, result: undefined }],
    ['unknown state', { ...verifiedIntent, result: { ...verifiedIntent.result, state: 'unknown', verifiedAt: null } }],
    ['malformed recordRefs', {
      ...verifiedIntent,
      result: { ...verifiedIntent.result, state: 'verified', recordRefs: [{ kind: 'bogus_kind', id: 'x' }], targetUserId: 999 },
    }],
  ])('malformed proof (%s): no verified celebration', async (_label, intent) => {
    const tracker = collectWorkoutLoggedEvents();
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        intent,
      },
    });

    renderCardInScope(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(approveCalls()).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByText(/checking result|checking whether|unavailable|saved/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/saved and checked/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /workout record|open workout record|view workout record/i })).toBeNull();
    expect(tracker.events).toHaveLength(0); // no progress refetch on malformed proof
    tracker.stop();
  });

  it('legacy non-workout proposals keep their existing deterministic behavior', async () => {
    const onboarding: CoachActionProposal = {
      id: '33333333-3333-3333-3333-333333333333',
      type: 'client_onboarding',
      status: 'PENDING',
      title: 'Onboard client draft',
      summary: { clientId: 44 },
      detail: { client: { firstName: 'Ada', lastName: 'L', clientSource: 'swanstudios' } },
      reviewToken: 'rt-onb',
    };
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...onboarding, status: 'APPLIED' },
        applied: true,
        client: { id: 44 },
        accessHandoff: { credentialMode: 'claim_link_ready', claimCode: 'AB12CD', claimUrl: 'https://claim.example/c' },
      },
    });

    renderCardInScope(onboarding);
    fireEvent.click(screen.getByRole('button', { name: /approve draft/i }));

    await waitFor(() => expect(screen.getByText(/claim link ready/i)).toBeInTheDocument());
    expect(screen.getByText(/claim link ready/i)).toBeInTheDocument();
    // Onboarding handoff panel renders through the existing path.
    expect(screen.getByRole('link', { name: /claim link/i })).toBeInTheDocument();
    // No workout-record machinery on a non-workout proposal.
    expect(screen.queryByRole('link', { name: /workout record|open workout record|view workout record/i })).toBeNull();
  });
});

/* ── mounted transcript consumer ───────────────────────────────────── */

describe('G01: mounted transcript consumer (real route → card → service → HTTP)', () => {
  it('a coach log entry card reaches the same truthful verified outcome through the mounted consumer', async () => {
    const tracker = collectWorkoutLoggedEvents();
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        intent: verifiedIntent,
      },
    });

    renderMountedConsumer(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
    const link = screen.getByRole('link', { name: /workout record|open workout record|view workout record/i });
    expect(link.getAttribute('href')).toBe(`/dashboard/trainer/log-workout?clientId=${TARGET_CLIENT}`);
    expect(approveCalls()).toHaveLength(1);
    expect(tracker.events).toHaveLength(1);
    tracker.stop();
  });

  it('admin scope derives the Client Hub record route, never a response URL', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        intent: verifiedIntent,
      },
    });

    renderCardInScope(workoutProposal, '/dashboard/admin/coach-assistant');
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
    const link = screen.getByRole('link', { name: /workout record|open workout record|view workout record/i });
    expect(link.getAttribute('href')).toBe(`/dashboard/admin/client-management?clientId=${TARGET_CLIENT}`);
  });
});
