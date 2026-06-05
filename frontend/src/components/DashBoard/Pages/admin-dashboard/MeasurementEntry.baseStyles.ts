/**
 * ============================================================================
 * FILE: MeasurementEntry.baseStyles.ts
 * PURPOSE: Base layout, panel, text, grid, loading, and stat styles.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Owns reusable MeasurementEntry chrome that is shared across the form,
 * history, chart, and body-map regions.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry imports these atoms while form, modal, and chart styles
 * continue to be extracted in smaller follow-up slices.
 */

import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const PageWrapper = styled(motion.div)`
  padding: 16px;
  @media (min-width: 768px) {
    padding: 32px;
  }

  @media (min-width: 2560px) {
    padding: 40px;
    max-width: 2200px;
    margin: 0 auto;
  }

  @media (min-width: 3840px) {
    padding: 56px;
    max-width: 3000px;
  }
`;

export const GlassPanel = styled(motion.div)`
  padding: 16px;
  margin-bottom: 24px;
  background: var(--bg-surface, #141419);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  @media (min-width: 768px) {
    padding: 24px;
  }
`;

export const DarkPanel = styled.div`
  padding: 16px;
  background: var(--bg-card, #0A0A0F);
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--accent-secondary, #8B5CF6);
  margin: 0 0 16px 0;
`;

export const SubsectionTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 12px 0;
`;

export const FieldLabel = styled.span`
  font-size: 0.95rem;
  text-transform: capitalize;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  margin-bottom: 4px;
`;

export const BodyText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 0.9rem;
`;

export const ResponsiveGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const MeasurementGrid = styled.div`
  display: grid;
  gap: clamp(12px, 3vw, 24px);
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

export const PhotoGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

export const FlexRow = styled.div<{ $gap?: number; $relative?: boolean; $centerWrap?: boolean }>`
  display: flex;
  gap: ${({ $gap }) => $gap ?? 8}px;
  align-items: center;
  position: ${({ $relative }) => ($relative ? 'relative' : 'static')};
  justify-content: ${({ $centerWrap }) => ($centerWrap ? 'center' : 'flex-start')};
  flex-wrap: ${({ $centerWrap }) => ($centerWrap ? 'wrap' : 'nowrap')};
`;

export const FlexStack = styled.div<{ $gap?: number; $field?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? 8}px;
  margin-top: ${({ $field }) => ($field ? '12px' : 0)};
  flex: ${({ $field }) => ($field ? 1 : 'initial')};
`;

export const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(139, 92, 246, 0.15);
  border-top-color: #8B5CF6;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 24px auto;
`;

export const SaveWrapper = styled.div`
  margin-top: 24px;
  text-align: right;
`;

export const ChangeCenter = styled.div`
  text-align: center;
  padding-top: 8px;
`;

export const CenteredStatsRow = styled(FlexRow)`
  margin-top: 8px;
`;

export const AccentStat = styled.span`
  color: var(--accent-secondary, #8B5CF6);
`;
