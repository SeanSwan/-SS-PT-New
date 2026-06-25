import { motion } from 'framer-motion';
import styled from 'styled-components';

export const PreviewBackdrop = styled(motion.div)`
  align-items: center;
  background: var(--bg-scrim, rgba(10, 10, 15, 0.92));
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  padding: 1rem;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 1000;
`;

export const PreviewDialog = styled(motion.div)`
  background: var(--bg-elevated, rgba(0, 32, 96, 0.96));
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  border-radius: 8px;
  box-shadow: 0 24px 80px var(--shadow-strong, rgba(0, 0, 0, 0.45));
  color: var(--text-primary, #E0ECF4);
  max-height: 92vh;
  max-width: min(960px, 94vw);
  overflow: hidden;
  position: relative;
  width: 100%;
`;

export const PreviewTitle = styled.h2`
  font-size: 1rem;
  line-height: 1.3;
  margin: 0;
  padding: 1rem 4rem 1rem 1rem;
`;

export const PreviewMediaFrame = styled.div`
  background: var(--bg-base, #030712);
  display: flex;
  justify-content: center;
  max-height: min(72vh, 720px);
`;

export const PreviewImage = styled.img`
  max-height: min(72vh, 720px);
  max-width: 100%;
  object-fit: contain;
`;

export const PreviewVideo = styled.video`
  max-height: min(72vh, 720px);
  max-width: 100%;
  width: 100%;
`;

export const ClosePreviewButton = styled(motion.button)`
  align-items: center;
  background: var(--bg-overlay, rgba(10, 10, 15, 0.78));
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  height: 48px;
  justify-content: center;
  position: absolute;
  right: 0.75rem;
  top: 0.75rem;
  width: 48px;

  &:hover,
  &:focus-visible {
    background: var(--accent-primary, #60C0F0);
    color: var(--button-text, #0A0A0F);
    outline: none;
  }
`;
