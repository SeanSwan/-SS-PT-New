/**
 * FILE: RestoreCard.test.tsx
 * PURPOSE: Render-state matrix for the Restore panel — full ritual, strip,
 *          cold-start honesty (hard law), loading, error, completion sweep.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RestoreCard from './RestoreCard';
import type { RestoreTodayData } from './RestoreCard.types';

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('../../../../services/api.service', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));
vi.mock('../../../../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const fullData = (overrides: Partial<RestoreTodayData> = {}): RestoreTodayData => ({
  dayState: 'rest',
  mode: 'full',
  localDate: '2026-07-21',
  generatedAt: '2026-07-21T10:00:00Z',
  completedExerciseIds: [],
  blocks: [
    {
      key: 'inhibit',
      provenance: 'because you trained lats + shoulders recently',
      conflictNote: null,
      items: [{
        exerciseId: 'ex-1',
        name: 'Foam Roll Lats',
        dose: '60–90s slow',
        xp: 15,
        thumbnailUrl: null,
        videoUrl: null,
        why: ['because you trained lats in the last 3 days'],
        dataSources: ['session_load_72h'],
      }],
    },
  ],
  ...overrides,
});

const respond = (data: RestoreTodayData) => {
  getMock.mockResolvedValue({ data: { success: true, data } });
};

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
});

describe('RestoreCard render states', () => {
  it('renders nothing without a userId', () => {
    const { container } = render(<RestoreCard userId={undefined} />);
    expect(container.firstChild).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('shows the skeleton while loading', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    render(<RestoreCard userId={7} />);
    expect(screen.getByTestId('restore-card-loading')).toBeInTheDocument();
  });

  it('renders the full ritual with block provenance visible at zero taps', async () => {
    respond(fullData());
    render(<RestoreCard userId={7} />);
    expect(await screen.findByTestId('restore-card')).toBeInTheDocument();
    expect(screen.getByText('Restore — pull your body back')).toBeInTheDocument();
    expect(screen.getByText('because you trained lats + shoulders recently')).toBeInTheDocument();
    expect(screen.getByText('Foam Roll Lats')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
  });

  it('completes an item: optimistic check, POST, sweep + gold complete state', async () => {
    respond(fullData());
    postMock.mockResolvedValue({ data: { success: true, data: { exerciseId: 'ex-1', alreadyCompleted: false, xpAwarded: 15, levelUp: false } } });
    render(<RestoreCard userId={7} />);
    const check = await screen.findByRole('button', { name: 'Mark Foam Roll Lats complete' });
    fireEvent.click(check);
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/api/recovery/complete', {
      exerciseId: 'ex-1',
      blockKey: 'inhibit',
      dataSources: ['session_load_72h'],
    }));
    expect(screen.getByText('Ritual complete — see you tomorrow.')).toBeInTheDocument();
    expect(screen.getByTestId('wing-sweep')).toBeInTheDocument();
  });

  it('rolls the check back when the POST fails', async () => {
    respond(fullData());
    postMock.mockRejectedValue(new Error('offline'));
    render(<RestoreCard userId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Foam Roll Lats complete' }));
    await waitFor(() => expect(postMock).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.queryByText('Ritual complete — see you tomorrow.')).not.toBeInTheDocument();
    });
  });

  it('training day renders the collapsed cooldown strip, expandable on tap', async () => {
    respond(fullData({ dayState: 'training', mode: 'strip' }));
    render(<RestoreCard userId={7} />);
    const strip = await screen.findByTestId('restore-strip');
    expect(strip).toHaveTextContent('Cooldown tools · 1 move for what you trained');
    fireEvent.click(strip);
    expect(await screen.findByTestId('restore-card')).toBeInTheDocument();
    expect(screen.getByText('Restore — cooldown tools')).toBeInTheDocument();
  });

  it('cold start (no plan) is honest: movement-screen CTA, no invented picks', async () => {
    respond(fullData({ mode: 'cold', dayState: 'no-plan', blocks: [], coldStart: { reason: 'no-plan', showFoundations: true } }));
    render(<RestoreCard userId={7} />);
    expect(await screen.findByTestId('restore-card-cold')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete your movement screen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark .* complete/ })).not.toBeInTheDocument();
  });

  it('active pain without a screen routes to the coach, never self-serve', async () => {
    respond(fullData({ mode: 'cold', dayState: 'unplanned', blocks: [], coldStart: { reason: 'pain-needs-coach', showFoundations: false } }));
    render(<RestoreCard userId={7} />);
    expect(await screen.findByText(/your coach should guide recovery work directly/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Message your coach' })).toBeInTheDocument();
  });

  it('error state offers a 44px retry without breaking the dashboard', async () => {
    getMock.mockRejectedValue(new Error('boom'));
    render(<RestoreCard userId={7} />);
    expect(await screen.findByTestId('restore-card-error')).toBeInTheDocument();
    respond(fullData());
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('restore-card')).toBeInTheDocument();
  });
});

describe('CC-2 focus transparency (two-tier copy law)', () => {
  it('renders the client-safe focus line and NEVER a syndrome name', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: fullData({
          focus: {
            clientSummary: 'Built around how you move — focused on your hips and lower back.',
            trainerDrivers: ['lower_crossed_syndrome'],
          },
        }),
      },
    });
    render(<RestoreCard userId={7} onNavigate={() => {}} />);
    const line = await screen.findByTestId('restore-focus');
    expect(line.textContent).toMatch(/hips and lower back/i);
    expect(document.body.textContent).not.toMatch(/syndrome/i);
  });
});
