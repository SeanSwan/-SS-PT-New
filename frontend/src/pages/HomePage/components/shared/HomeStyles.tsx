/**
 * HomeStyles — Shared styled components for homepage sections
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { sanitizeImageUrl, cssUrlValue } from '../../../../utils/imageUrl';

export const SectionEl = styled.section`
  position: relative;
  width: 100%;
  padding: clamp(4rem, 10vw, 8rem) clamp(1rem, 5vw, 2rem);
  overflow: hidden;
  background-color: ${({ theme }) => theme.background?.primary || '#002060'};

  @media (max-width: 320px) { padding: 3rem 0.75rem; }
  @media (min-width: 2560px) { padding: 10rem 4rem; }
  @media (min-width: 3840px) { padding: 12rem 6rem; }
`;

export const Container = styled.div`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 10;

  @media (min-width: 2560px) { max-width: 1920px; }
  @media (min-width: 3840px) { max-width: 2800px; }
`;

export const SectionHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: clamp(2rem, 5vw, 4rem);
`;

export const SectionTitle = styled.h2`
  font-size: clamp(1.5rem, 4vw, 3.5rem);
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  line-height: 1.1;

  @media (max-width: 320px) { font-size: 1.375rem; }
  @media (min-width: 2560px) { font-size: 4rem; }
  @media (min-width: 3840px) { font-size: 5rem; }
`;

export const SectionSubtitle = styled.p`
  font-size: clamp(0.875rem, 2vw, 1.25rem);
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.7)'};
  margin: 0 auto;
  max-width: 680px;
  line-height: 1.6;

  @media (max-width: 320px) { font-size: 0.8125rem; line-height: 1.5; }
  @media (min-width: 2560px) { font-size: 1.5rem; max-width: 900px; }
  @media (min-width: 3840px) { font-size: 1.75rem; max-width: 1200px; }
`;

export const ParallaxBg = styled(motion.div)<{ $bgImage: string; $opacity?: number }>`
  position: absolute;
  top: -20%;
  left: 0;
  width: 100%;
  height: 140%;
  background-image: ${({ $bgImage }) => {
    const safe = sanitizeImageUrl($bgImage);
    return safe ? `url(${cssUrlValue(safe)})` : 'none';
  }};
  background-size: cover;
  background-position: center;
  opacity: ${({ $opacity }) => $opacity ?? 0.4};
  z-index: 0;
  pointer-events: none;
`;

export const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(96, 192, 240, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors?.primary || '#8B5CF6'};
  transition: all 0.4s ease;
`;

export const FeatureTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  margin: 0 0 12px;

  @media (max-width: 320px) { font-size: 1rem; }
  @media (min-width: 2560px) { font-size: 1.375rem; }
  @media (min-width: 3840px) { font-size: 1.5rem; }
`;

export const FeatureDesc = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
  line-height: 1.6;
  margin: 0;

  @media (max-width: 320px) { font-size: 0.8125rem; }
  @media (min-width: 2560px) { font-size: 1rem; }
  @media (min-width: 3840px) { font-size: 1.125rem; }
`;
