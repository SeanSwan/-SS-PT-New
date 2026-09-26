/**
 * COMPONENT: CoachDictationStrip
 * PARENT: CoachConsoleDock
 * PURPOSE: The live "it is hearing me" indicator shown inside the composer
 *          while the microphone is open.
 *
 * VISUAL ONLY — `aria-hidden`
 * ---------------------------
 * The accessible live region for voice state is the dock's status line, which
 * carries the same information in words. Announcing an animated meter as well
 * would read the state twice.
 *
 * THE BARS ARE HONEST OR THEY ARE ABSENT
 * --------------------------------------
 * With `metering` true they are a real waveform reading, so a flat strip means
 * flat audio. With `metering` false (no AudioContext, or no stream yet) they
 * fall back to an ambient pulse and are explicitly NOT a level — a fake meter
 * looks identical whether the microphone is live, muted at the OS, or hearing
 * an empty room, which is the exact thing this strip exists to reveal.
 */
import React from 'react';
import {
  DICTATION_LISTENING_COPY,
  DICTATION_TRANSCRIBING_COPY,
  MIC_LEVEL_BARS,
  formatDictationElapsed,
} from './hooks/useCoachInlineDictation';

export type CoachVoicePhase = 'idle' | 'listening' | 'transcribing';
export type CoachVoiceCaptureMode = 'browser' | 'recorder' | 'none';

/**
 * Everything the dock needs to know about dictation, in one object. Grouped
 * rather than passed as eight sibling props so the page's render block stays
 * inside the section-split line cap — the same reason `voiceOverlay` was an
 * object before it.
 */
export interface CoachDockVoice {
  active: boolean;
  captureMode: CoachVoiceCaptureMode;
  elapsedSeconds: number;
  levels: number[];
  metering: boolean;
  phase: CoachVoicePhase;
  /**
   * Discards the open microphone WITHOUT keeping the pending tail. Named
   * `cancel` and not `stop` on purpose: the mic button's own "stop" KEEPS the
   * words ("tap to stop" in its label), and one word meaning both keep and
   * discard is how the wrong one gets wired up later.
   */
  cancel: () => void;
  supported: boolean;
}

const CoachDictationStrip: React.FC<{
  elapsedSeconds: number;
  levels: number[];
  metering: boolean;
  phase: CoachVoicePhase;
}> = ({ elapsedSeconds, levels, metering, phase }) => (
  <div
    className={`dock-listening${phase === 'transcribing' ? ' is-transcribing' : ''}`}
    aria-hidden="true"
  >
    <span className="dock-listening-bars">
      {Array.from({ length: MIC_LEVEL_BARS }, (_, index) => (
        <i
          key={index}
          className={`dock-listening-bar${metering ? '' : ' is-ambient'}`}
          style={metering
            ? { transform: `scaleY(${Math.max(0.08, levels[index] ?? 0)})` }
            : { animationDelay: `${index * 0.11}s` }}
        />
      ))}
    </span>
    <span className="dock-listening-text">
      {phase === 'transcribing' ? DICTATION_TRANSCRIBING_COPY : DICTATION_LISTENING_COPY}
    </span>
    {phase === 'listening' && elapsedSeconds > 0 ? (
      <span className="dock-listening-clock">{formatDictationElapsed(elapsedSeconds)}</span>
    ) : null}
  </div>
);

export default CoachDictationStrip;
