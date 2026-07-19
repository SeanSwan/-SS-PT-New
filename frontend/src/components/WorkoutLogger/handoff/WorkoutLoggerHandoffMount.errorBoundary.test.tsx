/**
 * WorkoutLoggerHandoffMount — error-boundary contract (Slice-2 Chunk C).
 * Mirrors the backend safeAssemble fail-closed guarantee on the client: a handoff RENDER error must
 * degrade to null (SaveSuccessPanel shows) and NEVER crash the logger after a committed save.
 * (Isolated file: the throw-mock below would break the happy-path mount tests if co-located.)
 */
import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./postSaveHandoffFlag', () => ({ isPostSaveHandoffEnabled: () => true }));
vi.mock('./PostSaveHandoff', () => ({
  default: () => { throw new Error('handoff render blew up'); },
}));

import WorkoutLoggerHandoffMount from './WorkoutLoggerHandoffMount';
import type { HandoffData } from './workoutHandoff.types';

const HANDOFF: HandoffData = {
  headline: 'default',
  proof: {
    nameKey: 'x', exerciseName: 'X',
    points: [{ sessionId: 's', dateISO: '2026-07-18T00:00:00Z', e1rm: 100, isToday: true }],
    todayE1rm: 100, pr: false, prDeltaLbs: 0, totalVolumeLbs: 1, exerciseCount: 1,
    durationMin: 1, sessionsThisWeek: 1, streakWeeks: 0, isFirstEver: false,
  },
  nba: null,
  share: { eligible: false, reason: 'not-owner' },
};

describe('WorkoutLoggerHandoffMount — error boundary', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { errSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errSpy.mockRestore(); });

  it('renders null (no crash) when the handoff render throws — the save UX survives', () => {
    const { container } = render(
      <WorkoutLoggerHandoffMount handoff={HANDOFF} saveKey="s1" userRole="client" isOnline onNavigate={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
