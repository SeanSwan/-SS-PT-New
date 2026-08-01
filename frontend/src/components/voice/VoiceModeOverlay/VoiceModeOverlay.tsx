/**
 * COMPONENT: VoiceModeOverlay (S9 — JARVIS blueprint §6.2, ruling A1/A4)
 * PURPOSE: The full-screen voice surface. Center object is the Crystalline
 * Swan ORB — layered clip-path crystal facets, ONE object across all states
 * (a generic waveform is REJECTED by ruling A1): idle=shimmer ·
 * listening=facets breathe with live mic amplitude (one rAF writing the
 * `--orb-amp` CSS custom property — zero React re-renders) · transcribing=
 * facets collapse to a line · speaking=±3° rotation · barge-in snaps to
 * listening in 150ms. All transform/opacity. Reduced-motion = static
 * crystal + state text. "Type instead" is visible and functional in EVERY
 * state. role=dialog aria-modal, focus trap, Esc closes, aria-live
 * assertive on state / polite on transcript. z-90 (A4). DARK behind
 * VOICE_MODE_V2 until the S10 cutover mounts it.
 */

import React from 'react';
import type { JarvisLoopState } from '../../../hooks/voice/useJarvisVoiceLoop';
import {
  OverlayBackdrop, OverlayPanel, Orb, OrbFacet, StateText, TranscriptText,
  ClarifyText, ButtonRow, HoldButton, TypeInsteadButton, CloseButton,
} from './VoiceModeOverlay.styles';

const STATE_COPY: Record<JarvisLoopState['state'], string> = {
  idle: 'Hold to talk',
  listening: 'Listening…',
  transcribing: 'Writing down what you said…',
  decoding: 'Coach is reading it…',
  review: 'Check the rows before anything logs',
  clarifying: 'One quick question',
  speaking: 'Coach is talking',
  error: 'That didn’t work — you can type instead',
};

export interface VoiceModeOverlayProps {
  loop: JarvisLoopState;
  /** Live mic RMS 0..1; sampled via rAF into a CSS var, never state. */
  getAudioLevel?: () => number;
  /** F1 lock-safety: ask before sending a lock-stopped recording. */
  confirmPrompt?: { text: string; confirmLabel: string; onConfirm: () => void } | null;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onTypeInstead: () => void;
  onClose: () => void;
}

const FACETS = [0, 1, 2, 3, 4];

const VoiceModeOverlay: React.FC<VoiceModeOverlayProps> = ({
  loop, getAudioLevel, confirmPrompt, onHoldStart, onHoldEnd, onTypeInstead, onClose,
}) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const orbRef = React.useRef<HTMLDivElement | null>(null);

  // Amplitude → CSS custom property; one rAF, zero re-renders (ruling A1).
  React.useEffect(() => {
    if (loop.state !== 'listening' || !getAudioLevel) return undefined;
    let raf = 0;
    const tick = () => {
      orbRef.current?.style.setProperty('--orb-amp', String(1 + Math.min(0.06, getAudioLevel() * 0.06)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loop.state, getAudioLevel]);

  // Focus trap + Esc close (A4 chain: overlay → sheet → overlay → trigger).
  React.useEffect(() => {
    const panel = panelRef.current;
    panel?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>('button, [href], input, textarea');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <OverlayBackdrop>
      <OverlayPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Swan Coach voice mode"
        tabIndex={-1}
      >
        <Orb ref={orbRef} $state={loop.state} aria-hidden data-testid="voice-orb">
          {FACETS.map(i => <OrbFacet key={i} $index={i} />)}
        </Orb>

        <StateText aria-live="assertive" data-testid="voice-state-text">
          {STATE_COPY[loop.state]}
        </StateText>

        {loop.transcript && (
          <TranscriptText aria-live="polite" aria-label="What Coach heard">
            {loop.transcript}
          </TranscriptText>
        )}

        {loop.state === 'clarifying' && loop.clarifyQuestion && (
          <ClarifyText role="status">{loop.clarifyQuestion}</ClarifyText>
        )}
        {loop.errorMessage && loop.state === 'error' && (
          <ClarifyText role="alert">{loop.errorMessage}</ClarifyText>
        )}

        {confirmPrompt && (
          <>
            <ClarifyText role="status" data-testid="voice-lock-confirm">{confirmPrompt.text}</ClarifyText>
            <TypeInsteadButton type="button" onClick={confirmPrompt.onConfirm}>
              {confirmPrompt.confirmLabel}
            </TypeInsteadButton>
          </>
        )}

        <ButtonRow>
          <HoldButton
            type="button"
            aria-pressed={loop.state === 'listening'}
            onPointerDown={onHoldStart}
            onPointerUp={onHoldEnd}
            onPointerCancel={onHoldEnd}
            onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') onHoldStart(); }}
            onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') onHoldEnd(); }}
          >
            {loop.state === 'listening' ? 'Release to send' : 'Hold to talk'}
          </HoldButton>
          <TypeInsteadButton type="button" onClick={onTypeInstead} data-testid="voice-type-instead">
            Type instead
          </TypeInsteadButton>
          <CloseButton type="button" onClick={onClose}>Close</CloseButton>
        </ButtonRow>
      </OverlayPanel>
    </OverlayBackdrop>
  );
};

export default VoiceModeOverlay;
