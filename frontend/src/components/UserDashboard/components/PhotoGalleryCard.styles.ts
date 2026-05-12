import styled from 'styled-components';
import { motion } from 'framer-motion';
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';

export const PhotoCard = styled(motion.article)`
  aspect-ratio: 1;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    outline: none;
    transform: translateY(-4px);
  }
`;

export const PhotoImage = styled.div<{ $image: string }>`
  background-image: ${({ $image }) => {
    const overlay = 'linear-gradient(180deg, rgba(10, 10, 15, 0) 0%, rgba(10, 10, 15, 0.04) 52%, rgba(10, 10, 15, 0.86) 100%)';
    const safe = sanitizeImageUrl($image);
    return safe ? `${overlay}, url(${cssUrlValue(safe)})` : overlay;
  }};
  background-position: center;
  background-size: cover;
  height: 100%;
  position: relative;
  width: 100%;
`;

export const PhotoOverlay = styled.div`
  bottom: 0;
  color: var(--text-primary, #E0ECF4);
  left: 0;
  opacity: 0;
  padding: 1rem;
  position: absolute;
  right: 0;
  transform: translateY(100%);
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 2;

  ${PhotoCard}:hover &,
  ${PhotoCard}:focus-visible & {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const PhotoTitle = styled.h3`
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.2;
  margin: 0 0 0.5rem;
`;

export const PhotoStats = styled.div`
  align-items: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  display: flex;
  font-size: 0.875rem;
  gap: 1rem;
`;

export const StatItem = styled.div`
  align-items: center;
  display: flex;
  gap: 0.25rem;
`;

export const PhotoActions = styled.div`
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  position: absolute;
  right: 12px;
  top: 12px;
  transition: opacity 0.3s ease;
  z-index: 3;

  ${PhotoCard}:hover &,
  ${PhotoCard}:focus-within & {
    opacity: 1;
  }
`;

export const ActionButton = styled(motion.button)`
  align-items: center;
  background: rgba(10, 10, 15, 0.76);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  height: 44px;
  justify-content: center;
  width: 44px;

  &:hover,
  &:focus-visible {
    background: var(--accent-primary, #60C0F0);
    color: var(--button-text, #0A0A0F);
    outline: none;
  }
`;

export const UploadCard = styled(motion.button)`
  align-items: center;
  aspect-ratio: 1;
  background: var(--bg-surface, #1A1A24);
  border: 2px dashed var(--border-soft, rgba(224, 236, 244, 0.16));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s ease;

  &:hover,
  &:focus-visible {
    background: var(--bg-elevated, #141419);
    border-color: var(--accent-primary, #60C0F0);
    outline: none;
    transform: translateY(-2px);
  }
`;

export const UploadIcon = styled.div`
  align-items: center;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  border-radius: 999px;
  color: var(--button-text, #0A0A0F);
  display: flex;
  height: 60px;
  justify-content: center;
  margin-bottom: 1rem;
  width: 60px;
`;

export const UploadText = styled.h3`
  color: var(--text-primary, #E0ECF4);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
`;

export const UploadSubtext = styled.p`
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-size: 0.85rem;
  line-height: 1.4;
  margin: 0;
`;
