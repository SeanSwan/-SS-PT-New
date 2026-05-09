/**
 * Styled-components for the active UserDashboard V3 creative gallery.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';

export const GalleryContainer = styled(motion.div)`
  padding: 2rem;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(24px);

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
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-purple, #8B5CF6));
  color: var(--button-text, #FFFFFF);
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(96, 192, 240, 0.24);
  transition: box-shadow 0.3s ease, transform 0.3s ease;

  &:hover {
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.34);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

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
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(255, 255, 255, 0.08))')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--bg-elevated, rgba(0, 48, 128, 0.85))')};
  color: ${({ $active }) => ($active ? 'var(--button-text, #FFFFFF)' : 'var(--text-secondary, #94a3b8)')};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.3s ease, color 0.3s ease, transform 0.3s ease;

  &:hover {
    background: var(--accent-primary, #60C0F0);
    color: var(--button-text, #FFFFFF);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
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
