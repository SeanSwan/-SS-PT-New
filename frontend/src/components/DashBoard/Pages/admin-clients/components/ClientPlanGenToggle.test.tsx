/**
 * ClientPlanGenToggle - L5 admin toggle regression tests
 * ========================================================
 *
 * Locks in:
 *   1. Initial render reflects `initialValue` prop.
 *   2. Click flips state, calls adminClientService.updateClient with the
 *      new boolean, and fires onUpdated on success.
 *   3. Failure reverts the optimistic flip and surfaces an error.
 *   4. While saving, repeated clicks are ignored.
 *   5. The aria-checked attribute matches the current state (a11y lock).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { updateClientMock } = vi.hoisted(() => ({
  updateClientMock: vi.fn(),
}));

vi.mock('../../../../../services/adminClientService', () => ({
  adminClientService: { updateClient: updateClientMock },
}));

import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import ClientPlanGenToggle from './ClientPlanGenToggle';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClientPlanGenToggle', () => {
  it('renders Disabled label and aria-checked=false when initialValue is false', () => {
    updateClientMock.mockResolvedValue({});
    render(<ClientPlanGenToggle clientId={42} initialValue={false} />);
    const sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText(/Disabled/i)).toBeTruthy();
  });

  it('renders Enabled label and aria-checked=true when initialValue is true', () => {
    updateClientMock.mockResolvedValue({});
    render(<ClientPlanGenToggle clientId={42} initialValue={true} />);
    const sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(/Enabled/i)).toBeTruthy();
  });

  it('clicking flips the toggle, calls updateClient, and fires onUpdated', async () => {
    updateClientMock.mockResolvedValue({});
    const onUpdated = vi.fn();
    render(<ClientPlanGenToggle clientId={42} initialValue={false} onUpdated={onUpdated} />);

    const sw = screen.getByRole('switch');
    fireEvent.click(sw);

    // Optimistic UI - aria-checked flips immediately.
    expect(sw.getAttribute('aria-checked')).toBe('true');

    await waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(1));
    expect(updateClientMock.mock.calls[0]).toEqual(['42', { canGenerateWorkoutPlans: true }]);
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(true));
  });

  it('reverts the optimistic flip and surfaces an error when the request fails', async () => {
    updateClientMock.mockRejectedValue(new Error('500 Server error'));
    const onUpdated = vi.fn();
    render(<ClientPlanGenToggle clientId={42} initialValue={true} onUpdated={onUpdated} />);

    const sw = screen.getByRole('switch');
    fireEvent.click(sw);

    // Optimistic flip to false, then revert back to true.
    await waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(sw.getAttribute('aria-checked')).toBe('true'));
    expect(onUpdated).not.toHaveBeenCalled();
    expect(screen.getByText(/500 Server error/i)).toBeTruthy();
  });

  it('resyncs local state when clientId or initialValue prop changes (round-2 prop-sync)', async () => {
    updateClientMock.mockResolvedValue({});
    const { rerender } = render(<ClientPlanGenToggle clientId={1} initialValue={false} />);
    let sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');

    // Parent swaps to a different client whose flag is true. Without
    // the round-2 prop-sync effect the toggle would still show false.
    rerender(<ClientPlanGenToggle clientId={2} initialValue={true} />);
    sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('true');

    // Parent updates initialValue for the same client (e.g. server
    // refresh after a sibling action) - toggle resyncs.
    rerender(<ClientPlanGenToggle clientId={2} initialValue={false} />);
    sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
  });

  it('ignores clicks while saving', async () => {
    // Resolve never - simulate a slow request - so isSaving stays true.
    let resolver: ((v: unknown) => void) | null = null;
    updateClientMock.mockImplementation(() => new Promise((res) => {
      resolver = res;
    }));

    render(<ClientPlanGenToggle clientId={42} initialValue={false} />);
    const sw = screen.getByRole('switch');

    // First click triggers a request and disables further interaction.
    fireEvent.click(sw);
    expect(sw.hasAttribute('disabled')).toBe(true);

    // Subsequent clicks are dropped.
    fireEvent.click(sw);
    fireEvent.click(sw);
    expect(updateClientMock).toHaveBeenCalledTimes(1);

    // Let the request resolve so the test cleans up.
    await act(async () => {
      resolver?.({});
    });
  });
});
