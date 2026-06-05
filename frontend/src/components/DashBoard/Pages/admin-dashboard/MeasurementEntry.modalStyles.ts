/**
 * ============================================================================
 * FILE: MeasurementEntry.modalStyles.ts
 * PURPOSE: Detail modal and progress-photo media style atoms.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Owns MeasurementEntry photo preview and detail modal chrome so the active
 * biometrics shell can focus on data flow and rendering decisions.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry uses these atoms for saved/new progress photos and the
 * recent-measurement detail dialog.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';
import { SectionTitle } from './MeasurementEntry.baseStyles';

export const PhotoPreviewWrapper = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 8px;
  }
`;

export const ModalSection = styled.div`
  margin-top: 16px;
`;

export const TightSectionTitle = styled(SectionTitle)`
  margin-bottom: 4px;
`;

export const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

export const ModalContent = styled(motion.div)`
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.05);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

export const ModalCloseButton = styled.button`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.1));
  border-radius: 8px;
  color: var(--text-muted, #4070C0);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const DetailGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

export const DetailCell = styled.div`
  padding: 12px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

export const DetailLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

export const DetailValue = styled.div`
  font-size: 1.15rem;
  color: #fff;
  font-weight: 600;
`;

export const DetailUnit = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
  margin-left: 4px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

export const DetailPhotoGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
  margin-top: 16px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;
