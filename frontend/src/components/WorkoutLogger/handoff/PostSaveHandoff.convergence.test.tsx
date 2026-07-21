/**
 * PostSaveHandoff.convergence.test.tsx — Convergence v1 additions (2026-07-21).
 * Separate file ON PURPOSE: the pre-existing PostSaveHandoff.test.tsx suite passing UNMODIFIED is
 * this slice's did-not-break-it gate. These tests cover only the new, additive behavior:
 * P2 named congrats (owner-scoped), P1 card chrome (@handle row + date line), P3 streak module.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostSaveHandoff from './PostSaveHandoff';
import type { HandoffData, PostSaveHandoffProps } from './workoutHandoff.types';

vi.mock('./ProofChart', () => ({ default: () => <div data-testid="proof-chart" /> }));

const baseData = (over: Partial<HandoffData> = {}): HandoffData => ({
  headline: 'default',
  pendingSync: false,
  share: { eligible: true, reason: 'owner' },
  nba: { kind: 'DO_NEXT_WORKOUT', title: 'Next up: Wednesday', ctaLabel: 'View next workout', href: '/schedule', trainerOnly: false },
  proof: {
    nameKey: 'goblet squat', exerciseName: 'Goblet Squat',
    points: [{ sessionId: 's1', dateISO: '2026-07-14T10:00:00Z', e1rm: 120 }, { sessionId: 's2', dateISO: '2026-07-21T10:00:00Z', e1rm: 128, isToday: true }],
    todayE1rm: 128, pr: false, prDeltaLbs: 0,
    totalVolumeLbs: 4180, exerciseCount: 4, durationMin: 45,
    sessionsThisWeek: 2, streakWeeks: 3, isFirstEver: false,
  },
  ...over,
});

const renderHandoff = (data: HandoffData, props: Partial<PostSaveHandoffProps> = {}) =>
  render(
    <PostSaveHandoff
      data={data}
      viewerRole="client"
      enabled
      onDismiss={vi.fn()}
      onNavigate={vi.fn()}
      {...props}
    />,
  );

describe('PostSaveHandoff — Convergence v1 (named congrats, card chrome, streak module)', () => {
  it('P2: names the OWNER in the declaration', () => {
    renderHandoff(baseData(), { viewerFirstName: 'Alex' });
    expect(screen.getByText('Flight logged, Alex.')).toBeInTheDocument();
  });

  it('P2 SAFETY: a non-owner viewer (trainer logging for a client) never gets a name in the headline', () => {
    renderHandoff(baseData({ share: { eligible: false, reason: 'not-owner' } }), {
      viewerFirstName: 'Coach', viewerHandle: 'coach-sean',
    });
    expect(screen.getByText('Flight logged.')).toBeInTheDocument();
    expect(screen.queryByText(/@coach-sean/)).not.toBeInTheDocument();
  });

  it('P2: no name prop → the exact legacy copy (whitespace-only names count as absent)', () => {
    renderHandoff(baseData(), { viewerFirstName: '   ' });
    expect(screen.getByText('Flight logged.')).toBeInTheDocument();
  });

  it('P2: LITE (proof-null) still greets the owner by name', () => {
    renderHandoff(baseData({ proof: null }), { viewerFirstName: 'Alex' });
    expect(screen.getByText('Flight logged, Alex.')).toBeInTheDocument();
  });

  it('P1: proof card chrome shows the brand row and the owner @handle', () => {
    renderHandoff(baseData(), { viewerHandle: 'alexswan' });
    expect(screen.getByText('◆ Swan Studios')).toBeInTheDocument();
    expect(screen.getByText('@alexswan')).toBeInTheDocument();
  });

  it('P1: handle row is omitted when no handle is provided (no empty "@")', () => {
    renderHandoff(baseData());
    expect(screen.getByText('◆ Swan Studios')).toBeInTheDocument();
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
  });

  it('P3: streak module renders from the real proof numbers (2/3 default target)', () => {
    renderHandoff(baseData());
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('1 more this week to hit your goal.')).toBeInTheDocument();
  });

  it('P3: LITE (proof-null) has no streak module and no card chrome — nothing fabricated', () => {
    renderHandoff(baseData({ proof: null }), { viewerHandle: 'alexswan' });
    expect(screen.queryByText(/Weekly streak/i)).not.toBeInTheDocument();
    expect(screen.queryByText('◆ Swan Studios')).not.toBeInTheDocument();
  });
});
