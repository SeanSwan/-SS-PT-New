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
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  target,
  prefix = '',
  suffix = '',
  duration = 2500,
  skipAnimation = false,
  className,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(0);
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
