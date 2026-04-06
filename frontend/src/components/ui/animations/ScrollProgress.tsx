/**
 * ScrollProgress — Thin progress bar at top of page
 * ===================================================
 * Shows scroll progress as a thin gradient bar fixed to viewport top.
 * Uses framer-motion useScroll for GPU-accelerated, zero-layout-shift tracking.
 * Respects animation tier — hidden on essential tier.
 */

import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import styled from 'styled-components';

const ProgressBar = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--accent-purple, #8B5CF6) 0%,
    var(--accent-cyan, #60C0F0) 50%,
    var(--accent-gold, #C6A84B) 100%
  );
  transform-origin: 0%;
  z-index: 10000;
  pointer-events: none;
`;

interface ScrollProgressProps {
  enabled?: boolean;
}

const ScrollProgress: React.FC<ScrollProgressProps> = ({ enabled = true }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (!enabled) return null;

  return <ProgressBar style={{ scaleX }} />;
};

export default ScrollProgress;
