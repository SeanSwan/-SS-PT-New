import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  cursorChar?: string;
  onComplete?: () => void;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
}

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const Cursor = styled.span`
  animation: ${blink} 1s step-end infinite;
  font-weight: 100;
`;

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  delay = 0,
  cursor = true,
  cursorChar = '|',
  onComplete,
  as: Tag = 'span',
  className,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView || hasStarted) return;

    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const startTimeout = setTimeout(() => {
      setHasStarted(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayedText(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [isInView, text, speed, delay, onComplete, prefersReducedMotion, hasStarted]);

  return (
    <Tag ref={ref as any} className={className}>
      {prefersReducedMotion ? text : displayedText}
      {cursor && !isComplete && !prefersReducedMotion && (
        <Cursor>{cursorChar}</Cursor>
      )}
    </Tag>
  );
};

export default TypewriterText;
