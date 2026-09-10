/**
 * SCU G02 / AF11 — RED. The sheet must render the STORED projection, never the
 * request-time envelope the parent passes. These cases mock a read-back whose
 * signed projection deliberately DISAGREES with the parent's hints; today the
 * parent hints win (tier badge, destructive arming, parent-driven physical),
 * so the assertions fail pre-G02 and pass once the hook feeds the decoded
 * projection into the state machine and the render layer.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';

const get = vi.fn();
const post = vi.fn();
vi.mock('../../services/api.service', () => ({ default: { get, post } }));

const { ConfirmationSheet } = await import('./ConfirmationSheet');
import type { SheetInput, Tier } from './confirmationSheetState';

const OP_ID = '9b1e2c3d-0000-4000-8000-000000000000';
const FUTURE = new Date(Date.now() + 120_000).toISOString();

const envelope = (over: Partial<SheetInput> = {}): SheetInput => ({
  tier: 'read_back',
  isDestructive: false,
  affectedCount: 1,
  physical: false,
  irreversible: false,
  ...over,
});

const v2Projection = (over: Record<string, unknown> = {}) => ({
  policyVersion: 2,
  tier: 'deliberate',
  isDestructive: true,
  requiresPhysicalConfirm: true,
  affectedCount: 12,
  targetUserId: 42,
  entityRevision: 'assignment-77',
  reversibility: 'none',
  expiresAt: FUTURE,
  displayFields: {
    description: 'Cancel session 184',
    commandType: 'cancel_session',
    affectedCount: 12,
    targetUser: 42,
  },
  ...over,
});

const opWithProjection = (
  projection: Record<string, unknown> = v2Projection(),
  commandType = 'cancel_session',
) => ({
  id: OP_ID,
  commandType,
  type: 'DELETE',
  description: 'Cancel session 184',
  params: { sessionId: 184, clientId: 42 },
  affectedRecords: [{ id: 184 }],
  affectedCount: 12,
  clientId: 42,
  requiresPhysicalConfirm: true,
  expiresAt: FUTURE,
  projection,
});

const storedOp = (op: Record<string, unknown> = opWithProjection()) => ({
  data: { success: true, operation: op },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  post.mockResolvedValue({ data: { success: true, type: 'executed' } });
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('G02/AF11 — stored projection beats the request-time envelope', () => {
  it('the tier BADGE shows the stored tier, not the parent hint', async () => {
    get.mockResolvedValue(storedOp());
    // parent claims a safe read-back tier; the server minted `deliberate`.
    render(<ConfirmationSheet operationId={OP_ID} input={envelope({ tier: 'read_back' })} lockedClientId={42} />);
    await waitFor(() => expect(screen.getByTestId('tier-badge')).toBeTruthy());
    expect(screen.getByTestId('tier-badge').textContent).toBe('deliberate');
  });

  it('the arming delay is decided by the stored blast radius (>3 records = 3500ms)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    get.mockResolvedValue(storedOp());
    // parent claims a 1-record action (instant arm); stored says 12 records.
    render(<ConfirmationSheet operationId={OP_ID} input={envelope({ isDestructive: false, affectedCount: 1 })} lockedClientId={42} />);
    const sheet = () => screen.getByTestId('confirmation-sheet');
    // With the envelope's 1-record hint the sheet would be `ready` immediately;
    // the stored 12 records must hold it in `arming`.
    await waitFor(() => expect(sheet().dataset.state).toBe('arming'));
    expect(sheet().dataset.state).toBe('arming');
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(sheet().dataset.state).toBe('arming'); // 3500 not yet elapsed
    await act(async () => { vi.advanceTimersByTime(600); });
    await waitFor(() => expect(sheet().dataset.state).toBe('ready'));
  });

  it('a stored physical verdict shows the tap prompt even when the parent never saw one', async () => {
    get.mockResolvedValue(storedOp());
    render(<ConfirmationSheet operationId={OP_ID} input={envelope({ physical: false, tier: 'read_back', isDestructive: false })} lockedClientId={42} />);
    await waitFor(() => expect(screen.getByTestId('physical-required')).toBeTruthy());
  });

  it('the irreversible badge follows the signed projection, not the client-side fallback list', async () => {
    // `notify_client` is on the client-side IRREVERSIBLE_FALLBACK list, so
    // pre-G02 the sheet renders the "cannot be undone" badge from that list.
    // The stored signed projection says the command declares an undo story
    // ('inverse'): under G02 the signed declaration wins and suppresses the
    // badge — the exact card-4.2 drift this slice closes.
    // Match the real pending mint: count lives only in projection, and repeated
    // display/physical fields agree. The old synthetic record contradicted them.
    get.mockResolvedValue(storedOp({
      id: OP_ID,
      kind: 'pending_confirmed',
      commandType: 'notify_client',
      description: 'Notify client 42',
      params: { clientId: 42 },
      clientId: 42,
      requiresPhysicalConfirm: false,
      expiresAt: FUTURE,
      projection: v2Projection({
        isDestructive: false,
        requiresPhysicalConfirm: false,
        tier: 'read_back',
        affectedCount: 1,
        reversibility: 'inverse',
        displayFields: {
          description: 'Notify client 42',
          commandType: 'notify_client',
          affectedCount: 1,
          targetUser: 42,
        },
      }),
    }));
    render(<ConfirmationSheet operationId={OP_ID} input={envelope()} lockedClientId={42} />);
    const sheet = () => screen.getByTestId('confirmation-sheet');
    await waitFor(() => expect(sheet().dataset.state).toBe('ready'));
    // Undo story declared in the signed projection => no "cannot be undone" badge.
    expect(screen.queryByTestId('no-undo')).toBeNull();
  });

  it('the destructive arming is driven by the stored projection when the parent claims safe', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    get.mockResolvedValue(storedOp());
    // Parent claims a safe single-record action (arms instantly); the stored
    // projection says destructive with 12 records (3500 ms). Pre-G02 the
    // parent hint wins and the sheet is `ready` immediately.
    render(<ConfirmationSheet operationId={OP_ID} input={envelope({ isDestructive: false, affectedCount: 1 })} lockedClientId={42} />);
    const sheet = () => screen.getByTestId('confirmation-sheet');
    await waitFor(() => expect(sheet().dataset.state).toBe('arming'));
    await act(async () => { vi.advanceTimersByTime(2000); });
    // Still dead at 2000 ms: the stored verdict holds the 3500 ms delay even
    // though the parent claimed a safe one-record act.
    expect(sheet().dataset.state).toBe('arming');
  });
});
