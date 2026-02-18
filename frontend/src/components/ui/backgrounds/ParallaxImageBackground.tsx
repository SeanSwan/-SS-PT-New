// frontend/src/components/ui/backgrounds/ParallaxImageBackground.tsx

import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface ParallaxImageBackgroundProps {
  /** Image source (imported asset or URL) */
  src: string;
  /** Overlay opacity (0-1) for text readability */
  overlayOpacity?: number;
  /** Custom overlay gradient CSS (alpha values control opacity — no extra opacity stacking) */
  overlayGradient?: string;
  /** Children rendered on top of the parallax. If omitted, renders as absolute background. */
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

const ParallaxLayer = styled(motion.div)`
  position: absolute;
  inset: -20% 0;
  z-index: 0;
  will-change: transform;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const StaticLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
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
 * ParallaxImageBackground
 *
 * 3D parallax image background for homepage sections.
 * Two modes:
 * - **Wrapper mode** (with children): Renders as relative container with content on top
 * - **Background mode** (no children): Renders as absolute overlay inside parent section
 *
 * Features:
 * - Window-scroll-based parallax (reliable across CSS positioning contexts)
 * - Reads parent element bounds for accurate scroll range calculation
 * - Image scaled 140% (inset -20%) to prevent edge gaps during ±100px travel
 * - Spring-smoothed for buttery 60fps feel
 * - Respects prefers-reduced-motion (falls back to static)
 * - Configurable overlay — gradient alpha controls opacity, no double-stacking
 */
export const ParallaxImageBackground: React.FC<ParallaxImageBackgroundProps> = ({
  src,
  overlayOpacity = 0.55,
  overlayGradient,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Window scroll — works regardless of the element's CSS position
  const { scrollY } = useScroll();

  // Compute parent element's scroll range once mounted (and on resize)
  const [elementRange, setElementRange] = useState<[number, number]>([0, 1000]);

  useEffect(() => {
    const updateBounds = () => {
      const el = containerRef.current;
      if (!el) return;
      // For background mode (position:absolute inset:0), use parentElement for bounds
      const target = (el.offsetParent as HTMLElement) ?? el.parentElement ?? el;
      const rect = target.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const height = target.offsetHeight;
      const vh = window.innerHeight;
      // Range: element enters viewport bottom → exits viewport top
      setElementRange([top - vh, top + height]);
    };

    updateBounds();
    // Small delay to account for fonts/images shifting layout
    const t = setTimeout(updateBounds, 150);
    window.addEventListener('resize', updateBounds);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  // Map scrollY → Y offset: ±100px — clearly visible, premium feel
  const rawY = useTransform(scrollY, elementRange, [-100, 100]);

  // Spring-smooth for buttery motion
  const y = useSpring(rawY, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  const imageLayer = prefersReducedMotion ? (
    <StaticLayer>
      <img src={src} alt="" loading="lazy" />
    </StaticLayer>
  ) : (
    <ParallaxLayer style={{ y }}>
      <img src={src} alt="" loading="lazy" />
    </ParallaxLayer>
  );

  const layers = (
    <>
      {imageLayer}
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

export default ParallaxImageBackground;
