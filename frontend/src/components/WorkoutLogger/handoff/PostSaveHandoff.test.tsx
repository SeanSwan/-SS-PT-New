import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostSaveHandoff from './PostSaveHandoff';
import type { HandoffData, LoggerRole } from './workoutHandoff.types';

// Isolate the orchestrator from Victory's SVG rendering.
vi.mock('./ProofChart', () => ({ default: () => <div data-testid="proof-chart" /> }));

const baseData = (over: Partial<HandoffData> = {}): HandoffData => ({
  headline: 'default',
  pendingSync: false,
  share: { eligible: true, reason: 'owner' },
  nba: { kind: 'DO_NEXT_WORKOUT', title: 'Next up: Wednesday', ctaLabel: 'View next workout', href: '/schedule', trainerOnly: false },
  proof: {
    nameKey: 'barbell back squat', exerciseName: 'Barbell Back Squat',
    points: [{ sessionId: 's1', dateISO: '2026-07-06T10:00:00Z', e1rm: 245 }, { sessionId: 's2', dateISO: '2026-07-11T10:00:00Z', e1rm: 263, isToday: true }],
    todayE1rm: 263, pr: false, prDeltaLbs: 0,
    totalVolumeLbs: 6840, exerciseCount: 5, durationMin: 52,
    sessionsThisWeek: 2, streakWeeks: 1, isFirstEver: false,
  },
  ...over,
});

const renderHandoff = (data: HandoffData, viewerRole: LoggerRole = 'client', props = {}) =>
  render(
    <PostSaveHandoff
      data={data}
      viewerRole={viewerRole}
      enabled
      onDismiss={vi.fn()}
      onNavigate={vi.fn()}
      {...props}
    />,
  );

describe('PostSaveHandoff', () => {
  it('renders nothing when disabled (ships dark by default)', () => {
    const { container } = render(
      <PostSaveHandoff data={baseData()} viewerRole="client" enabled={false} onDismiss={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the declaration, proof numeral, eyebrow, and chips', () => {
    renderHandoff(baseData());
    expect(screen.getByText('Flight logged.')).toBeInTheDocument();
    expect(screen.getByText('263')).toBeInTheDocument();
    expect(screen.getByText(/EST\. 1-REP MAX · BARBELL BACK SQUAT · LAST 2 SESSIONS/)).toBeInTheDocument();
    expect(screen.getByText('VOL 6,840 LB')).toBeInTheDocument();
    expect(screen.getByText('52 MIN')).toBeInTheDocument();
    expect(screen.getByTestId('proof-chart')).toBeInTheDocument();
  });

  it('shows the PR subline on a personal best', () => {
    renderHandoff(baseData({ headline: 'pr', proof: { ...baseData().proof, pr: true, prDeltaLbs: 18 } }));
    expect(screen.getByText('A new personal best — +18 lbs over your previous mark.')).toBeInTheDocument();
  });

  it('shows the first-ever subline', () => {
    renderHandoff(baseData({ headline: 'first' }));
    expect(screen.getByText('First flight on record — every chart starts with one point.')).toBeInTheDocument();
  });

  it('omits chips whose values are null (no fabricated facts)', () => {
    renderHandoff(baseData({ proof: { ...baseData().proof, durationMin: null } }));
    expect(screen.queryByText(/MIN$/)).not.toBeInTheDocument();
  });

  it('shows the PENDING SYNC chip when queued offline', () => {
    renderHandoff(baseData({ pendingSync: true }));
    expect(screen.getByText('PENDING SYNC')).toBeInTheDocument();
  });

  it('renders the NBA card and navigates on CTA tap', () => {
    const onNavigate = vi.fn();
    renderHandoff(baseData(), 'client', { onNavigate });
    fireEvent.click(screen.getByRole('button', { name: 'View next workout' }));
    expect(onNavigate).toHaveBeenCalledWith('/schedule');
  });

  it('SAFETY: a client never sees a trainerOnly next-best-action', () => {
    renderHandoff(baseData({
      nba: { kind: 'ADJUST_PLAN', title: 'Client #9 needs a plan adjustment', ctaLabel: 'Open planner', href: '/workout-planner?client=9', trainerOnly: true },
    }), 'client');
    expect(screen.queryByText(/needs a plan adjustment/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open planner' })).not.toBeInTheDocument();
  });

  it('a trainer DOES see the trainerOnly action', () => {
    renderHandoff(baseData({
      nba: { kind: 'ADJUST_PLAN', title: 'Client #9 needs a plan adjustment', ctaLabel: 'Open planner', href: '/workout-planner?client=9', trainerOnly: true },
    }), 'trainer');
    expect(screen.getByRole('button', { name: 'Open planner' })).toBeInTheDocument();
  });

  it('offers share to the owner and withholds it otherwise', () => {
    const { unmount } = renderHandoff(baseData());
    expect(screen.getByRole('button', { name: 'Share this win' })).toBeInTheDocument();
    unmount();
    renderHandoff(baseData({ share: { eligible: false, reason: 'not-owner' } }), 'trainer');
    expect(screen.queryByRole('button', { name: 'Share this win' })).not.toBeInTheDocument();
    expect(screen.getByText('Sharing is available to the client.')).toBeInTheDocument();
  });

  it('calls onDismiss from Done', () => {
    const onDismiss = vi.fn();
    renderHandoff(baseData(), 'client', { onDismiss });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('SAFETY: fail-closed for unknown role values (CLIENT / undefined), not just "client"', () => {
    const nba = { kind: 'ADJUST_PLAN' as const, title: 'Client #9 needs a plan adjustment', ctaLabel: 'Open planner', href: '/workout-planner?client=9', trainerOnly: true };
    for (const role of ['CLIENT', undefined]) {
      const { unmount } = render(
        <PostSaveHandoff data={baseData({ nba })} viewerRole={role as unknown as LoggerRole} enabled onDismiss={vi.fn()} onNavigate={vi.fn()} />,
      );
      expect(screen.queryByRole('button', { name: 'Open planner' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('does not render an NBA CTA for a non-internal href (open-redirect guard)', () => {
    for (const href of ['//evil.example', '/\\evil.com', 'javascript:alert(1)', 'https://evil.example', '']) {
      const { unmount } = renderHandoff(baseData({ nba: { kind: 'DO_NEXT_WORKOUT', title: 'x', ctaLabel: 'Go', href, trainerOnly: false } }));
      expect(screen.queryByRole('button', { name: 'Go' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('withholds share when eligible but not owner (double-guard)', () => {
    renderHandoff(baseData({ share: { eligible: true, reason: 'not-owner' } }));
    expect(screen.queryByRole('button', { name: 'Share this win' })).not.toBeInTheDocument();
    expect(screen.getByText('Sharing is available to the client.')).toBeInTheDocument();
  });

  it('closes on Escape (modal machinery)', () => {
    const onDismiss = vi.fn();
    renderHandoff(baseData(), 'client', { onDismiss });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalled();
  });
});
