import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WearableDataPanel from './WearableDataPanel';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: api }));
const reply = (wearableData: unknown = null) => ({ data: { success: true, data: { wearableData,
  wearableStatus: { availability: 'unavailable', verification: wearableData == null ? 'none' : 'unverified',
    code: 'VERIFIED_WEARABLE_SOURCE_UNAVAILABLE', message: 'Verified wearable data is unavailable.' } } } });
const props = { open: true, onClose: vi.fn(), videoSessionId: 1 };
beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue(reply()); api.post.mockResolvedValue(reply()); });
afterEach(cleanup);

describe('legacy wearable containment', () => {
  it('never submits fabricated readings when either provider button is clicked', async () => {
    render(<WearableDataPanel {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Sync Apple HealthKit/i })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Sync Google Fit/i })); });
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Sync Apple HealthKit/i })).toBeDisabled();
    expect(screen.getByText(/sync unavailable/i)).toBeVisible();
  });
  it('does not render controls or load records when closed', () => {
    render(<WearableDataPanel {...props} open={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
  it('does not present legacy unverified numbers or provider labels as measured data', async () => {
    api.get.mockResolvedValue(reply({ heartRate: 77, steps: 12345, source: 'healthkit', syncedAt: new Date().toISOString() }));
    render(<WearableDataPanel {...props} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByText('77')).toBeNull();
    expect(screen.queryByText('12,345')).toBeNull();
    expect(screen.getByText(/unverified/i)).toBeVisible();
  });
  it('shows load failure and retries using GET only, a positive network control', async () => {
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(reply());
    render(<WearableDataPanel {...props} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check wearable availability');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(api.post).not.toHaveBeenCalled();
  });
  it('rejects unsuccessful response envelopes', async () => {
    api.get.mockResolvedValue({ data: { success: false } });
    render(<WearableDataPanel {...props} />);
    expect(await screen.findByRole('alert')).toBeVisible();
  });
  it('ignores a stale failure after changing video sessions', async () => {
    let rejectOld!: (reason: Error) => void;
    api.get.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; }));
    const { rerender } = render(<WearableDataPanel {...props} />);
    rerender(<WearableDataPanel {...props} videoSessionId={2} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    await act(async () => rejectOld(new Error('old request')));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.get.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('aborts outstanding work on close and supplies a named close button', async () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { rerender } = render(<WearableDataPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close wearable data' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    rerender(<WearableDataPanel {...props} open={false} />);
    expect(api.get.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
