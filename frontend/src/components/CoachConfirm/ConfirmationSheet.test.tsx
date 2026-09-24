/**
 * Card 1.3 — the sheet renders the STORED operation and collects the SERVER's
 * ceremony. These drive the real component against a mocked API.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const get = vi.fn();
const post = vi.fn();
vi.mock('../../services/api.service', () => ({ default: { get, post } }));

const { ConfirmationSheet } = await import('./ConfirmationSheet');
import type { SheetInput } from './confirmationSheetState';

const OP_ID = '4a7f1c2e-0000-4000-8000-000000000000';

const storedOperation = {
  id: OP_ID,
  commandType: 'cancel_session',
  type: 'DELETE',
  description: 'Cancel session 184',
  params: { sessionId: 184, clientId: 61 },
  affectedRecords: [{ id: 184 }],
  affectedCount: 1,
  expiresAt: new Date(Date.now() + 120_000).toISOString(),
};

const input = (over: Partial<SheetInput> = {}): SheetInput => ({
  tier: 'deliberate', isDestructive: true, affectedCount: 1,
  physical: false, irreversible: false, ...over,
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockResolvedValue({ data: { success: true, operation: storedOperation } });
  post.mockResolvedValue({ data: { success: true, type: 'executed' } });
  vi.useRealTimers();
});

describe('ConfirmationSheet', () => {
  it('renders the STORED description — not the request that produced it', async () => {
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByText('Cancel session 184')).toBeTruthy());
    expect(get).toHaveBeenCalledWith(`/api/ai-command/pending/${OP_ID}`);
  });

  it('sends a render digest with the confirm — the proof the server checks', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);

    // Wait for the read-back + digest to resolve and the sheet to ENTER arming
    // before advancing the clock — the timer starts on that transition, and
    // waiting merely for the element to exist raced it under a loaded run.
    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('arming'));
    await act(async () => { vi.advanceTimersByTime(3000); });
    await waitFor(() => expect(screen.getByTestId('confirm-button').hasAttribute('disabled')).toBe(false));

    await user.click(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(post).toHaveBeenCalled());
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/api/ai-command/confirm');
    expect(body.operationId).toBe(OP_ID);
    expect(typeof body.renderedDigest).toBe('string');
    expect(body.renderedDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('the confirm control is DEAD while arming — a confirm you can hit in 120ms is a reflex', async () => {
    render(<ConfirmationSheet operationId={OP_ID} input={input({ isDestructive: true })} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('arming'));
    expect(screen.getByTestId('confirm-button').hasAttribute('disabled')).toBe(true);
  });

  it('a reversible single-record action is ready immediately — no manufactured friction', async () => {
    render(<ConfirmationSheet operationId={OP_ID} input={input({ tier: 'read_back', isDestructive: false })} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('ready'));
  });

  it('the client chip ALARMS when the action targets someone other than the locked client', async () => {
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={42} />);
    await waitFor(() => expect(screen.getByTestId('client-chip').dataset.alarm).toBe('true'));
  });

  it('the chip is quiet when the target IS the locked client', async () => {
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('client-chip').dataset.alarm).toBe('false'));
  });

  it('a voice identity-crossing write says TAP — the spoken path is not offered', async () => {
    render(<ConfirmationSheet operationId={OP_ID} input={input({ physical: true })} lockedClientId={42} />);
    await waitFor(() => expect(screen.getByTestId('physical-required')).toBeTruthy());
    expect(screen.queryByTestId('deliberate-confirm')).toBeNull();
  });

  it('the deliberate tier does NOT instruct a spoken confirm — nothing listens for one', async () => {
    /**
     * R2-3: the sheet used to say Say "confirm 481" or tap below. `nonceSatisfied`
     * has no consumer and nothing calls confirm('voice'), so the spoken half was
     * a promise the app cannot keep — and it taught the operator that saying a
     * number is a security step. When the voice path lands (card 2.x), the
     * spoken instruction and the nonce CHECK go back together; this assertion is
     * what makes shipping one without the other fail.
     */
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('deliberate-confirm')).toBeTruthy());
    expect(screen.getByTestId('deliberate-confirm').textContent).toMatch(/tap Confirm/i);
    expect(screen.getByTestId('deliberate-confirm').textContent).not.toMatch(/say/i);
  });

  it('an irreversible command shows the no-undo badge BEFORE the confirm, not after', async () => {
    get.mockResolvedValue({ data: { success: true, operation: { ...storedOperation, commandType: 'notify_client' } } });
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('no-undo')).toBeTruthy());
  });

  it('a render_mismatch offers re-issue and moves focus to it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    post.mockResolvedValue({ data: { success: false, code: 'render_mismatch', error: 'stale' } });
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);

    // Wait for the read-back + digest to resolve BEFORE advancing the arming
    // clock: the timer only starts once the sheet enters `arming`.
    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('arming'));
    await act(async () => { vi.advanceTimersByTime(3000); });
    await waitFor(() => expect(screen.getByTestId('confirm-button').hasAttribute('disabled')).toBe(false));
    await user.click(screen.getByTestId('confirm-button'));

    await waitFor(() => expect(screen.getByTestId('reissue-button')).toBeTruthy());
    expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('mismatch');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('reissue-button')));
  });

  it('announces state through ONE live region', async () => {
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);
    const status = await screen.findByTestId('sheet-status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('role')).toBe('status');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('an unreadable operation never renders as ready', async () => {
    get.mockRejectedValue(new Error('404'));
    render(<ConfirmationSheet operationId={OP_ID} input={input()} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('unavailable'));
    expect(screen.queryByTestId('confirm-button')).toBeNull();
  });

  /**
   * TERMINAL EXITS — the sheet must never invite a repeat of something that may
   * already have run.
   *
   * These exist because the guidance module encoding this distinction had NO
   * consumer: the component carried its own hardcoded list of "recoverable"
   * states which INCLUDED `burned`, so the one state meaning "your approval was
   * consumed and the result never came back" offered a friendly "Re-issue this
   * request" button. Two independent policies, one of them wrong, and nothing
   * comparing them. The component now asks the guidance module, and these
   * assertions are what stop the hardcoded list from growing back.
   */
  /**
   * Reach a terminal state on REAL timers.
   *
   * The obvious version of this used fake timers to skip the arm delay, and it
   * made the whole file flaky: four more timer-swapping tests alongside the
   * existing ones passed in isolation and failed intermittently when the folder
   * ran together, which is the worst kind of red — it looks like whatever
   * changed most recently. None of these cases are ABOUT the arm delay, so they
   * should not be paying for it.
   *
   * A non-destructive action affecting <= 3 records arms immediately
   * (armDelayMs), so the confirm control is live with no clock to advance and no
   * timer mode to swap. The arm delay keeps its own dedicated tests.
   */
  const READY_NOW = input({ isDestructive: false, affectedCount: 1 });

  async function driveToRefusal(code: string, onAcknowledge?: () => void) {
    const user = userEvent.setup();
    post.mockRejectedValue({ response: { data: { code, error: 'refused' } } });
    render(<ConfirmationSheet operationId={OP_ID} input={READY_NOW} lockedClientId={61} onAcknowledge={onAcknowledge} />);
    await waitFor(() => expect(screen.getByTestId('confirm-button').hasAttribute('disabled')).toBe(false));
    await user.click(screen.getByTestId('confirm-button'));
    return user;
  }

  it('a BURNED approval offers no re-issue — it may already have run', async () => {
    await driveToRefusal('downstream_failed');

    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('burned'));
    expect(screen.queryByTestId('reissue-button')).toBeNull();
    expect(screen.getByTestId('acknowledge-button')).toBeTruthy();
    expect(screen.getByTestId('sheet-status').textContent).toMatch(/check the history/i);
  });

  it('acknowledging an uncertain terminal state does not report a cancellation', async () => {
    const onCancel = vi.fn();
    const onAcknowledge = vi.fn();
    post.mockRejectedValue({ response: { data: { code: 'downstream_failed', error: 'refused' } } });
    render(<ConfirmationSheet operationId={OP_ID} input={READY_NOW} lockedClientId={61} onCancel={onCancel} onAcknowledge={onAcknowledge} />);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getAllByTestId('confirm-button').at(-1)?.hasAttribute('disabled')).toBe(false));
    await user.click(screen.getAllByTestId('confirm-button').at(-1)!);
    await waitFor(() => expect(screen.getAllByTestId('acknowledge-button').at(-1)).toBeTruthy());
    await user.click(screen.getAllByTestId('acknowledge-button').at(-1)!);
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('an ALREADY-CONFIRMED approval offers no re-issue either', async () => {
    await driveToRefusal('already_confirmed');

    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('confirmed_elsewhere'));
    expect(screen.queryByTestId('reissue-button')).toBeNull();
    expect(screen.getByTestId('sheet-status').textContent).toMatch(/do not repeat it/i);
  });

  it('an EXPIRED approval has unknown outcome and only offers history acknowledgement', async () => {
    const onAcknowledge = vi.fn();
    const user = await driveToRefusal('expired', onAcknowledge);

    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('expired'));
    expect(screen.queryByTestId('reissue-button')).toBeNull();
    expect(screen.getByTestId('acknowledge-button')).toBeTruthy();
    expect(screen.getByTestId('sheet-status').textContent).toMatch(/check (the )?history/i);
    await user.click(screen.getByTestId('acknowledge-button'));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('the confirm control declares a physical channel to the server', async () => {
    // F-03: without a declared channel the server treats the confirmation as
    // unproven and refuses anything identity-crossing, so a surface that omits
    // this is not merely impolite — it is broken for the case that matters.
    const user = userEvent.setup();
    render(<ConfirmationSheet operationId={OP_ID} input={READY_NOW} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('confirm-button').hasAttribute('disabled')).toBe(false));
    await user.click(screen.getByTestId('confirm-button'));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toMatchObject({ confirmChannel: 'tap' });
  });
});
