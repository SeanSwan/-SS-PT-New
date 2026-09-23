/**
 * ============================================================================
 * FILE: ConfirmModal.behaviour.test.tsx
 * PURPOSE: Characterization tests — the safety net that did not exist.
 *
 * WRITTEN BEFORE the SwanDialog rewrite (SWA-225 EX-6), deliberately. Blueprint
 * v3 §6 said "its existing tests must pass unchanged" as the proof the consumer
 * rewrite is safe. There WERE no tests: `git grep ConfirmModal -- src | grep
 * test` returned nothing. Rewriting a live admin confirm dialog with no net,
 * against a spec that assumed one, is how a delete button quietly stops
 * confirming.
 *
 * So these describe the behaviour as it exists TODAY, on the hand-rolled
 * implementation. They are committed first, pass against the original, and must
 * still pass afterwards — that, not a spec sentence, is what makes the rewrite
 * provably behaviour-preserving.
 *
 * Deliberately NOT asserted: internal markup, class names, z-index. Those are
 * the things the rewrite is allowed to change.
 * ============================================================================
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfirmModal, { type ConfirmRequest } from './ConfirmModal';

const makeRequest = (over: Partial<ConfirmRequest> = {}): ConfirmRequest => ({
  title: 'Delete this photo?',
  message: 'This removes the photo from the gallery for everyone.',
  confirmLabel: 'Delete photo',
  cancelLabel: 'Keep it',
  onConfirm: vi.fn(),
  ...over,
});

describe('ConfirmModal — behaviour contract (pre-rewrite characterization)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders nothing when there is no request', () => {
    const { container } = render(<ConfirmModal request={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('exposes a labelled modal dialog with the request title and message', async () => {
    const request = makeRequest();
    render(<ConfirmModal request={request} onClose={vi.fn()} />);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The accessible NAME must be the title — assert through the a11y tree, not
    // by reading the aria-labelledby id, so the rewrite may change the wiring.
    expect(screen.getByRole('dialog', { name: /delete this photo/i })).toBeTruthy();
    expect(screen.getByText(request.message)).toBeInTheDocument();
  });

  it('puts initial focus on the cancel control, never on the destructive one', async () => {
    render(<ConfirmModal request={makeRequest()} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep it' }));
    });
  });

  it('falls back to a default cancel label when none is given', async () => {
    render(<ConfirmModal request={makeRequest({ cancelLabel: undefined })} onClose={vi.fn()} />);
    const buttons = await screen.findAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('runs onConfirm and then closes, in that order', async () => {
    const order: string[] = [];
    const onConfirm = vi.fn(() => { order.push('confirm'); });
    const onClose = vi.fn(() => { order.push('close'); });
    render(<ConfirmModal request={makeRequest({ onConfirm })} onClose={onClose} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete photo' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    // Order matters: closing first would unmount the handler's own context.
    expect(order).toEqual(['confirm', 'close']);
  });

  it('closes without confirming when cancel is pressed', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmModal request={makeRequest({ onConfirm })} onClose={onClose} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Keep it' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('closes on Escape without confirming — dismissal is always the SAFE outcome', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmModal request={makeRequest({ tone: 'danger', onConfirm })} onClose={onClose} />);

    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders a danger-toned confirm without changing the contract', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal request={makeRequest({ tone: 'danger', onConfirm })} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete photo' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});
