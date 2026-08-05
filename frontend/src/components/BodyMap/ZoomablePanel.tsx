/**
 * ============================================================================
 * FILE: ZoomablePanel.tsx
 * PURPOSE: Per-panel pinch/pan/zoom wrapper for the body-map views
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-04 (Pain-Chart Slice 3)
 * ============================================================================
 * Fixes carried from the hostile audit:
 *  - B2: each panel owns its OWN zoom state (pinching Front no longer zooms
 *    Back — one shared scale/translate used to drive both).
 *  - B3: `touch-action: pan-y` — vertical page scroll works over the figure;
 *    two-finger pinch is captured via a NATIVE non-passive listener (React 17+
 *    root listeners are passive, so preventDefault in synthetic handlers
 *    can't stop browser zoom).
 *  - B4: visible zoom affordances (+ / − / reset, 44px) replace the
 *    undiscoverable pinch/double-tap-only interaction (both still work).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const MAX_SCALE = 5;
const MIN_SCALE = 1;
const STEP = 0.5;

const Container = styled.div`
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
  border-radius: 12px;
`;

const Content = styled.div<{ $scale: number; $x: number; $y: number; $isPinching: boolean }>`
  transform: ${({ $scale, $x, $y }) => `scale(${$scale}) translate(${$x / $scale}px, ${$y / $scale}px)`};
  transform-origin: center center;
  transition: ${({ $isPinching }) => ($isPinching ? 'none' : 'transform 0.2s ease-out')};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Controls = styled.div`
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 2;
`;

const ZoomButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(64, 112, 192, 0.35));
  background: var(--bg-elevated, rgba(0, 32, 96, 0.85));
  color: var(--text-primary, #E0ECF4);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover:not(:disabled) { border-color: var(--glow-accent, #8B5CF6); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.4; cursor: default; }
`;

interface ZoomablePanelProps {
  label: string;
  children: React.ReactNode;
}

const ZoomablePanel: React.FC<ZoomablePanelProps> = ({ label, children }) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const lastTapRef = useRef(0);
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  scaleRef.current = scale;
  translateRef.current = translate;

  const reset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const stepZoom = useCallback((delta: number) => {
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
      if (next <= 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Native non-passive touch handlers: pinch must preventDefault to stop the
  // browser's own page zoom, which React's passive root listeners cannot do.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { startDist: Math.hypot(dx, dy), startScale: scaleRef.current };
        setIsPinching(true);
      } else if (e.touches.length === 1) {
        if (scaleRef.current > 1) {
          panRef.current = {
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            startTx: translateRef.current.x,
            startTy: translateRef.current.y,
          };
        }
        const now = Date.now();
        if (now - lastTapRef.current < 300) reset();
        lastTapRef.current = now;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
        setScale(next);
        if (next <= 1) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && panRef.current && scaleRef.current > 1) {
        e.preventDefault(); // panning a zoomed figure, not scrolling the page
        const dx = e.touches[0].clientX - panRef.current.startX;
        const dy = e.touches[0].clientY - panRef.current.startY;
        const maxPan = (scaleRef.current - 1) * 150;
        setTranslate({
          x: Math.min(maxPan, Math.max(-maxPan, panRef.current.startTx + dx)),
          y: Math.min(maxPan, Math.max(-maxPan, panRef.current.startTy + dy)),
        });
      }
    };

    const onTouchEnd = () => {
      pinchRef.current = null;
      panRef.current = null;
      setIsPinching(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [reset]);

  return (
    <Container ref={containerRef}>
      <Content $scale={scale} $x={translate.x} $y={translate.y} $isPinching={isPinching}>
        {children}
      </Content>
      <Controls>
        <ZoomButton type="button" aria-label={`Zoom in on ${label}`} disabled={scale >= MAX_SCALE} onClick={() => stepZoom(STEP)}>+</ZoomButton>
        <ZoomButton type="button" aria-label={`Zoom out of ${label}`} disabled={scale <= MIN_SCALE} onClick={() => stepZoom(-STEP)}>−</ZoomButton>
        <ZoomButton type="button" aria-label={`Reset ${label} zoom`} disabled={scale === 1} onClick={reset}>⟲</ZoomButton>
      </Controls>
    </Container>
  );
};

export default ZoomablePanel;
