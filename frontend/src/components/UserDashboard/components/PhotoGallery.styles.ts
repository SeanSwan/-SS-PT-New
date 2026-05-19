import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  visionAccentButtonCss,
  visionControlCss,
  visionPanelCss,
} from './UserDashboardSectionChrome.styles';

export const GalleryContainer = styled(motion.div)`
  ${visionPanelCss}
  color: var(--text-primary, #E0ECF4);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    backdrop-filter: none;
  }
`;

export const GalleryHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
    gap: 1rem;
  }
`;

export const GalleryTitle = styled.h2`
  align-items: center;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  font-size: 1.75rem;
  font-weight: 700;
  gap: 0.75rem;
  letter-spacing: 0;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    justify-content: center;
  }
`;

export const UploadButton = styled(motion.button)`
  align-items: center;
  ${visionAccentButtonCss}
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  padding: 0.75rem 1.5rem;

  &:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

export const SearchAndFilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const SearchInput = styled.input`
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  border: 1px solid var(--vision-border);
  border-radius: 16px;
  color: var(--text-primary, #E0ECF4);
  flex: 1 1 240px;
  font-size: 1rem;
  min-height: 44px;
  min-width: 220px;
  padding: 0.75rem 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.56));
  }

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    outline: none;
  }

  @media (max-width: 768px) {
    min-width: 0;
  }
`;

export const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  align-items: center;
  ${({ $active }) => ($active ? visionAccentButtonCss : visionControlCss)}
  color: ${({ $active }) => ($active ? 'var(--text-inverse, #0F172A)' : 'var(--text-secondary, rgba(224, 236, 244, 0.76))')};
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
`;

export const StatusMessage = styled.p`
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-size: 0.9rem;
  margin: 0 0 1rem;
`;

export const PhotoGrid = styled.div`
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));

  @media (max-width: 768px) {
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  @media (max-width: 480px) {
    gap: 0.75rem;
    grid-template-columns: 1fr;
  }
`;

export const HiddenInput = styled.input`
  display: none;
`;

export const EmptyState = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.56));
  padding: 3rem 2rem;
  text-align: center;

  h3 {
    color: var(--text-primary, #E0ECF4);
    font-weight: 700;
    margin: 1rem 0 0.5rem;
  }

  p {
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
  }
`;
