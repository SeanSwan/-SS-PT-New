/**
 * Responsive layout primitives for the public storefront grids.
 *
 * Extracted from PackagesGrid so product-section logic stays small while the
 * visual system remains shared by training packages and physical products.
 */

import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

export const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  font-family: var(--font-ui, "Sora", sans-serif);

  @media (min-width: 2560px) {
    max-width: 1760px;
  }

  @media (min-width: 3840px) {
    max-width: 1960px;
  }

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }

  @media (max-width: 480px) {
    padding: 2.5rem 0.75rem;
  }
`;

export const PackageSection = styled(motion.section)`
  margin-bottom: 5rem;

  @media (max-width: 768px) {
    margin-bottom: 3rem;
  }
`;

export const SectionTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 3rem;
  font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif);
  font-size: 2.8rem;
  font-weight: 600;
  font-style: italic;
  position: relative;
  padding-bottom: 20px;
  width: 100%;
  background: linear-gradient(
    135deg,
    var(--text-heading, #E0ECF4) 0%,
    var(--accent-primary, #60C0F0) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  ${noMotion}

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 2px;
    background: linear-gradient(
      90deg,
      var(--accent-primary, #60C0F0),
      var(--accent-secondary, #8B5CF6)
    );
    border-radius: 1px;
  }

  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 2rem;
  }
`;

export const GalaxyGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 15;

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 2560px) {
    max-width: 1680px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (min-width: 900px) and (max-width: 1199px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: min(100%, 460px);
    margin: 0 auto;
    padding: 12px 0;
  }

  @media (max-width: 430px) {
    gap: 18px;
    padding: 10px 0;
  }
`;

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

export const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.05,
    },
  },
};
