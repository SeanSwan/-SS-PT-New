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

  const MotionTag = motion[as] as typeof motion.span;

  // Launch M.2 sweep catch (2026-07-07): naked inline-block char spans wrap
  // INDEPENDENTLY — the hero rendered "Community Al / ways." on the #1 US
  // viewport (414px). Chars now live inside per-WORD nowrap groups, so line
  // breaks only happen between words while the per-char stagger cadence
  // continues across the whole string.
  if (mode === 'chars') {
    const words = text.split(' ');
    let charIndex = 0;
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
        {words.map((word, w) => (
          <React.Fragment key={`${word}-${w}`}>
            <span data-word style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {word.split('').map((ch) => {
                const idx = charIndex;
                charIndex += 1;
                return (
                  <motion.span key={idx} variants={charVariants} style={{ display: 'inline-block' }}>
                    {ch}
                  </motion.span>
                );
              })}
            </span>
            {w < words.length - 1 ? ' ' : null}
          </React.Fragment>
        ))}
      </MotionTag>
    );
  }

  const items = text.split(' ');
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
          {i > 0 ? ` ${item}` : item}
        </motion.span>
      ))}
    </MotionTag>
  );
};

export default TextSplitter;
