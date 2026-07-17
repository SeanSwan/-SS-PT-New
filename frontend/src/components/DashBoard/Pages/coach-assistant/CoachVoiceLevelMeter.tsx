/**
 * COMPONENT: CoachVoiceLevelMeter
 * PURPOSE: Live "your voice is being heard" waveform for Swan Coach dictation.
 *
 * Browser SpeechRecognition exposes NO media stream, so while dictation is
 * armed this opens a PARALLEL analyser-only getUserMedia stream (browsers
 * allow the concurrent capture) and draws level bars. If that second capture
 * is denied or unavailable, it degrades to a pulse-only indicator — dictation
 * itself is never interrupted (NEXT-CHAT W3 decision 2).
 */
import React, { useEffect, useRef, useState } from 'react';

type CoachVoiceLevelMeterProps = { active: boolean };

const BAR_COUNT = 24;

function drawBars(canvas: HTMLCanvasElement, analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>) {
  const context = canvas.getContext('2d');
  if (!context) return;
  analyser.getByteTimeDomainData(data);
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  const sliceSize = Math.floor(data.length / BAR_COUNT);
  const barWidth = width / BAR_COUNT;
  const style = getComputedStyle(canvas);
  context.fillStyle = style.getPropertyValue('--coach-cyan').trim() || '#60c0f0';
  for (let index = 0; index < BAR_COUNT; index += 1) {
    let sum = 0;
    for (let sample = 0; sample < sliceSize; sample += 1) {
      const value = (data[index * sliceSize + sample] - 128) / 128;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / sliceSize);
    const barHeight = Math.max(2, Math.min(1, rms * 3.2) * height);
    context.fillRect(index * barWidth + 1, (height - barHeight) / 2, Math.max(1, barWidth - 2), barHeight);
  }
}

const CoachVoiceLevelMeter: React.FC<CoachVoiceLevelMeterProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [meterState, setMeterState] = useState<'idle' | 'live' | 'pulse'>('idle');

  useEffect(() => {
    if (!active) {
      setMeterState('idle');
      return undefined;
    }
    if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      setMeterState('pulse');
      return undefined;
    }
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  }, [active]);

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
