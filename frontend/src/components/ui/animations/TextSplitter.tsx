/**
 * TextSplitter — Split text into chars/words with stagger animation
 * ===================================================================
 * Animates text by splitting into individual characters or words,
 * each with a staggered entrance. Full tier gets char-level animation,
 * balanced gets word-level, essential gets no split (immediate render).
 */

import React from 'react';
import { motion } from 'framer-motion';

interface TextSplitterProps {
  text: string;
  mode?: 'chars' | 'words';
  staggerDelay?: number;
  duration?: number;
  /** Skip animation entirely */
  skipAnimation?: boolean;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
}

const containerVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger,
      delayChildren: 0.1,
    },
  }),
};

const charVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const TextSplitter: React.FC<TextSplitterProps> = ({
  text,
  mode = 'chars',
  staggerDelay = 0.03,
  duration = 0.5,
  skipAnimation = false,
  className,
  as = 'span',
}) => {
  if (skipAnimation) {
    const Tag = as;
    return <Tag className={className}>{text}</Tag>;
  }

  const items = mode === 'chars' ? text.split('') : text.split(' ');

  const MotionTag = motion[as] as typeof motion.span;

  return (
    <MotionTag
      className={className}
      style={{ display: 'inline' }}
      variants={containerVariants}
      custom={staggerDelay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
    >
      {items.map((item, i) => (
        <motion.span
          key={i}
          variants={charVariants}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {mode === 'words' && i > 0 ? ` ${item}` : item}
        </motion.span>
      ))}
    </MotionTag>
  );
};

export default TextSplitter;
