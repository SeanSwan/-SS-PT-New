/**
 * SWA-105 Slice 7 — the Trainer Console rendered against the REAL SwapDeck
 * output (fixtures -> buildSwapDeck -> render), buttons pressed.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import ConsoleView, { type ConsoleStationVM } from './ConsoleView';
import { buildSwapDeck, type SwapCandidate } from './swapDeck';
// @ts-expect-error shared core ships untyped .mjs
import { ALL_FIXTURES } from '../../../../../shared/bootcamp-core/fixtures.mjs';

const stations: ConsoleStationVM[] = [
  { stationIndex: 0, label: 'Squat + Hinge', exerciseName: 'Goblet Squat', slotId: 'goblet_squat' },
  { stationIndex: 1, label: 'Push + Pull', exerciseName: 'Push-Up', slotId: 'push_up', equipmentTight: true },
];

const mv = (pattern: string | null) => ({
  primaryRegion: 'lower', regions: ['lower'], pattern, joints: [], impact: 'low',
});
const cand = (exerciseRef: string, over: Partial<SwapCandidate> = {}): SwapCandidate => ({
  exerciseRef, displayName: exerciseRef.replace(/^ex_/, '').replace(/_/g, ' '),
  movement: mv('squat'), equipmentRefs: [], ...over,
});

const baseProps = {
  phaseLabel: 'Work — Round 1',
  remainingLabel: '0:32',
  paused: false,
  stations,
  deck: null,
  degraded: [],
  onCommand: vi.fn(),
  onOpenDeck: vi.fn(),
  onPickSwap: vi.fn(),
  onCloseDeck: vi.fn(),
};

describe('ConsoleView — pressing the actual buttons', () => {
  it('transport buttons dispatch the protocol commands', () => {
    const onCommand = vi.fn();
    render(<ConsoleView {...baseProps} onCommand={onCommand} />);
    fireEvent.click(screen.getByTestId('btn-pause'));
    fireEvent.click(screen.getByTestId('btn-skip'));
    fireEvent.click(screen.getByTestId('btn-extend'));
    fireEvent.click(screen.getByTestId('btn-end'));
    expect(onCommand.mock.calls.map((c) => c[0])).toEqual(['PAUSE', 'SKIP', 'EXTEND_60', 'END_CLASS']);
  });

  it('when paused the same button resumes', () => {
    const onCommand = vi.fn();
    render(<ConsoleView {...baseProps} paused onCommand={onCommand} />);
    fireEvent.click(screen.getByText('Resume'));
    expect(onCommand).toHaveBeenCalledWith('RESUME');
  });

  it('each station row opens the deck for ITS slot', () => {
    const onOpenDeck = vi.fn();
    render(<ConsoleView {...baseProps} onOpenDeck={onOpenDeck} />);
    fireEvent.click(screen.getByTestId('btn-swap-1'));
    expect(onOpenDeck).toHaveBeenCalledWith('push_up');
  });

  it('renders a REAL deck: rows carry names, relaxed rows confess with a gold chip', () => {
    const deck = buildSwapDeck({
      plan: ALL_FIXTURES.fullBodyStationClass(),
      slotId: 'goblet_squat',
      pool: [
        cand('ex_box_squat', { equipmentRefs: ['eq_dumbbell'], setupSec: 5 }),
        cand('ex_landmine_squat', { equipmentRefs: ['eq_landmine'] }), // not in room -> R5
      ],
    });
    const onPickSwap = vi.fn();
    render(<ConsoleView {...baseProps} deck={{ ...deck, forSlotId: 'goblet_squat' }} onPickSwap={onPickSwap} />);

    expect(screen.getByTestId('swap-deck')).toBeTruthy();
    expect(screen.getByText(/bodyweight sub/)).toBeTruthy(); // the confession, visible

    fireEvent.click(screen.getByTestId('deck-row-ex_box_squat'));
    expect(onPickSwap).toHaveBeenCalledWith('goblet_squat', 'ex_box_squat', 'R0');
  });

  it('an exhausted deck shows the structural outs, never an empty panel', () => {
    const deck = buildSwapDeck({
      plan: ALL_FIXTURES.fullBodyStationClass(), slotId: 'goblet_squat', pool: [],
    });
    render(<ConsoleView {...baseProps} deck={{ ...deck, forSlotId: 'goblet_squat' }} />);
    const outs = screen.getByTestId('structural-outs');
    expect(outs.textContent).toContain('Hold this station longer');
    expect(outs.textContent).toContain('Drop this station');
  });

  it('degradation banners are role=alert — loud, not decorative', () => {
    render(<ConsoleView {...baseProps} degraded={['Wake lock lost — the screen may sleep']} />);
    expect(screen.getByRole('alert').textContent).toContain('Wake lock lost');
  });
});
