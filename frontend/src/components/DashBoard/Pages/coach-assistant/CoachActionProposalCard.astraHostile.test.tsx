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


import { classifyWorkoutApprovalError, classifyWorkoutApprovalSuccess } from './CoachWorkoutResultState';
import { PlaudApiError } from '../../../../services/plaudClipService';
const ok = (intent=verifiedIntent) => ({status:200,data:{success:true,applied:true,proposal:{...workoutProposal,status:'APPLIED'},workout:savedWorkout,intent}});
describe('AR-G01 truthful proof and card isolation',()=>{
 it('keeps a truly legacy response compatible while treating a primitive intent as unknown',()=>{
  expect(classifyWorkoutApprovalSuccess({},PROPOSAL_ID,TARGET_CLIENT)).toBeNull();
  expect(classifyWorkoutApprovalSuccess({intent:'malformed'},PROPOSAL_ID,TARGET_CLIENT)?.kind).toBe('commit_unknown');
 });
 it('does not claim a save when the outer intent failed but the nested receipt says committed',()=>{
  const outcome=classifyWorkoutApprovalSuccess({intent:{...committedUnverifiedIntent,status:'failed'}},PROPOSAL_ID,TARGET_CLIENT);
  expect(outcome?.kind).toBe('commit_unknown');
 });
 it('recognizes a consistently committed receipt as saved but unverified',()=>{
  const outcome=classifyWorkoutApprovalSuccess({intent:committedUnverifiedIntent},PROPOSAL_ID,TARGET_CLIENT);
  expect(outcome?.kind).toBe('committed_unverified');
 });
 it('classifies approval access denial without exposing private details',()=>{
  const outcome = classifyWorkoutApprovalError(new PlaudApiError('CLIENT_ACCESS_DENIED','private backend detail',403),PROPOSAL_ID);
  expect(outcome).toMatchObject({kind:'lookup_denied',proposalId:PROPOSAL_ID});
 });
 it.each([
  ['schema', {result:{...verifiedIntent.result,schemaVersion:2}}],
  ['missing time', {result:{...verifiedIntent.result,verifiedAt:null}}],
  ['missing target', {targetUserId:null,result:{...verifiedIntent.result,targetUserId:null}}],
  ['wrong proposal', {proposalId:'other',result:{...verifiedIntent.result,proposalId:'other'}}],
  ['conflicting intent', {result:{...verifiedIntent.result,intentId:'other'}}],
  ['empty records', {result:{...verifiedIntent.result,recordRefs:[]}}],
  ['failed state', {status:'failed',result:{...verifiedIntent.result,state:'failed',verifiedAt:null,committedAt:null}}],
 ])('rejects false save proof: %s',(_label,patch)=>{
  const outcome=classifyWorkoutApprovalSuccess({intent:{...verifiedIntent,...patch}},PROPOSAL_ID,TARGET_CLIENT);
  expect(outcome?.kind).not.toBe('verified');
  if(_label==='failed state')expect(outcome?.kind).not.toBe('committed_unverified');
 });
 it('an unrelated card cannot invalidate the first cards pending approval',async()=>{
  let finish:(value:unknown)=>void=()=>undefined;
  vi.mocked(apiService.post).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const first=renderCardInScope(workoutProposal);fireEvent.click(first.getByRole('button',{name:/approve and log/i}));
  renderCardInScope({...workoutProposal,id:'other-proposal',status:'REJECTED'});
  finish(ok());await waitFor(()=>expect(screen.getByText(/saved and checked/i)).toBeInTheDocument());
 });
 it('unmount drops a pending approval and publishes no workout event',async()=>{
  let finish:(value:unknown)=>void=()=>undefined;vi.mocked(apiService.post).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const tracker=collectWorkoutLoggedEvents();const view=renderCardInScope(workoutProposal);
  fireEvent.click(view.getByRole('button',{name:/approve and log/i}));view.unmount();finish(ok());
  await new Promise(resolve=>setTimeout(resolve,40));expect(tracker.events).toHaveLength(0);tracker.stop();
 });
 it('a changed proposal starts with its own details and review token',async()=>{
  const view=render(<MemoryRouter><CoachActionProposalCard proposal={workoutProposal}/></MemoryRouter>);
  view.rerender(<MemoryRouter><CoachActionProposalCard proposal={{...workoutProposal,id:'other-proposal',detail:undefined,reviewToken:undefined}}/></MemoryRouter>);
  expect(screen.getByRole('button',{name:/approve and log/i})).toBeDisabled();
 });
});
describe('G01 mounted approval transport edge cases', () => {
  it('200 applied response with a corrupt intent stays uncertain, offers Check result, and never celebrates', async () => {
    const tracker = collectWorkoutLoggedEvents();
    vi.mocked(apiService.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        proposal: { ...workoutProposal, status: 'APPLIED' },
        applied: true,
        workout: savedWorkout,
        // Preserve the malformed wire value: the UI must not trust `applied`.
        intent: 'corrupt' as unknown as Record<string, unknown>,
      },
    });

    renderMountedConsumer(workoutProposal);
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /check result/i })).toBeInTheDocument());
    expect(screen.getByText(/checking whether the workout was saved/i)).toBeInTheDocument();
    expect(screen.queryByText(/saved and checked/i)).toBeNull();
    expect(screen.queryByText(/Applied through the deterministic workout logger/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /approve and log/i })).toBeNull();
    expect(approveCalls()).toHaveLength(1);
    expect(tracker.events).toHaveLength(0);
    tracker.stop();
  });

  it('Axios-shaped 403 approval denial renders generic safe copy, hides backend detail, and does not repeat approval', async () => {
    const privateBackendDetail = 'PRIVATE_BACKEND_DETAIL_DO_NOT_LEAK';
    vi.mocked(apiService.post).mockRejectedValue(axiosLikeError(403, {
      success: false,
      code: 'CLIENT_ACCESS_DENIED',
      error: privateBackendDetail,
    }));

    renderMountedConsumer(workoutProposal);
    expect(screen.getByText(/Workout draft ready for trainer review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve and log/i }));

    await waitFor(() => expect(screen.getByText(/You do not have access to verify this workout result/i)).toBeInTheDocument());
    expect(screen.queryByText(privateBackendDetail)).toBeNull();
    expect(screen.queryByText(/Workout draft ready for trainer review/i)).toBeNull();
    expect(screen.queryByText(/Approval failed/i)).toBeNull();
    expect(screen.queryByText(/saved and checked|checking whether/i)).toBeNull();
    const approve = screen.getByRole('button', { name: /approve and log/i });
    expect(approve).toBeDisabled();
    fireEvent.click(approve);
    expect(approveCalls()).toHaveLength(1);
  });
});
