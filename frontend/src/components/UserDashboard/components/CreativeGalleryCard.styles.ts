/**
 * Card styles for the active UserDashboard V3 creative gallery.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';

export const VideoCard = styled(motion.button)`
  position: relative;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--bg-surface, var(--bg-elevated, rgba(0, 48, 128, 0.85)));
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    transform: translateY(-4px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const VideoThumbnail = styled.div<{ $image: string }>`
  position: relative;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1)), url(${({ $image }) => $image});
  background-position: center;
  background-size: cover;
`;

export const PlayButton = styled(motion.span)`
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--obsidian-black, #0A0A0F);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  &:hover {
    background: var(--button-text, #FFFFFF);
    transform: scale(1.1);
  }
`;

export const VideoInfo = styled.div`
  padding: 1.25rem;
`;

export const VideoTitle = styled.h3`
  margin: 0 0 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3;
`;

export const VideoStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-muted, #64748b);
  font-size: 0.875rem;
`;

export const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export const UploadCard = styled(motion.button)`
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 2rem;
  border: 2px dashed var(--border-soft, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--bg-surface, var(--bg-elevated, rgba(0, 48, 128, 0.85)));
  color: inherit;
  cursor: pointer;
  text-align: center;
  transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const UploadIcon = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-purple, #8B5CF6));
  color: var(--button-text, #FFFFFF);
`;

export const UploadText = styled.h3`
  margin: 0 0 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.2rem;
  font-weight: 600;
`;

export const UploadSubtext = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
  line-height: 1.4;
`;

export const EmptyState = styled.div`
  padding: 3rem 2rem;
  color: var(--text-muted, #64748b);
  text-align: center;

  h3 {
    margin: 1rem 0 0.5rem;
    color: var(--text-primary, #E0ECF4);
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }
`;
