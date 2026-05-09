import styled from 'styled-components';
import { motion } from 'framer-motion';

export const PhotoModal = styled(motion.div)`
  align-items: center;
  background: rgba(10, 10, 15, 0.92);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  padding: 2rem;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 1000;
`;

export const ModalImage = styled.img`
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  border-radius: 8px;
  max-height: 90vh;
  max-width: 90vw;
  object-fit: contain;
`;

export const CloseButton = styled(motion.button)`
  align-items: center;
  background: rgba(10, 10, 15, 0.78);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  height: 48px;
  justify-content: center;
  position: absolute;
  right: 2rem;
  top: 2rem;
  width: 48px;

  &:hover,
  &:focus-visible {
    background: var(--accent-primary, #60C0F0);
    color: var(--button-text, #0A0A0F);
    outline: none;
  }
`;
