/**
 * ┌─── COMPONENT: AccessibleVideoPlayer ────────────────────────┐
 * │ PURPOSE: WCAG 2.2 accessible video player for session       │
 * │ recordings. Keyboard navigable, screen-reader friendly,     │
 * │ captions from Deepgram transcription, high-contrast.        │
 * │ PHASE 3: WCAG accessible video player for recordings.       │
 * │ CEO RULING: WCAG 2.2, Deepgram captions, R2 recordings.    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, MessageSquare, Download,
} from 'lucide-react';
import { StyledBox } from '@/components/ui/StyledBox';

interface Props {
  src: string;
  title?: string;
  transcription?: string;
  onClose?: () => void;
}

// ── Styled Components ──
const PlayerWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(96, 192, 240, 0.15);

  &:focus-within {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const Video = styled.video`
  width: 100%;
  display: block;
  aspect-ratio: 16/9;
  background: #000;
`;

const CaptionOverlay = styled.div<{ $visible: boolean }>`
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  line-height: 1.4;
  text-align: center;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.2s;
  pointer-events: none;
`;

const Controls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  position: relative;

  &:hover { height: 8px; }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 3px;
  background: var(--accent-primary, #60C0F0);
  width: ${({ $pct }) => $pct}%;
  transition: width 0.1s;
  pointer-events: none;
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ControlBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  border: none;
  background: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.15s;

  &:hover { background: rgba(255, 255, 255, 0.12); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const TimeDisplay = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  padding: 0 8px;
  min-width: 100px;
`;

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  accent-color: var(--accent-primary, #60C0F0);
  cursor: pointer;
`;

const Spacer = styled.div`flex: 1;`;

const TitleBar = styled.div`
  padding: 12px 16px;
  background: var(--bg-elevated, #141419);
  border-bottom: 1px solid rgba(96, 192, 240, 0.1);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const TranscriptPanel = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '200px' : '0'};
  overflow-y: auto;
  transition: max-height 0.3s ease;
  background: var(--bg-elevated, #141419);
  padding: ${({ $open }) => $open ? '12px 16px' : '0 16px'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #E0ECF4);
  white-space: pre-wrap;
`;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatVttTime(sec: number): string {
  const totalMs = Math.max(0, Math.floor(sec * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const milliseconds = totalMs % 1000;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

const AccessibleVideoPlayer: React.FC<Props> = ({ src, title, transcription, onClose: _onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCaptions = Boolean(transcription?.trim());
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(!hasCaptions);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse transcription into timed segments (simple word-based approximation)
  const transcriptSegments = React.useMemo(() => {
    if (!transcription) return [];
    const words = transcription.split(/\s+/);
    const wordsPerSecond = 2.5;
    const segmentSize = 12;
    const segments: { start: number; end: number; text: string }[] = [];
    for (let i = 0; i < words.length; i += segmentSize) {
      const chunk = words.slice(i, i + segmentSize).join(' ');
      const start = (i / wordsPerSecond);
      const end = ((i + segmentSize) / wordsPerSecond);
      segments.push({ start, end, text: chunk });
    }
    return segments;
  }, [transcription]);

  const captionTrackSrc = React.useMemo(() => {
    const cues = transcriptSegments.map((segment, index) => (
      `${index + 1}\n${formatVttTime(segment.start)} --> ${formatVttTime(segment.end)}\n${segment.text}`
    ));
    return `data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n${cues.join('\n\n')}`)}`;
  }, [transcriptSegments]);

  useEffect(() => {
    if (hasCaptions) return;
    setMuted(true);
    if (videoRef.current) videoRef.current.muted = true;
  }, [hasCaptions]);

  useEffect(() => {
    if (!captionsOn || transcriptSegments.length === 0) {
      setCaptionText('');
      return;
    }
    const seg = transcriptSegments.find(s => currentTime >= s.start && currentTime < s.end);
    setCaptionText(seg?.text || '');
  }, [currentTime, captionsOn, transcriptSegments]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v || !hasCaptions) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, [hasCaptions]);

  const handleVolumeChange = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v || !hasCaptions) return;
    v.volume = val;
    setVolume(val);
    if (val === 0) setMuted(true);
    else if (muted) { v.muted = false; setMuted(false); }
  }, [hasCaptions, muted]);

  const seek = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(sec, v.duration || 0));
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * duration);
  }, [duration, seek]);

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setFullscreen(false);
    } else {
      wrapperRef.current.requestFullscreen();
      setFullscreen(true);
    }
  }, []);

  // Keyboard controls
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
      case 'k': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': e.preventDefault(); seek(currentTime - 10); break;
      case 'ArrowRight': e.preventDefault(); seek(currentTime + 10); break;
      case 'ArrowUp': e.preventDefault(); handleVolumeChange(Math.min(volume + 0.1, 1)); break;
      case 'ArrowDown': e.preventDefault(); handleVolumeChange(Math.max(volume - 0.1, 0)); break;
      case 'm': e.preventDefault(); toggleMute(); break;
      case 'f': e.preventDefault(); toggleFullscreen(); break;
      case 'c': e.preventDefault(); setCaptionsOn(p => !p); break;
    }
  }, [togglePlay, seek, currentTime, handleVolumeChange, volume, toggleMute, toggleFullscreen]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div>
      {title && <TitleBar>{title}</TitleBar>}

      <PlayerWrapper
        ref={wrapperRef}
        onKeyDownCapture={handleKeyDown}
        role="region"
        aria-label={`Video player${title ? `: ${title}` : ''}`}
      >
        <Video
          ref={videoRef}
          src={src}
          muted={!hasCaptions || muted}
          onVolumeChange={(event) => { if (!hasCaptions) event.currentTarget.muted = true; }}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => setPlaying(false)}
          onClick={togglePlay}
          aria-label="Session recording"
        >
          <track kind="captions" src={captionTrackSrc} srcLang="en" label="English" />
        </Video>

        {/* Captions */}
        <CaptionOverlay $visible={!!captionText} aria-live="polite">
          {captionText}
        </CaptionOverlay>

        {/* Controls */}
        <Controls>
          <ProgressBar
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
            onKeyDown={(event) => {
              const nextTime = event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? duration
                  : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                    ? currentTime - 5
                    : event.key === 'ArrowRight' || event.key === 'ArrowUp'
                      ? currentTime + 5
                      : null;
              if (nextTime !== null) {
                event.preventDefault();
                seek(nextTime);
              }
            }}
            onClick={handleProgressClick}
          >
            <ProgressFill $pct={pct} />
          </ProgressBar>

          <ControlRow>
            <ControlBtn onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </ControlBtn>

            <ControlBtn onClick={() => seek(currentTime - 10)} aria-label="Rewind 10 seconds">
              <SkipBack size={18} />
            </ControlBtn>

            <ControlBtn onClick={() => seek(currentTime + 10)} aria-label="Forward 10 seconds">
              <SkipForward size={18} />
            </ControlBtn>

            <TimeDisplay aria-live="off">
              {formatTime(currentTime)} / {formatTime(duration)}
            </TimeDisplay>

            <Spacer />

            <ControlBtn onClick={toggleMute} disabled={!hasCaptions} aria-label={hasCaptions ? (muted ? 'Unmute' : 'Mute') : 'Audio unavailable because captions were not provided'}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </ControlBtn>

            <VolumeSlider
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              disabled={!hasCaptions}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              aria-label="Volume"
            />

            {transcription && (
              <StyledBox as={ControlBtn}
                onClick={() => setCaptionsOn(p => !p)}
                aria-label={captionsOn ? 'Hide captions' : 'Show captions'}
                $style={{ color: captionsOn ? 'var(--accent-primary, #60C0F0)' : 'rgba(255,255,255,0.5)' }}
              >
                <MessageSquare size={18} />
              </StyledBox>
            )}

            {transcription && (
              <ControlBtn
                onClick={() => setShowTranscript(p => !p)}
                aria-label={showTranscript ? 'Hide transcript' : 'Show transcript'}
              >
                <Download size={18} />
              </ControlBtn>
            )}

            <ControlBtn onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </ControlBtn>
          </ControlRow>
        </Controls>
      </PlayerWrapper>

      {/* Transcript panel */}
      {transcription && (
        <TranscriptPanel $open={showTranscript} role="region" aria-label="Session transcript">
          {transcription}
        </TranscriptPanel>
      )}
    </div>
  );
};

export default AccessibleVideoPlayer;
