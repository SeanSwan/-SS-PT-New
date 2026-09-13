import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CelebrationPortal, { type LevelUpData, type Particle, type XPPopData } from './CelebrationPortal';

const emptyProps = {
  xpPops: [] as XPPopData[],
  combos: [],
  particles: [] as Particle[],
  onXPPopDone: vi.fn(),
  onComboDone: vi.fn(),
};

const level = (newLevel = 4, dismiss = vi.fn()): LevelUpData => ({
  id: `level-${newLevel}`,
  newLevel,
  dismiss,
});

describe('CelebrationPortal lifecycle and accessibility', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides an accessible modal focus path and restores the invoking control', () => {
    const invokingButton = document.createElement('button');
    invokingButton.textContent = 'Open rewards';
    document.body.appendChild(invokingButton);
    invokingButton.focus();
    const dismiss = vi.fn();
    const { rerender } = render(<CelebrationPortal {...emptyProps} levelUp={level(5, dismiss)} reducedMotion />);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-live', 'assertive');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dismiss).toHaveBeenCalledTimes(1);
    rerender(<CelebrationPortal {...emptyProps} levelUp={null} reducedMotion />);
    expect(document.activeElement).toBe(invokingButton);
  });

  it('stops after particles expire and restarts for a new batch of the same size', () => {
    const frames: FrameRequestCallback[] = [];
    const frame = vi.fn((callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    vi.stubGlobal('requestAnimationFrame', frame);
    const particle: Particle = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      color: '#fff',
      life: 0.01,
      maxLife: 1,
      shape: 'orb',
    };
    const { rerender } = render(<CelebrationPortal {...emptyProps} particles={[particle]} levelUp={null} reducedMotion={false} />);
    frames[0](0);
    expect(frame).toHaveBeenCalledTimes(1);
    rerender(<CelebrationPortal {...emptyProps} particles={[{ ...particle, life: 0.01 }]} levelUp={null} reducedMotion={false} />);
    expect(frame).toHaveBeenCalledTimes(2);
    frames[1](16);
    expect(frame).toHaveBeenCalledTimes(2);
  });

  it('cleans pending XP removal timers when the pop is removed early', () => {
    vi.useFakeTimers();
    const onXPPopDone = vi.fn();
    const pop: XPPopData = { id: 'xp-1', amount: 10, x: 10, y: 10 };
    const { rerender, unmount } = render(<CelebrationPortal {...emptyProps} onXPPopDone={onXPPopDone} xpPops={[pop]} levelUp={null} reducedMotion />);
    rerender(<CelebrationPortal {...emptyProps} onXPPopDone={onXPPopDone} xpPops={[]} levelUp={null} reducedMotion />);
    vi.advanceTimersByTime(900);
    expect(onXPPopDone).not.toHaveBeenCalled();
    unmount();
    vi.useRealTimers();
  });
});
