// frontend/src/components/ui/backgrounds/SectionVideoBackground.tsx

import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useInView } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface SectionVideoBackgroundProps {
  /** Video source URL (should be in /public for streaming) */
  src: string;
  /** Fallback CSS gradient when video can't play */
  fallbackGradient?: string;
  /** Overlay opacity (0-1) for text readability */
  overlayOpacity?: number;
  /** Custom overlay gradient CSS */
  overlayGradient?: string;
  /** Children rendered on top of the video. If omitted, renders as absolute background. */
  children?: React.ReactNode;
  /** Optional className for styled-components extension */
  className?: string;
}

/* Wrapper mode: relative positioned, children on top */
const Container = styled.div`
  position: relative;
  overflow: hidden;
`;

/* Background mode: absolute positioned, covers parent */
const BackgroundContainer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
`;

const VideoLayer = styled.video<{ $isVisible: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  transform: translate(-50%, -50%);
  object-fit: cover;
  z-index: 0;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 1.2s ease-in-out;
  will-change: opacity;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const FallbackLayer = styled.div<{ $gradient: string }>`
  position: absolute;
  inset: 0;
  background: ${({ $gradient }) => $gradient};
  z-index: 0;
`;

const Overlay = styled.div<{ $opacity: number; $gradient?: string }>`
  position: absolute;
  inset: 0;
  z-index: 1;
  /* When gradient provided, its rgba alpha values control transparency.
     No extra opacity stacking to avoid doubly-dark overlays. */
  background: ${({ $gradient, $opacity }) =>
    $gradient || `rgba(10, 10, 26, ${$opacity})`};
`;

const Content = styled.div`
  position: relative;
  z-index: 2;
`;

/**
 * SectionVideoBackground
 *
 * Performance-gated video background for homepage sections.
 * Two modes:
 * - **Wrapper mode** (with children): Renders as relative container with content on top
 * - **Background mode** (no children): Renders as absolute overlay inside parent section
 *
 * Features:
 * - Lazy-loads video (only plays when in viewport via IntersectionObserver)
 * - Respects prefers-reduced-motion (shows gradient fallback)
 * - Device capability detection (skips video on save-data, 2G, low cores)
 * - Configurable overlay for text readability
 */
export const SectionVideoBackground: React.FC<SectionVideoBackgroundProps> = ({
  src,
  fallbackGradient = 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3c 100%)',
  overlayOpacity = 0.6,
  overlayGradient,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(containerRef, { margin: '200px', once: false });
  const prefersReducedMotion = useReducedMotion();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Detect if device can handle video (simple heuristic)
  const [canPlayVideo] = useState(() => {
    if (typeof window === 'undefined') return false;
    const nav = navigator as any;
    if (nav.connection?.saveData) return false;
    if (nav.connection?.effectiveType === '2g') return false;
    if (nav.hardwareConcurrency && nav.hardwareConcurrency < 2) return false;
    return true;
  });

  const shouldShowVideo = canPlayVideo && !prefersReducedMotion && !videoError;

  // Play/pause based on viewport visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldShowVideo) return;

    if (isInView) {
      video.play().catch(() => {
        setVideoError(true);
      });
    } else {
      video.pause();
    }
  }, [isInView, shouldShowVideo]);

  const layers = (
    <>
      <FallbackLayer $gradient={fallbackGradient} />
      {shouldShowVideo && (
        <VideoLayer
          ref={videoRef}
          $isVisible={videoLoaded}
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
        >
          <source src={src} type="video/mp4" />
        </VideoLayer>
      )}
      <Overlay $opacity={overlayOpacity} $gradient={overlayGradient} />
    </>
  );

  // Background mode: no children → render as absolute overlay
  if (!children) {
    return (
      <BackgroundContainer ref={containerRef} className={className}>
        {layers}
      </BackgroundContainer>
    );
  }

  // Wrapper mode: children → render as relative container
  return (
    <Container ref={containerRef} className={className}>
      {layers}
      <Content>{children}</Content>
    </Container>
  );
};

export default SectionVideoBackground;
