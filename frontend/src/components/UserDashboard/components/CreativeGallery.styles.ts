/**
 * Styled-components for the active UserDashboard V3 creative gallery.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  visionAccentButtonCss,
  visionControlCss,
  visionPanelCss,
} from './UserDashboardSectionChrome.styles';

export const GalleryContainer = styled(motion.div)`
  padding: 2rem;
  ${visionPanelCss}
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

export const GalleryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const GalleryTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.75rem;
  font-weight: 700;

  @media (max-width: 768px) {
    justify-content: center;
    font-size: 1.5rem;
  }
`;

export const UploadButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  ${visionAccentButtonCss}
  cursor: pointer;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

export const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

export const Tag = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  ${({ $active }) => ($active ? visionAccentButtonCss : visionControlCss)}
  color: ${({ $active }) => ($active ? 'var(--text-inverse, #0F172A)' : 'var(--text-secondary, #94a3b8)')};
  cursor: pointer;
  font-size: 0.875rem;
`;

export const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const HiddenFileInput = styled.input`
  display: none;
`;
