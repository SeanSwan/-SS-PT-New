/**
 * The inspector's "at a glance" never turns a failed read into "no workouts" or
 * "no pain", and refreshes when a workout is saved anywhere.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientGlanceCard, { painLabel } from './ClientGlanceCard';

const history = vi.hoisted(() => ({ current: { data: [] as unknown[], isLoading: false, error: null as string | null, refetch: vi.fn() } }));
const getActive = vi.hoisted(() => vi.fn());

vi.mock('../../../../hooks/useWorkoutHistory', () => ({ useWorkoutHistory: () => history.current }));
const auth = vi.hoisted(() => ({ authAxios: {} }));
vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../../services/painEntryService', () => ({ createPainEntryService: () => ({ getActive }) }));

beforeEach(() => {
  history.current = { data: [], isLoading: false, error: null, refetch: vi.fn() };
  getActive.mockReset();
});

describe('ClientGlanceCard', () => {
  it('shows the last workout and active pain flags, and its actions fire', async () => {
    history.current.data = [{ id: 1, name: 'Lower', date: '2026-09-21T15:00:00Z', exerciseNames: ['Box squat', 'Step-up', 'RDL', 'Plank'] }];
    getActive.mockResolvedValue({ success: true, entries: [{ id: 3, bodyRegion: 'knee', side: 'left', painLevel: 3 }], count: 1 });
    const onFloor = vi.fn(); const onPdf = vi.fn();
    render(<ClientGlanceCard clientId={12} clientName="Avery Stone" onFloor={onFloor} onPdf={onPdf} />);
    expect(screen.getByText(/Last workout .* Box squat, Step-up, RDL$/)).toBeInTheDocument();
    expect(await screen.findByText('Left knee · 3/10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /floor mode/i }));
    fireEvent.click(screen.getByRole('button', { name: /progress pdf/i }));
    expect(onFloor).toHaveBeenCalled();
    expect(onPdf).toHaveBeenCalled();
  });

  it('failed reads say they failed — never "no workouts" or "no pain"', async () => {
    history.current.error = 'boom';
    getActive.mockRejectedValue(new Error('403'));
    render(<ClientGlanceCard clientId={12} clientName="Avery Stone" onFloor={vi.fn()} onPdf={vi.fn()} />);
    expect(screen.getByText('Last workout did not load.')).toBeInTheDocument();
    expect(await screen.findByText('Pain flags did not load.')).toBeInTheDocument();
    expect(screen.queryByText('No active pain flags.')).not.toBeInTheDocument();
    expect(screen.queryByText('No workouts logged yet.')).not.toBeInTheDocument();
  });

  it('a workout saved for THIS client refreshes; one for another client does not', async () => {
    getActive.mockResolvedValue({ success: true, entries: [], count: 0 });
    render(<ClientGlanceCard clientId={12} clientName="Avery Stone" onFloor={vi.fn()} onPdf={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('No active pain flags.')).toBeInTheDocument());
    act(() => { window.dispatchEvent(new CustomEvent('swan:workout-logged', { detail: { clientId: 99 } })); });
    expect(history.current.refetch).not.toHaveBeenCalled();
    act(() => { window.dispatchEvent(new CustomEvent('swan:workout-logged', { detail: { clientId: 12 } })); });
    expect(history.current.refetch).toHaveBeenCalledTimes(1);
  });

  it('painLabel reads side and region plainly', () => {
    expect(painLabel({ bodyRegion: 'lower_back', side: 'center', painLevel: 5 })).toBe('lower back · 5/10');
  });
});
