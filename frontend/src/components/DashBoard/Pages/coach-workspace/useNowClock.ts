/**
 * FILE: useNowClock.ts
 * PURPOSE: "Now" for the Day Sheet, so the now-line and "Up next" move with the
 * clock instead of waiting for an unrelated render.
 *
 * Ticks on each minute boundary (sessions start and end on minutes, so the view
 * turns over within the minute it should), and again when the tab becomes
 * visible or the window regains focus (a laptop waking up). One timer per
 * mounted view; nothing runs while it is unmounted.
 */
import { useEffect, useState } from 'react';

const MINUTE = 60_000;

export function useNowClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => { setNow(Date.now()); schedule(); }, MINUTE - (Date.now() % MINUTE) + 50);
    };
    const wake = () => { if (document.visibilityState !== 'hidden') setNow(Date.now()); };
    schedule();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
  }, []);
  return now;
}
