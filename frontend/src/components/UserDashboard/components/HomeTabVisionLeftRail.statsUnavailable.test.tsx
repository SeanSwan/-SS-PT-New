/**
 * Gamification outage honesty — data-truth regression.
 *
 * useGamificationData exposes `hasError`, but no dashboard consumer read it.
 * `levelProgress` still computes from a `?? 0` fallback, so when both the
 * profile endpoint and its /api/profile/achievements fallback fail, the rail
 * rendered Level 1 / 0 XP / 0% / 0-day streak — a confident, specific, and
 * false statement about the member's record, identical to what a brand-new
 * account sees.
 *
 * An outage must read as an outage, and must offer a way back.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomeTabVisionLeftRail from './HomeTabVisionLeftRail';
import { buildWeekTrainingDays } from './HomeTabProofViewModel';

afterEach(() => cleanup());

const baseProps = {
  logoSrc: 'logo.png',
  level: 1,
  points: 0,
  pointsToNext: 0,
  progressPercent: 0,
  streakDays: 0,
  weekDays: buildWeekTrainingDays([], Date.now()),
  activeId: 'home',
  onAction: () => {},
};

describe('HomeTabVisionLeftRail when gamification is unavailable', () => {
  it('does not present zeros as the member\'s real progress', () => {
    render(<HomeTabVisionLeftRail {...baseProps} statsUnavailable onRetryStats={() => {}} />);

    expect(screen.queryByText(/XP to next level/i)).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('says the progress data could not load', () => {
    render(<HomeTabVisionLeftRail {...baseProps} statsUnavailable onRetryStats={() => {}} />);

    expect(screen.getByText(/couldn't load/i)).toBeTruthy();
  });

  it('offers a retry the member can actually press', () => {
    const onRetryStats = vi.fn();
    render(<HomeTabVisionLeftRail {...baseProps} statsUnavailable onRetryStats={onRetryStats} />);

    const retry = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retry);

    expect(onRetryStats).toHaveBeenCalledTimes(1);
  });

  it('still renders real values when gamification is healthy', () => {
    render(
      <HomeTabVisionLeftRail
        {...baseProps}
        level={7}
        points={1240}
        pointsToNext={260}
        progressPercent={64}
        streakDays={5}
        statsUnavailable={false}
        onRetryStats={() => {}}
      />,
    );

    expect(screen.getByText('Level 7')).toBeTruthy();
    expect(screen.getByText(/1,240/)).toBeTruthy();
    expect(screen.getByText(/260 XP to next level/)).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.queryByText(/couldn't load/i)).toBeNull();
  });
});
