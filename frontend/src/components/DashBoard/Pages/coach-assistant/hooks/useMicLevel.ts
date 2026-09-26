/**
 * FILE: useMicLevel.ts
 * PURPOSE: Real microphone level bars for the inline dictation strip.
 *
 * WHY A REAL METER
 * ----------------
 * The strip exists to answer one question at a glance: "is it hearing me?".
 * A decorative loop that animates on a timer answers it wrong — it looks
 * identical whether the microphone is live, muted at the OS, or reading a
 * silent room, which is exactly the failure the speaker needs to notice.
 * These bars are driven by the actual waveform, so a flat strip means flat
 * audio.
 *
 * It reads the stream the recorder is ALREADY holding (`getStream`) rather than
 * calling getUserMedia again — a second capture would be wasteful and can
 * re-trigger the permission affordance on some platforms.
 *
 * DEGRADES TO SILENCE, NOT TO A LIE
 * ---------------------------------
 * Where there is no AudioContext (jsdom, some WebViews) the hook reports
 * `metering: false` and returns zeros. Callers must then fall back to an
 * indicator that does not claim to be a level — a plain "recording" pulse.
 * Returning a fake animated level here would put the dishonesty back where
 * this hook removed it.
 */
import { useEffect, useState } from 'react';

type AudioContextCtor = new () => AudioContext;

/** Time-domain samples per frame. 1024 is plenty for a five-bar meter. */
const FFT_SIZE = 1024;
/** Speech RMS is small; without gain a correct meter reads as a dead one. */
const GAIN = 6;
/** ~15fps. Fast enough to read as live, slow enough not to re-render per frame. */
const MIN_FRAME_GAP_MS = 66;

function resolveAudioContext(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const scoped = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return scoped.AudioContext ?? scoped.webkitAudioContext ?? null;
}

const silent = (barCount: number): number[] => new Array(barCount).fill(0);

export interface MicLevelState {
  /** Per-bar level, 0..1. Meaningless unless `metering` is true. */
  levels: number[];
  /** True only while a live analyser is attached to a real stream. */
  metering: boolean;
}

export function useMicLevel(
  getStream: () => MediaStream | null,
  active: boolean,
  barCount = 5,
): MicLevelState {
  const [levels, setLevels] = useState<number[]>(() => silent(barCount));
  const [metering, setMetering] = useState(false);

  useEffect(() => {
    if (!active) {
      setMetering(false);
      setLevels((prev) => (prev.some((value) => value !== 0) ? silent(barCount) : prev));
      return;
    }

    const AudioContextCtor = resolveAudioContext();
    if (!AudioContextCtor) return;

    let context: AudioContext | null = null;
    try {
      context = new AudioContextCtor();
    } catch {
      return;
    }
    // A capture-only context can still start suspended under autoplay policy.
    void context.resume?.().catch(() => undefined);

    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let attached: MediaStream | null = null;
    let frame = 0;
    let disposed = false;
    let lastFrameAt = 0;
    const samples = new Uint8Array(FFT_SIZE);

    const detach = () => {
      try {
        source?.disconnect();
      } catch {
        /* already detached */
      }
      source = null;
      analyser = null;
      setMetering(false);
    };

    const read = (now: number) => {
      frame = window.requestAnimationFrame(read);
      if (disposed || !context) return;

      const stream = getStream();
      if (stream !== attached) {
        detach();
        attached = stream;
        if (stream) {
          try {
            source = context.createMediaStreamSource(stream);
            analyser = context.createAnalyser();
            analyser.fftSize = FFT_SIZE;
            source.connect(analyser);
            setMetering(true);
          } catch {
            detach();
          }
        }
      }

      if (!analyser) return;
      if (now - lastFrameAt < MIN_FRAME_GAP_MS) return;
      lastFrameAt = now;

      analyser.getByteTimeDomainData(samples);

      const windowSize = Math.floor(FFT_SIZE / barCount);
      const next = new Array<number>(barCount);
      for (let bar = 0; bar < barCount; bar++) {
        const start = bar * windowSize;
        let sum = 0;
        for (let i = start; i < start + windowSize; i++) {
          const deviation = (samples[i] - 128) / 128;   // 0 at silence
          sum += deviation * deviation;
        }
        const rms = Math.sqrt(sum / windowSize);
        next[bar] = Math.round(Math.min(1, rms * GAIN) * 100) / 100;
      }
      setLevels(next);
    };

    frame = window.requestAnimationFrame(read);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      detach();
      void context?.close().catch(() => undefined);
      context = null;
    };
  }, [active, barCount, getStream]);

  return { levels, metering };
}

export default useMicLevel;
