// frontend/src/components/ui/backgrounds/ParallaxImageBackground.tsx

import React, { useRef } from 'react';
import styled from 'styled-components';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface ParallaxImageBackgroundProps {
  /** Image source (imported asset or URL) */
  src: string;
  /** Overlay opacity (0-1) for text readability */
  overlayOpacity?: number;
  /** Custom overlay gradient CSS */
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
  inset: -15% 0;
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
  background: ${({ $gradient, $opacity }) =>
    $gradient || `rgba(10, 10, 26, ${$opacity})`};

  ${({ $gradient, $opacity }) =>
    $gradient && $opacity < 1
      ? `opacity: ${$opacity};`
      : ''}
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
 * - Scroll-linked Y movement via framer-motion useScroll + useTransform
 * - Image scaled 130% (inset -15%) to prevent edge gaps during parallax
 * - Spring-smoothed for buttery 60fps feel
 * - Respects prefers-reduced-motion (falls back to static)
 * - Mobile: static background (no parallax) for performance
 * - Configurable overlay for text readability
 */
export const ParallaxImageBackground: React.FC<ParallaxImageBackgroundProps> = ({
  src,
  overlayOpacity = 0.7,
  overlayGradient,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Scroll-linked parallax
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Map scroll progress to Y offset: moves image -40px to +40px
  const rawY = useTransform(scrollYProgress, [0, 1], [-40, 40]);

  // Spring-smooth the motion for premium feel
  const y = useSpring(rawY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const shouldDisableParallax = prefersReducedMotion || isMobile;

  const imageLayer = shouldDisableParallax ? (
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
