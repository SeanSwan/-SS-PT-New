/**
 * WorkoutLoggerHandoffMount — Slice-2 Chunk C mount-seam tests.
 * Locks the mount's own logic: flag-gated render, dismiss-on-Done, and the zero-PII analytics dispatch.
 * (PostSaveHandoff's internal behavior is covered by its own suite; this covers the wiring around it.)
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkoutLoggerHandoffMount from './WorkoutLoggerHandoffMount';
import type { HandoffData } from './workoutHandoff.types';

// Force the feature flag ON so PostSaveHandoff renders in-test (default is off).
vi.mock('./postSaveHandoffFlag', () => ({ isPostSaveHandoffEnabled: () => true }));

const HANDOFF: HandoffData = {
  headline: 'default',
  proof: {
    nameKey: 'barbell back squat',
    exerciseName: 'Barbell Back Squat',
    points: [{ sessionId: 's1', dateISO: '2026-07-18T00:00:00Z', e1rm: 263, isToday: true }],
    todayE1rm: 263,
    pr: false,
    prDeltaLbs: 0,
    totalVolumeLbs: 1000,
    exerciseCount: 1,
    durationMin: 50,
    sessionsThisWeek: 1,
    streakWeeks: 0,
    isFirstEver: false,
  },
  nba: null,
  share: { eligible: false, reason: 'not-owner' },
};

afterEach(cleanup);

describe('WorkoutLoggerHandoffMount', () => {
  it('renders nothing when there is no handoff payload', () => {
    const { container } = render(
      <WorkoutLoggerHandoffMount handoff={null} saveKey="s1" userRole="client" isOnline onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the handoff (portaled) when present, and hides it on Done', () => {
    render(
      <WorkoutLoggerHandoffMount handoff={HANDOFF} saveKey="s1" userRole="client" isOnline onNavigate={vi.fn()} />,
    );
    expect(screen.getByText('Flight logged.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText('Flight logged.')).toBeNull();
  });

  it('dispatches a zero-PII swan:handoff-analytics event on show (no free-text exercise name)', () => {
    const spy = vi.fn();
    window.addEventListener('swan:handoff-analytics', spy as EventListener);
    render(
      <WorkoutLoggerHandoffMount handoff={HANDOFF} saveKey="s1" userRole="client" isOnline onNavigate={vi.fn()} />,
    );
    expect(spy).toHaveBeenCalled();
    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.event).toBe('handoff_shown');
    // Zero-PII: the exercise display name must never ride an analytics event.
    expect(JSON.stringify(detail).toLowerCase()).not.toContain('squat');
    window.removeEventListener('swan:handoff-analytics', spy as EventListener);
  });
});
