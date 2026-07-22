/**
 * 1.4a Celebration beat — contract tests (Mobbin build plan v2, Kimi signature spec).
 *
 * Truth rules under test:
 *  - Burst fires ONLY on meaningful moments (pr/first full, streak light) — never on a default save
 *    (anti-slot-machine: a routine save gets the quiet card).
 *  - prefers-reduced-motion: reduce → NO canvas burst, numeral shows the final value instantly.
 *  - The numeral's accessible value is ALWAYS the final truthful number (count-up is visual only).
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PostSaveHandoff from './PostSaveHandoff';
import type { HandoffData } from './workoutHandoff.types';

const buildData = (headline: HandoffData['headline']): HandoffData => ({
  headline,
  isOwner: true,
  proof: {
    exerciseName: 'Goblet Squat',
    points: [
      { date: '2026-07-15', e1rm: 180 },
      { date: '2026-07-22', e1rm: 205 },
    ],
    todayE1rm: 205,
    pr: headline === 'pr',
    isFirstEver: headline === 'first',
    prDeltaLbs: headline === 'pr' ? 25 : 0,
    sessionsThisWeek: 3,
    streakWeeks: 2,
    totalVolumeLbs: 12250,
    exerciseCount: 5,
    durationMin: 48,
  },
  nba: { kind: 'VIEW_PROGRESS', label: 'View Progress', href: '/progress' },
  share: { eligible: false, reason: 'consent_missing' },
} as unknown as HandoffData);

let reducedMotion = false;
const mockMatchMedia = () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
};

const renderCard = (headline: HandoffData['headline']) =>
  render(
    <PostSaveHandoff
      data={buildData(headline)}
      viewerRole="client"
      enabled
      onDismiss={() => {}}
      onNavigate={() => {}}
    />,
  );

describe('1.4a celebration beat', () => {
  beforeEach(() => {
    reducedMotion = false;
    mockMatchMedia();
  });
  afterEach(() => cleanup());

  it('fires the crystalline burst on a PR moment', () => {
    renderCard('pr');
    expect(screen.getByTestId('celebration-burst')).toBeTruthy();
  });

  it('fires the burst on a first-ever moment', () => {
    renderCard('first');
    expect(screen.getByTestId('celebration-burst')).toBeTruthy();
  });

  it('stays quiet on a default save — no slot machine', () => {
    renderCard('default');
    expect(screen.queryByTestId('celebration-burst')).toBeNull();
  });

  it('renders NO burst under prefers-reduced-motion', () => {
    reducedMotion = true;
    mockMatchMedia();
    renderCard('pr');
    expect(screen.queryByTestId('celebration-burst')).toBeNull();
  });

  it('numeral accessible value is always the final truthful number', () => {
    renderCard('pr');
    expect(screen.getByLabelText('205')).toBeTruthy();
  });

  it('reduced motion shows the final numeral text immediately', () => {
    reducedMotion = true;
    mockMatchMedia();
    renderCard('pr');
    expect(screen.getByLabelText('205').textContent).toBe('205');
  });
});
