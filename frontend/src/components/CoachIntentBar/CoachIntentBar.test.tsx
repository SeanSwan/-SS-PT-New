/**
 * Card 1.4 — The Lane. Cmd+K focuses (never opens), voice and keyboard reach the
 * same object, and intentBarState finally has a rendering consumer.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoachIntentBar, { type LaneCommand } from './CoachIntentBar';

const commands: LaneCommand[] = [
  { type: 'log_workout', description: 'Log a workout for the selected client' },
  { type: 'view_last_workout', description: 'Review the last workout' },
  { type: 'brief_client', description: 'Brief me on this client', navigates: true },
  { type: 'cancel_session', description: 'Cancel a session' },
  { type: 'add_pain_entry', description: 'Log a pain entry' },
  { type: 'view_goals', description: 'Review goals' },
];

const setup = (over: Partial<React.ComponentProps<typeof CoachIntentBar>> = {}) => {
  const onSubmit = vi.fn();
  render(
    <CoachIntentBar commands={commands} lockedClientId={61} onSubmit={onSubmit} {...over} />,
  );
  return { onSubmit };
};

describe('CoachIntentBar — the dock', () => {
  it('Cmd+K FOCUSES the bar and opens no dialog — a mode switch would fight the ≤2s loop', async () => {
    const user = userEvent.setup();
    setup();
    expect(document.activeElement).not.toBe(screen.getByTestId('lane-input'));

    await user.keyboard('{Meta>}k{/Meta}');
    expect(document.activeElement).toBe(screen.getByTestId('lane-input'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Ctrl+K works too — the bar is not macOS-only', async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard('{Control>}k{/Control}');
    expect(document.activeElement).toBe(screen.getByTestId('lane-input'));
  });

  it('typing surfaces at most five grouped rows', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByTestId('lane-input'), 'o');
    expect(screen.getAllByRole('option').length).toBeLessThanOrEqual(5);
  });

  it('Enter submits the highlighted row; the input clears for the next utterance', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    const input = screen.getByTestId('lane-input');
    await user.type(input, 'cancel');
    await user.keyboard('{Enter}');
    // F-17 (GLM 5.3) / F-20 (flash): a PICKED row now carries its exact `type`
    // alongside the text, so the lane never sends an operator's precise choice
    // back through the fuzzy classifier. Asserting the type is the point of the
    // finding — asserting only the text would pass with the defect restored.
    expect(onSubmit).toHaveBeenCalledWith('Cancel a session', { type: 'cancel_session' });
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('Enter with no match submits the raw utterance — plain speech is never blocked by the list', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByTestId('lane-input'), 'bench four sets of ten at one eighty five');
    await user.keyboard('{Enter}');
    // Free speech carries NO type — nothing was picked, so nothing is claimed.
    expect(onSubmit).toHaveBeenCalledWith('bench four sets of ten at one eighty five', undefined);
  });

  it('arrow keys move the selection', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByTestId('lane-input'), 'review');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('Review goals', { type: 'view_goals' });
  });
});

describe('the client chip — intentBarState finally rendered', () => {
  it('is quiet when the action stays on the locked client', () => {
    setup({ lockedClientId: 61, targetClientId: 61 });
    expect(screen.getByTestId('lane-client-chip').dataset.tone).toBe('locked');
  });

  it('ALARMS on a true cross-client action', () => {
    setup({ lockedClientId: 61, targetClientId: 47 });
    const chip = screen.getByTestId('lane-client-chip');
    expect(chip.dataset.tone).toBe('cross-client');
    expect(chip.getAttribute('aria-label')).toMatch(/have not locked/i);
  });

  it('ALARMS when a client is named with nothing locked — the case that used to read as "no client"', () => {
    setup({ lockedClientId: null, targetClientId: 47 });
    expect(screen.getByTestId('lane-client-chip').dataset.tone).toBe('cross-client');
  });

  it('stays quiet when genuinely nothing is selected — the alarm must not become wallpaper', () => {
    setup({ lockedClientId: null, targetClientId: null });
    expect(screen.getByTestId('lane-client-chip').dataset.tone).toBe('unlocked');
  });
});

describe('collapsed state carries one live token', () => {
  it('shows unsynced work from the C2 projection', () => {
    setup({ pendingCount: 2 });
    expect(screen.getByTestId('lane-pending').textContent).toMatch(/2 not yet synced/);
  });

  it('says nothing when there is nothing to say', () => {
    setup({ pendingCount: 0 });
    expect(screen.queryByTestId('lane-pending')).toBeNull();
  });
});

describe('voice and keyboard reach the SAME object', () => {
  it('the mic sits in the same bar and reports its listening state', async () => {
    const onVoice = vi.fn();
    const user = userEvent.setup();
    setup({ onVoice, listening: true });
    const mic = screen.getByTestId('lane-mic');
    expect(mic.getAttribute('aria-pressed')).toBe('true');
    await user.click(mic);
    expect(onVoice).toHaveBeenCalled();
  });
});
