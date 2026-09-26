/**
 * COMPONENT: CoachVoiceLevelMeter
 * PURPOSE: Live "your voice is being heard" waveform for Swan Coach dictation.
 *
 * Browser SpeechRecognition exposes NO media stream, so while dictation is
 * armed this opens a PARALLEL analyser-only getUserMedia stream (browsers
 * allow the concurrent capture) and draws level bars. If that second capture
 * is denied or unavailable, it degrades to a pulse-only indicator — dictation
 * itself is never interrupted (NEXT-CHAT W3 decision 2).
 *
 * A caller that ALREADY holds a live microphone (the inline recorder lane)
 * passes `getLevel` instead: metering that stream directly avoids a second
 * concurrent capture, and cannot render a silent second stream as "not
 * hearing you" while a recording is in fact underway.
 */
import React, { useEffect, useRef, useState } from 'react';

type CoachVoiceLevelMeterProps = {
  active: boolean;
  /** Live mic RMS 0..1 from a stream the caller already owns. */
  getLevel?: () => number;
};

const BAR_COUNT = 24;

function paintBars(canvas: HTMLCanvasElement, barHeightAt: (index: number) => number) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  const barWidth = width / BAR_COUNT;
  const style = getComputedStyle(canvas);
  // A canvas 2D fillStyle takes a resolved colour STRING, so var() cannot reach it:
  // the literal below is only the last-resort fallback for a surface that defines no
  // --coach-cyan. Inherited from main; tagged rather than silently re-introduced.
  context.fillStyle = style.getPropertyValue('--coach-cyan').trim() || '#60c0f0'; // swan-guard-allow-hex canvas-fillstyle-needs-a-string
  for (let index = 0; index < BAR_COUNT; index += 1) {
    const barHeight = Math.max(2, Math.min(1, barHeightAt(index)) * height);
    context.fillRect(index * barWidth + 1, (height - barHeight) / 2, Math.max(1, barWidth - 2), barHeight);
  }
}

function drawBars(canvas: HTMLCanvasElement, analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>) {
  analyser.getByteTimeDomainData(data);
  const sliceSize = Math.floor(data.length / BAR_COUNT);
  paintBars(canvas, (index) => {
    let sum = 0;
    for (let sample = 0; sample < sliceSize; sample += 1) {
      const value = (data[index * sliceSize + sample] - 128) / 128;
      sum += value * value;
    }
    return Math.sqrt(sum / sliceSize) * 3.2;
  });
}

/** A single RMS scalar carries no per-band shape, so taper it across the bars —
 * the meter should read as "hearing you", not pretend to be a spectrum analyser. */
function drawScalarLevel(canvas: HTMLCanvasElement, level: number) {
  const mid = (BAR_COUNT - 1) / 2;
  paintBars(canvas, (index) => level * (0.45 + 0.55 * (1 - Math.abs(index - mid) / mid)));
}

const CoachVoiceLevelMeter: React.FC<CoachVoiceLevelMeterProps> = ({ active, getLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [meterState, setMeterState] = useState<'idle' | 'live' | 'pulse'>('idle');

  useEffect(() => {
    if (!active) {
      setMeterState('idle');
      return undefined;
    }
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (getLevel) {
      setMeterState('live');
      let frame = 0;
      let lastDraw = 0;
      const render = (timestamp: number) => {
        // Reduced motion: information-bearing but gentle — ~6fps instead of 60.
        if (!reducedMotion || timestamp - lastDraw > 160) {
          lastDraw = timestamp;
          if (canvasRef.current) drawScalarLevel(canvasRef.current, getLevel());
        }
        frame = window.requestAnimationFrame(render);
      };
      frame = window.requestAnimationFrame(render);
      return () => window.cancelAnimationFrame(frame);
    }

    if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      setMeterState('pulse');
      return undefined;
    }

    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let lastDraw = 0;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        const AudioContextCtor = window.AudioContext
          || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
          // No analyser possible — release the parallel capture immediately so
          // the OS mic indicator reflects only the dictation stream.
          mediaStream.getTracks().forEach((track) => track.stop());
          stream = null;
          setMeterState('pulse');
          return;
        }
        audioContext = new AudioContextCtor();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        audioContext.createMediaStreamSource(mediaStream).connect(analyser);
        const data = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        setMeterState('live');
        const render = (timestamp: number) => {
          if (cancelled) return;
          // Reduced motion: information-bearing but gentle — ~6fps instead of 60.
          if (!reducedMotion || timestamp - lastDraw > 160) {
            lastDraw = timestamp;
            if (canvasRef.current) drawBars(canvasRef.current, analyser, data);
          }
          frame = window.requestAnimationFrame(render);
        };
        frame = window.requestAnimationFrame(render);
      })
      .catch(() => {
        // Covers both denial (no stream) and post-grant construction failures
        // (stream captured but unusable) — never hold an unconsumed capture.
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        if (!cancelled) setMeterState('pulse');
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close().catch(() => undefined);
    };
  }, [active, getLevel]);

  if (!active) return null;

  return (
    <div className={`dock-voice-strip is-${meterState}`} data-testid="coach-voice-strip">
      <span className="voice-strip-dot" aria-hidden="true" />
      <span className="voice-strip-label">Listening — tap the mic when you finish</span>
      {meterState === 'live' ? (
        <canvas
          ref={canvasRef}
          className="voice-strip-meter"
          width={220}
          height={28}
          aria-hidden="true"
        />
      ) : (
        <span className="voice-strip-pulse" aria-hidden="true">
          <i /><i /><i />
        </span>
      )}
    </div>
  );
};

export default CoachVoiceLevelMeter;
