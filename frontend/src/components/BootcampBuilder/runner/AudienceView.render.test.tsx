/**
 * SWA-105 Slice 6b — the TV surface rendered through the REAL director:
 * fixtures -> directAudience -> AudienceView. What the tests assert is what
 * a participant at 20ft would see.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AudienceView from './AudienceView';
import { pageSlice } from './AudienceView.logic';
import { directAudience, type RoomProfile } from './audienceDirector';
import { createRunnerState, locate } from './runnerProtocol';
// @ts-expect-error shared core ships untyped .mjs
import { ALL_FIXTURES } from '../../../../../shared/bootcamp-core/fixtures.mjs';

const T0 = 1_785_000_000_000;
const room: RoomProfile = { tvDiagonalIn: 55, maxViewDistanceFt: 20 };

function vmAt(planMaker: () => object, phase: string, position?: number) {
  const p = planMaker() as never;
  const s = createRunnerState('any', T0);
  const { timeline } = locate(p, s, T0);
  const seg = timeline.segments.find(
    (x: { phase: string; position: number | null }) =>
      x.phase === phase && (position === undefined || x.position === position),
  );
  return directAudience(p, s, seg.startsAt + 500, room);
}

describe('AudienceView — what the room actually sees', () => {
  it('S2 renders one card per station, each with its own exercise', () => {
    render(<AudienceView vm={vmAt(ALL_FIXTURES.fullBodyStationClass, 'work')} />);
    expect(screen.getByTestId('audience-S2')).toBeTruthy();
    expect(screen.getByText('Goblet Squat')).toBeTruthy();
    expect(screen.getByText('Push-Up')).toBeTruthy();
    expect(screen.getByText('Farmer Carry')).toBeTruthy();
    expect(screen.getByTestId('timer').textContent).toMatch(/^\d+(:\d{2})?$/);
  });

  it('the modification line is VISIBLE TEXT on the card, not an affordance', () => {
    render(<AudienceView vm={vmAt(ALL_FIXTURES.smallUpperBodyClass, 'work', 2)} />);
    expect(screen.getByText(/Easier: Push-up on dumbbell handles/)).toBeTruthy();
  });

  it('the ENDS wall-clock promise is always on screen', () => {
    render(<AudienceView vm={vmAt(ALL_FIXTURES.fullBodyStationClass, 'work')} />);
    expect(screen.getByTestId('ends-label').textContent).toMatch(/^ENDS \d{1,2}:\d{2}$/);
    expect(screen.getByTestId('round-chip').textContent).toBe('Round 1 of 2');
  });

  it('warmup is a hero with the exercise name huge', () => {
    render(<AudienceView vm={vmAt(ALL_FIXTURES.fullBodyStationClass, 'warmup')} />);
    expect(screen.getByTestId('audience-S1')).toBeTruthy();
    expect(screen.getByTestId('hero-name').textContent).toContain('Stretch');
  });

  it('transition shows MOVE with next-up cards', () => {
    render(<AudienceView vm={vmAt(ALL_FIXTURES.fullBodyStationClass, 'station_transition')} />);
    expect(screen.getByText('MOVE')).toBeTruthy();
    expect(screen.getAllByTestId(/station-card-/)).toHaveLength(3);
  });

  it('S7 is the Gilded Fern moment — no timer, a completion headline', () => {
    const p = ALL_FIXTURES.fullBodyStationClass() as never;
    const s = createRunnerState('any', T0);
    const { timeline } = locate(p, s, T0);
    const vm = directAudience(p, s, timeline.endsAt + 1000, room);
    render(<AudienceView vm={vm} />);
    expect(screen.getByTestId('complete')).toBeTruthy();
    expect(screen.queryByTestId('timer')).toBeNull();
  });

  it('an over-capacity room falls back to printed cards, never shrunken type', () => {
    const vm = vmAt(ALL_FIXTURES.fullBodyStationClass, 'work');
    const crowded = {
      ...vm,
      presentation: { mode: 'rotation_only' as const, perPage: 0, pages: 1, page: 0 },
    };
    render(<AudienceView vm={crowded} />);
    expect(screen.getByTestId('rotation-only').textContent).toContain('printed card');
    expect(screen.queryAllByTestId(/station-card-/)).toHaveLength(0);
  });

  it('pageSlice alternates cleanly and never repeats within a page', () => {
    const cards = vmAt(ALL_FIXTURES.fullBodyStationClass, 'work').stations;
    expect(pageSlice(cards, 2, 0).map((c) => c.stationIndex)).toEqual([0, 1]);
    expect(pageSlice(cards, 2, 1).map((c) => c.stationIndex)).toEqual([2]);
    expect(pageSlice(cards, 2, 2).map((c) => c.stationIndex)).toEqual([0, 1]); // wraps
    expect(pageSlice(cards, 4, 5)).toHaveLength(3); // fits on one page: untouched
  });

  it('the audience surface carries NO Wing Purple anywhere in its style tokens', async () => {
    const styles = await import('./Audience.styles');
    // The ban is doctrinal (consult P6): purple is coach-facing, never audience.
    const source = Object.values(styles).map(String).join(' ');
    expect(source.toLowerCase()).not.toContain('8b5cf6');
    expect(source.toLowerCase()).not.toContain('accent-glow');
  });
});
