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



import {useState} from 'react';
import CoachIntakePreparedDraftPanel from './CoachIntakePreparedDraftPanel';
import {shouldAdvanceAfterProposalAction} from './CoachIntakeWorkspace.utils';
import {outcomeFromProposal} from './CoachIntakeOutcomeReceipt';
import {COACH_PROPOSAL_ACTION_EVENT} from '../../../../services/coachProposalActionEvents';

function IntakeBoundary() {
 const [open,setOpen]=useState(true),[message,setMessage]=useState('');
 return <MemoryRouter>{open&&<CoachIntakePreparedDraftPanel proposalId={PROPOSAL_ID} onClose={()=>setOpen(false)} onProposalAction={proposal=>{
   // Actual production consumer decisions, with queue navigation omitted.
   if(shouldAdvanceAfterProposalAction(proposal)){setOpen(false);setMessage(outcomeFromProposal(proposal,false).title);}
 }}/>}<div>{message}</div></MemoryRouter>;
}
const approval=(intent:unknown)=>({status:200,data:{success:true,applied:true,proposal:{...workoutProposal,status:'APPLIED'},workout:savedWorkout,...(intent===undefined?{}:{intent})}});
beforeEach(()=>{vi.mocked(apiService.get).mockResolvedValue({data:{success:true,proposal:workoutProposal}});});
describe('AR-G01-D: outcome publication is a real intake boundary',()=>{
 it('malformed approval keeps the actual prepared panel open and cannot advance intake',async()=>{
  vi.mocked(apiService.post).mockResolvedValue(approval('corrupt-intent'));
  render(<IntakeBoundary/>);
  fireEvent.click(await screen.findByRole('button',{name:/approve and log/i}));
  await waitFor(()=>expect(screen.getByRole('button',{name:/check result/i})).toBeInTheDocument());
  expect(screen.queryByText('APPLIED')).toBeNull();
  expect(screen.queryByText('Workout log applied')).toBeNull();
  expect(screen.getByText('Result unknown')).toBeInTheDocument();
  expect(approveCalls()).toHaveLength(1);
  // A later bound read-back may finally publish completion; it never resends.
  vi.mocked(apiService.get).mockResolvedValue({data:{success:true,proposal:{...workoutProposal,status:'APPLIED',intent:verifiedIntent}}});
  fireEvent.click(screen.getByRole('button',{name:/check result/i}));
  await waitFor(()=>expect(screen.getByText('Workout log applied')).toBeInTheDocument());
  expect(approveCalls()).toHaveLength(1);

 });
 it('malformed approval publishes no terminal callback or shared event',async()=>{
  const callback=vi.fn(),listener=vi.fn();window.addEventListener(COACH_PROPOSAL_ACTION_EVENT,listener);
  try{
   vi.mocked(apiService.post).mockResolvedValue(approval('corrupt-intent'));
   const view=render(<MemoryRouter><CoachActionProposalCard proposal={workoutProposal} onProposalAction={callback}/></MemoryRouter>);
   fireEvent.click(screen.getByRole('button',{name:/approve and log/i}));
   await waitFor(()=>expect(screen.getByText(/checking whether/i)).toBeInTheDocument());
   expect(callback).not.toHaveBeenCalled();view.unmount();
   renderMountedConsumer(workoutProposal);fireEvent.click(screen.getByRole('button',{name:/approve and log/i}));
   await waitFor(()=>expect(screen.getByText(/checking whether/i)).toBeInTheDocument());
   expect(listener).not.toHaveBeenCalled();
  }finally{window.removeEventListener(COACH_PROPOSAL_ACTION_EVENT,listener);}
 });
 it.each([['bound verified',verifiedIntent],['legacy absent intent',undefined]])('%s still publishes the valid completion and advances intake',async(_name,intent)=>{
  vi.mocked(apiService.post).mockResolvedValue(approval(intent));render(<IntakeBoundary/>);
  fireEvent.click(await screen.findByRole('button',{name:/approve and log/i}));
  await waitFor(()=>expect(screen.getByText('Workout log applied')).toBeInTheDocument());
  expect(screen.queryByRole('button',{name:/check result/i})).toBeNull();expect(approveCalls()).toHaveLength(1);
 });
});
