/**
 * ScrollReveal — Scroll-triggered fade/slide/scale reveals
 * ==========================================================
 * Wraps any element for viewport-triggered entrance animations.
 * Supports direction, blur, scale, and stagger delay.
 * Tier-aware: essential tier renders children immediately without animation.
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { StyledBox } from '@/components/ui/StyledBox';

const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  distance?: number;
  duration?: number;
  once?: boolean;
  /** Add blur entrance effect */
  blur?: boolean;
  /** Add scale entrance (0.95 → 1) */
  scale?: boolean;
  /** Use cinematic weighted easing */
  cinematic?: boolean;
  /** Skip animation entirely (essential tier) */
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const directionOffset = (direction: string, distance: number) => {
  switch (direction) {
    case 'up': return { x: 0, y: distance };
    case 'down': return { x: 0, y: -distance };
    case 'left': return { x: distance, y: 0 };
    case 'right': return { x: -distance, y: 0 };
    case 'none': return { x: 0, y: 0 };
    default: return { x: 0, y: distance };
  }
};

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  distance = 40,
  duration = 0.8,
  once = true,
  blur = false,
  scale = false,
  cinematic = true,
  disabled = false,
  className,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || disabled) {
    return <StyledBox as="div" className={className} $style={style}>{children}</StyledBox>;
  }

  const offset = directionOffset(direction, distance);
  const ease = cinematic ? CINEMATIC_EASE : [0.25, 0.46, 0.45, 0.94];

  const hidden: Record<string, unknown> = {
    opacity: 0,
    x: offset.x,
    y: offset.y,
  };

  const visible: Record<string, unknown> = {
    opacity: 1,
    x: 0,
    y: 0,
  };

  if (blur) {
    hidden.filter = 'blur(12px)';
    visible.filter = 'blur(0px)';
  }

  if (scale) {
    hidden.scale = 0.95;
    visible.scale = 1;
  }

  return (
    <StyledBox as={motion.div}
      ref={ref}
      className={className}
      $style={style}
      initial={hidden}
      animate={isInView ? visible : hidden}
      transition={{ duration, delay, ease }}
    >
      {children}
    </StyledBox>
  );
};

export default ScrollReveal;
