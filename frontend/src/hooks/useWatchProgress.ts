/**
 * useWatchProgress — Debounced progress save + signed URL refresh
 * ================================================================
 * Saves watch progress every 10s, refreshes signed URL at 3h mark.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSaveProgress, useRefreshUrl } from './useVideoCatalog';

const SAVE_INTERVAL_MS = 10_000; // 10s debounce
const REFRESH_AT_MS = 3 * 60 * 60 * 1000; // 3 hours

interface UseWatchProgressOptions {
  videoId: string;
  durationSeconds: number;
  signedUrl?: string;
  onUrlRefreshed?: (newUrl: string) => void;
  onRefreshFailed?: (error: Error) => void;
}

export function useWatchProgress({
  videoId,
  durationSeconds,
  signedUrl,
  onUrlRefreshed,
  onRefreshFailed,
}: UseWatchProgressOptions) {
  const saveProgress = useSaveProgress();
  const refreshUrl = useRefreshUrl();
  const lastSavedRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Save progress (debounced)
  const reportProgress = useCallback(
    (currentTime: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const rounded = Math.floor(currentTime);
        if (rounded === lastSavedRef.current) return;
        lastSavedRef.current = rounded;

        saveProgress.mutate({
          videoId,
          progressSeconds: rounded,
          durationSeconds,
        });
      }, SAVE_INTERVAL_MS);
    },
    [videoId, durationSeconds, saveProgress]
  );

  // Signed URL refresh at 3h mark
  useEffect(() => {
    if (!signedUrl) return;
    startTimeRef.current = Date.now();

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const result = await refreshUrl.mutateAsync(videoId);
        onUrlRefreshed?.(result.signedUrl);
      } catch (err: any) {
        onRefreshFailed?.(err);
      }
    }, REFRESH_AT_MS);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [videoId, signedUrl, refreshUrl, onUrlRefreshed, onRefreshFailed]);

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { reportProgress };
}
