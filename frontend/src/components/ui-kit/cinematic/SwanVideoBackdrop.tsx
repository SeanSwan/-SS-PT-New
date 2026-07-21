/**
 * SwanVideoBackdrop — reusable cinematic video backdrop (back-most layer, z-index 0). Shared by the home
 * and contact heroes so the production-safe video behaviour lives in ONE place:
 *  - plays via the muted PROPERTY, not the React attribute (React's muted-attribute bug blocks autoplay);
 *  - falls back to the poster still if autoplay is rejected (iOS Low-Power) or on data-saver / 2g (no fetch);
 *  - pauses offscreen (IntersectionObserver on the host) and on tab-hide (visibilitychange) — no 1080p decode
 *    behind the footer, no battery/thermal drain;
 *  - dim gradient carries a plain rgba fallback before color-mix so contrast can't fail on older browsers.
 * Decorative (aria-hidden). Token-with-fallback per Rule 6.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import styled from 'styled-components';

const VideoWrap = styled.div<{ $brightness: number }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(${(p) => p.$brightness}) saturate(1.06);
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(10, 10, 15, 0.3), rgba(10, 10, 15, 0.62)); /* fallback if color-mix unsupported */
    background: linear-gradient(
      180deg,
      color-mix(in oklab, #0a0a0f 28%, transparent),
      color-mix(in oklab, #0a0a0f 60%, transparent)
    );
  }
`;
const Poster = styled.div<{ $poster: string; $brightness: number }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  background: url(${(p) => p.$poster}) center / cover no-repeat, #0a0a0f;
  filter: brightness(${(p) => p.$brightness});
`;

interface Props {
  active: boolean; // false (reduced-motion / essential tier) → poster still, no video
  videoSrc: string;
  poster: string;
  hostRef?: RefObject<HTMLElement | null>; // observed to pause the video when the hero scrolls offscreen
  brightness?: number;
}

export function SwanVideoBackdrop({ active, videoSrc, poster, hostRef, brightness = 0.52 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [off, setOff] = useState(false);

  // data-saver / 2g → never fetch the video
  useEffect(() => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) setOff(true);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!active || off || !v) return;
    v.muted = true;
    (v as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true;
    const tryPlay = () => { v.play().catch(() => setOff(true)); };
    tryPlay();
    const host = hostRef?.current;
    let io: IntersectionObserver | undefined;
    if (host) {
      io = new IntersectionObserver(([e]) => { if (!e) return; if (e.isIntersecting) tryPlay(); else v.pause(); }, { threshold: 0.01 });
      io.observe(host);
    }
    const onVis = () => { if (document.hidden) v.pause(); else tryPlay(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { io?.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [active, off, hostRef]);

  if (!active || off) return <Poster $poster={poster} $brightness={brightness} aria-hidden="true" />;
  return (
    <VideoWrap $brightness={brightness} aria-hidden="true">
      <video ref={videoRef} muted loop playsInline preload="metadata" poster={poster} disablePictureInPicture>
        <source src={videoSrc} type="video/mp4" />
      </video>
    </VideoWrap>
  );
}
