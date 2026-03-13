/**
 * VideoFadeWrapper
 * ================
 * Centralized wrapper that prevents the "flash" when video backgrounds load.
 *
 * How it works:
 * 1. Shows an animated Crystalline Swan gradient pulse while video loads
 * 2. Video starts at opacity 0
 * 3. On `canplaythrough` event, video fades in smoothly
 * 4. Gradient pulse fades out simultaneously
 *
 * Usage:
 *   <VideoFadeWrapper src="/swan.mp4" />
 *   — or with children for overlay content —
 *   <VideoFadeWrapper src="/swan.mp4" overlayGradient="...">
 *     <YourContent />
 *   </VideoFadeWrapper>
 */

import React, { useRef, useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

export interface VideoFadeWrapperProps {
  /** Video source URL */
  src: string;
  /** Additional video props (poster, className, etc.) */
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
  /** CSS for the gradient fallback shown while loading */
  fallbackGradient?: string;
  /** Callback when video is ready */
  onReady?: () => void;
}

const crystallinePulse = keyframes`
  0% {
    background-position: 0% 50%;
    opacity: 1;
  }
  50% {
    background-position: 100% 50%;
    opacity: 0.85;
  }
  100% {
    background-position: 0% 50%;
    opacity: 1;
  }
`;

const GradientPulse = styled.div<{ $ready: boolean; $gradient: string }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  background: ${({ $gradient }) => $gradient};
  background-size: 300% 300%;
  animation: ${crystallinePulse} 4s ease-in-out infinite;
  opacity: ${({ $ready }) => ($ready ? 0 : 1)};
  transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const FadeVideo = styled.video<{ $ready: boolean }>`
  opacity: ${({ $ready }) => ($ready ? 1 : 0)};
  transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity;
`;

/**
 * useVideoFadeIn — hook for pages that need fine-grained control
 * Returns { videoRef, isReady, videoProps } to spread onto a <video> element.
 */
export function useVideoFadeIn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleReady = () => setIsReady(true);

    // If video is already loaded (cached), mark ready immediately
    if (video.readyState >= 4) {
      setIsReady(true);
      return;
    }

    video.addEventListener('canplaythrough', handleReady);
    return () => video.removeEventListener('canplaythrough', handleReady);
  }, []);

  return {
    videoRef,
    isReady,
    fadeStyle: {
      opacity: isReady ? 1 : 0,
      transition: 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
    } as React.CSSProperties,
  };
}

/**
 * VideoFadeWrapper component — drop-in replacement for raw <video> elements.
 * Renders a pulsing gradient behind the video, fading in the video when ready.
 */
export const VideoFadeWrapper: React.FC<VideoFadeWrapperProps> = ({
  src,
  videoProps = {},
  fallbackGradient = 'linear-gradient(135deg, #002060 0%, #003080 30%, #002060 60%, #1a1a3c 100%)',
  onReady,
}) => {
  const { videoRef, isReady } = useVideoFadeIn();

  useEffect(() => {
    if (isReady && onReady) onReady();
  }, [isReady, onReady]);

  return (
    <>
      <GradientPulse $ready={isReady} $gradient={fallbackGradient} />
      <FadeVideo
        ref={videoRef}
        $ready={isReady}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        {...videoProps}
      >
        <source src={src} type="video/mp4" />
      </FadeVideo>
    </>
  );
};

export default VideoFadeWrapper;
