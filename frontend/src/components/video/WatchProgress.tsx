import React, { useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Play } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface WatchProgressProps {
  videoId: string;
  durationSeconds: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

const SAVE_DEBOUNCE_MS = 10_000; // save every 10 seconds

/**
 * WatchProgress -- visual progress bar with resume capability.
 * Debounces progress saves to the backend every 10 seconds.
 */
const WatchProgress: React.FC<WatchProgressProps> = ({
  videoId,
  durationSeconds,
  currentTime,
  onSeek,
}) => {
  const lastSavedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const percent =
    durationSeconds > 0 ? Math.min((currentTime / durationSeconds) * 100, 100) : 0;

  const isComplete = percent >= 95;

  /* ---------- debounced save ---------- */
  const saveProgress = useCallback(
    async (time: number) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return; // unauthenticated users cannot save progress
        await fetch(`${API_BASE}/api/v2/videos/${videoId}/progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentTime: Math.floor(time),
            completed: time / durationSeconds >= 0.95,
          }),
        });
      } catch {
        // non-critical -- swallow
      }
    },
    [videoId, durationSeconds],
  );

  useEffect(() => {
    if (currentTime === 0) return;
    const diff = Math.abs(currentTime - lastSavedRef.current);
    if (diff < SAVE_DEBOUNCE_MS / 1000) return; // not enough time elapsed

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = currentTime;
      saveProgress(currentTime);
    }, 500); // small additional debounce for bursts

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentTime, saveProgress]);

  /* save on unmount */
  useEffect(() => {
    return () => {
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Wrapper>
      <BarTrack
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Watch progress"
      >
        <BarFill $percent={percent} $complete={isComplete} />
      </BarTrack>

      <InfoRow>
        <TimeLabel>
          {formatTime(currentTime)} / {formatTime(durationSeconds)}
          {isComplete && <CompleteBadge>Completed</CompleteBadge>}
        </TimeLabel>

        {currentTime > 5 && !isComplete && (
          <ResumeButton onClick={() => onSeek(currentTime)} aria-label="Resume playback">
            <Play size={16} />
            Resume at {formatTime(currentTime)}
          </ResumeButton>
        )}
      </InfoRow>
    </Wrapper>
  );
};

/* ========== Styled Components ========== */

const Wrapper = styled.div`
  margin-top: 8px;
`;

const BarTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const BarFill = styled.div<{ $percent: number; $complete: boolean }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  border-radius: 3px;
  background: ${({ $complete }) =>
    $complete
      ? 'linear-gradient(90deg, #00ffff, #00e676)'
      : 'linear-gradient(90deg, #3b82f6, #00ffff)'};
  transition: width 0.3s ease;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  flex-wrap: wrap;
  gap: 8px;
`;

const TimeLabel = styled.span`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CompleteBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #00e676;
  background: rgba(0, 230, 118, 0.12);
  border: 1px solid rgba(0, 230, 118, 0.3);
  border-radius: 6px;
  padding: 2px 8px;
`;

const ResumeButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.08);
  color: #00ffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: #00ffff;
  }
`;

export default WatchProgress;
