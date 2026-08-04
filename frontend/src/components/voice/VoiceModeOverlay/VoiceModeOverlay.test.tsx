/**
 * VoiceModeOverlay.test.tsx — S9 overlay fence.
 * Locks: state text never lies (1:1 with the ladder); Type instead visible
 * + functional in every state; dialog semantics + Esc close; the orb is the
 * one center object (no waveform); amplitude rides a CSS var, not state.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import VoiceModeOverlay from './VoiceModeOverlay';
import { INITIAL_JARVIS_STATE, type JarvisLoopState, type JarvisVoiceState } from '../../../hooks/voice/useJarvisVoiceLoop';

const at = (state: JarvisVoiceState, patch: Partial<JarvisLoopState> = {}): JarvisLoopState =>
  ({ ...INITIAL_JARVIS_STATE, state, ...patch });

const renderAt = (loop: JarvisLoopState, onTypeInstead = vi.fn(), onClose = vi.fn()) => {
  render(
    <VoiceModeOverlay
      loop={loop}
      onHoldStart={vi.fn()} onHoldEnd={vi.fn()}
      onTypeInstead={onTypeInstead} onClose={onClose}
    />,
  );
  return { onTypeInstead, onClose };
};

const ALL_STATES: JarvisVoiceState[] = ['idle', 'listening', 'transcribing', 'decoding', 'review', 'clarifying', 'speaking', 'error'];

describe('S9 VoiceModeOverlay', () => {
  it('Type instead is visible and functional in EVERY state', () => {
    for (const state of ALL_STATES) {
      const onTypeInstead = vi.fn();
      const { unmount } = render(
        <VoiceModeOverlay loop={at(state)} onHoldStart={vi.fn()} onHoldEnd={vi.fn()} onTypeInstead={onTypeInstead} onClose={vi.fn()} />,
      );
      fireEvent.click(screen.getByTestId('voice-type-instead'));
      expect(onTypeInstead, `state ${state}`).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it('is a modal dialog with assertive state announcement and Esc close', () => {
    const { onClose } = renderAt(at('listening'));
    const dialog = screen.getByRole('dialog', { name: /voice mode/i });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByTestId('voice-state-text').getAttribute('aria-live')).toBe('assertive');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the crystal orb (facets), never a waveform, amplitude via CSS var only', () => {
    renderAt(at('listening'));
    expect(screen.getByTestId('voice-orb').children.length).toBe(5);
    const src = readFileSync(resolve(__dirname, 'VoiceModeOverlay.tsx'), 'utf8');
    expect(src).toContain("setProperty('--orb-amp'");
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(codeOnly.toLowerCase()).not.toContain('waveform'); // ruling A1: orb, not bars
    const styles = readFileSync(resolve(__dirname, 'VoiceModeOverlay.styles.ts'), 'utf8');
    expect(styles).toContain('prefers-reduced-motion');
    expect(styles).toContain('z-index: 90');
  });

  it('clarify question and transcript render in their states', () => {
    renderAt(at('clarifying', { clarifyQuestion: 'Which bench?', transcript: 'bench 3x8' }));
    expect(screen.getByRole('status').textContent).toBe('Which bench?');
    expect(screen.getByLabelText('What Coach heard').textContent).toBe('bench 3x8');
  });

  it('disables hold during non-listenable phases and never calls capture handlers', () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    render(
      <VoiceModeOverlay
        loop={at('transcribing')}
        holdDisabled
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        onTypeInstead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const hold = screen.getByRole('button', { name: /hold to talk/i });
    expect(hold).toBeDisabled();
    fireEvent.pointerDown(hold, { pointerId: 7 });
    fireEvent.click(hold, { detail: 0 });
    expect(onHoldStart).not.toHaveBeenCalled();
    expect(onHoldEnd).not.toHaveBeenCalled();
  });

  it('captures the pointer so release remains owned by the hold button', () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    render(
      <VoiceModeOverlay
        loop={at('idle')}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        onTypeInstead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const hold = screen.getByRole('button', { name: /hold to talk/i });
    const setPointerCapture = vi.fn();
    Object.defineProperty(hold, 'setPointerCapture', { configurable: true, value: setPointerCapture });
    fireEvent.pointerDown(hold, { pointerId: 11 });
    fireEvent.pointerUp(hold, { pointerId: 11 });
    expect(setPointerCapture).toHaveBeenCalledWith(11);
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });

  it('delivers release once even if the control becomes disabled mid-hold', () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const props = {
      onHoldStart,
      onHoldEnd,
      onTypeInstead: vi.fn(),
      onClose: vi.fn(),
    };
    const { rerender } = render(<VoiceModeOverlay loop={at('idle')} {...props} />);
    const hold = screen.getByRole('button', { name: /hold to talk/i });
    Object.defineProperty(hold, 'setPointerCapture', { configurable: true, value: vi.fn() });
    fireEvent.pointerDown(hold, { pointerId: 17 });
    rerender(<VoiceModeOverlay loop={at('transcribing')} holdDisabled {...props} />);
    fireEvent.pointerUp(hold, { pointerId: 17 });
    fireEvent.pointerCancel(hold, { pointerId: 17 });
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard and assistive-tech click activation as a start-stop latch', () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    render(
      <VoiceModeOverlay
        loop={at('idle')}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        onTypeInstead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const hold = screen.getByRole('button', { name: /hold to talk/i });
    fireEvent.click(hold, { detail: 0 });
    expect(hold.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(hold, { detail: 0 });
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
    expect(hold.getAttribute('aria-pressed')).toBe('false');
  });

  it('does not turn the pointer click following release into a second capture', () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    render(
      <VoiceModeOverlay
        loop={at('idle')}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        onTypeInstead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const hold = screen.getByRole('button', { name: /hold to talk/i });
    Object.defineProperty(hold, 'setPointerCapture', { configurable: true, value: vi.fn() });
    fireEvent.pointerDown(hold, { pointerId: 21 });
    fireEvent.pointerUp(hold, { pointerId: 21 });
    fireEvent.click(hold, { detail: 1 });
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });
});
