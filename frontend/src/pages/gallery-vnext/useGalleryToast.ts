/**
 * Gallery vNext — toast state. Timing mirrors the shipped GalleryPage verbatim
 * (GalleryPage.tsx:1265-1274): 4000ms visible, then a 400ms exit animation before unmount.
 * Timers are cleared on re-show and on unmount (the monolith leaked one on rapid re-show).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MESSAGE = 'Sean gifted you 3 Enhancement Passes!';

export interface GalleryToast {
  message: string;
  visible: boolean;
  exiting: boolean;
  showToast(next?: string): void;
  dismiss(): void;
}

export function useGalleryToast(): GalleryToast {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    holdTimer.current = null;
    exitTimer.current = null;
  }, []);

  const showToast = useCallback(
    (next: string = DEFAULT_MESSAGE) => {
      clearTimers();
      setMessage(next);
      setVisible(true);
      setExiting(false);
      holdTimer.current = setTimeout(() => {
        setExiting(true);
        exitTimer.current = setTimeout(() => setVisible(false), 400);
      }, 4000);
    },
    [clearTimers],
  );

  const dismiss = useCallback(() => {
    clearTimers();
    setExiting(true);
    exitTimer.current = setTimeout(() => setVisible(false), 400);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { message, visible, exiting, showToast, dismiss };
}
