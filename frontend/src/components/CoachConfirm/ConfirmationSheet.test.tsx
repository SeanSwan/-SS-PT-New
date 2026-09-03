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

    await waitFor(() => expect(screen.getByTestId('confirmation-sheet')).toBeTruthy());
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
    expect(screen.queryByTestId('spoken-nonce')).toBeNull();
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
});
