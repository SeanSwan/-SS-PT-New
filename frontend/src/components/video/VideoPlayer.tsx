import React, { useRef, useEffect, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import LazyYouTubeEmbed from './LazyYouTubeEmbed';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface VideoPlayerProps {
  source: 'upload' | 'youtube';
  signedUrl?: string;
  captionsUrl?: string;
  youtubeVideoId?: string;
  videoId: string;
  title: string;
  onTimeUpdate?: (currentTime: number) => void;
  initialTime?: number;
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

/**
 * VideoPlayer -- unified player for hosted (HTML5) and YouTube videos.
 *
 * Hosted videos use a signed URL with automatic refresh at the 3-hour
 * mark. YouTube videos delegate to the LazyYouTubeEmbed facade.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  source,
  signedUrl,
  captionsUrl,
  youtubeVideoId,
  videoId,
  title,
  onTimeUpdate,
  initialTime,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSrc, setCurrentSrc] = useState(signedUrl);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- signed-URL refresh ---------- */
  const refreshUrl = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/v2/videos/${videoId}/refresh-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        if (res.status === 403) {
          setError('Access expired. Please reload.');
          return;
        }
        throw new Error('URL refresh failed');
      }
      const data = await res.json();
      if (data.signedUrl) {
        const el = videoRef.current;
        const time = el?.currentTime ?? 0;
        const wasPlaying = el ? !el.paused : false;
        setCurrentSrc(data.signedUrl);
        // restore playback position after src swap
        if (el) {
          el.addEventListener(
            'loadedmetadata',
            () => {
              el.currentTime = time;
              if (wasPlaying) el.play().catch(() => {});
            },
            { once: true },
          );
        }
        scheduleRefresh();
      }
    } catch {
      setError('Access expired. Please reload.');
    }
  }, [videoId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(refreshUrl, THREE_HOURS_MS);
  }, [refreshUrl]);

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    setCurrentSrc(signedUrl);
    setError(null);
  }, [signedUrl]);

  useEffect(() => {
    if (source === 'upload' && currentSrc) {
      scheduleRefresh();
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [source, currentSrc, scheduleRefresh]);

  /* seek to initial position once video metadata is loaded */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !initialTime) return;
    const onMeta = () => {
      el.currentTime = initialTime;
    };
    el.addEventListener('loadedmetadata', onMeta, { once: true });
    return () => el.removeEventListener('loadedmetadata', onMeta);
  }, [initialTime]);

  /* forward time updates to parent */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !onTimeUpdate) return;
    const handler = () => onTimeUpdate(el.currentTime);
    el.addEventListener('timeupdate', handler);
    return () => el.removeEventListener('timeupdate', handler);
  }, [onTimeUpdate]);

  /* ---------- error overlay ---------- */
  if (error) {
    return (
      <PlayerWrapper>
        <ErrorOverlay>
          <AlertTriangle size={36} />
          <ErrorText>{error}</ErrorText>
          <ReloadButton
            onClick={() => window.location.reload()}
            aria-label="Reload page"
          >
            <RefreshCw size={18} />
            Reload
          </ReloadButton>
        </ErrorOverlay>
      </PlayerWrapper>
    );
  }

  /* ---------- YouTube path ---------- */
  if (source === 'youtube' && youtubeVideoId) {
    return (
      <PlayerWrapper>
        <LazyYouTubeEmbed videoId={youtubeVideoId} title={title} />
      </PlayerWrapper>
    );
  }

  /* ---------- hosted / upload path ---------- */
  return (
    <PlayerWrapper>
      <AspectBox>
        <StyledVideo
          ref={videoRef}
          controls
          preload="metadata"
          src={currentSrc}
          onError={() => setError('Access expired. Please reload.')}
        >
          {captionsUrl && (
            <track
              kind="captions"
              src={captionsUrl}
              srcLang="en"
              label="English"
              default
            />
          )}
        </StyledVideo>
      </AspectBox>
    </PlayerWrapper>
  );
};

/* ========== Styled Components ========== */

const PlayerWrapper = styled.div`
  width: 100%;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

const AspectBox = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
`;

const StyledVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const ErrorOverlay = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  display: flex;

  /* center content inside the 16:9 box */
  & > * {
    position: absolute;
  }

  /* re-layout children centered */
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* actually center with a nested container trick */
  &::after {
    content: '';
    display: block;
  }

  color: rgba(255, 255, 255, 0.8);
  animation: ${fadeIn} 0.3s ease;

  /* Use an inner layout div instead: */
`;

/* Override: use a wrapper approach for proper centering */
const ErrorText = styled.p`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const ReloadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
  }
`;

export default VideoPlayer;
