/**
 * AboutStyles — Shared styled components for About page sections
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const SectionEl = styled.section<{ $alt?: boolean }>`
  position: relative;
  width: 100%;
  padding: clamp(4rem, 10vw, 7rem) clamp(1rem, 5vw, 2rem);
  overflow: hidden;
  background: ${({ $alt }) =>
    $alt ? 'var(--bg-surface, #1A1A24)' : 'var(--bg-base, #0A0A0F)'};

  @media (max-width: 320px) { padding: 2.5rem 0.75rem; }
  @media (min-width: 2560px) { padding: 9rem 4rem; }
  @media (min-width: 3840px) { padding: 11rem 6rem; }
`;

export const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 10;

  @media (min-width: 2560px) { max-width: 1600px; }
  @media (min-width: 3840px) { max-width: 2200px; }
`;

export const SectionHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: clamp(2rem, 5vw, 3.5rem);
`;

export const SectionTitle = styled.h2`
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(1.8rem, 4vw, 2.75rem);
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  text-align: center;
  margin: 0 0 0.75rem;
  line-height: 1.15;

  @media (max-width: 320px) { font-size: 1.4rem; }
  @media (min-width: 2560px) { font-size: 3.5rem; }
  @media (min-width: 3840px) { font-size: 4.5rem; }
`;

export const AccentLine = styled.div`
  width: 60px;
  height: 3px;
  margin: 0.5rem auto 1.5rem;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  border-radius: 2px;

  @media (min-width: 2560px) { width: 90px; height: 4px; }
  @media (min-width: 3840px) { width: 120px; height: 5px; }
`;

export const SectionSubtitle = styled.p`
  font-size: clamp(0.9rem, 2vw, 1.125rem);
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;

  @media (max-width: 320px) { font-size: 0.85rem; max-width: 280px; }
  @media (min-width: 2560px) { font-size: 1.4rem; max-width: 900px; }
  @media (min-width: 3840px) { font-size: 1.75rem; max-width: 1200px; }
`;
