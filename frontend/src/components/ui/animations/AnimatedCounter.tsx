/**
 * AnimatedCounter — Number that counts up when scrolled into view
 * ================================================================
 * Triggers count-up animation when the element enters the viewport.
 * Supports suffix ("+", "%", "k") and prefix ("$").
 * Essential tier shows final value immediately.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import styled from 'styled-components';

const CounterSpan = styled.span`
  font-variant-numeric: tabular-nums;
  display: inline-block;
`;

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  /** Skip animation — show final value immediately */
  skipAnimation?: boolean;
  /**
   * Render the FINAL value in the initial DOM and animate toward it once the
   * counter scrolls into view.
   *
   * Without this, the count-up starts at 0 and is gated on useInView — so every
   * consumer that never intersects (a crawler, a link-preview bot, a print
   * stylesheet, a no-JS reader, a stuck observer) reads "0+ Years Experience"
   * and "0% Client Satisfaction". Animating decoration is fine; animating the
   * CLAIM is not. Consumers rendering real marketing numbers pass seedFinal.
   */
  seedFinal?: boolean;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  target,
  prefix = '',
  suffix = '',
  duration = 2500,
  skipAnimation = false,
  seedFinal = false,
  className,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(seedFinal ? target : 0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;

    if (skipAnimation) {
      setValue(target);
      hasAnimated.current = true;
      return;
    }

    hasAnimated.current = true;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration, skipAnimation]);

  return (
    <CounterSpan ref={ref} className={className}>
      {prefix}{value.toLocaleString()}{suffix}
    </CounterSpan>
  );
};

export default AnimatedCounter;
