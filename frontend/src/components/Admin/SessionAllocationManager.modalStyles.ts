import { motion } from 'framer-motion';
import styled from 'styled-components';

export const Modal = styled(motion.div)`
  align-items: center;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.8));
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

export const ModalContent = styled(motion.div)`
  background: var(--glass-bg, rgba(10, 14, 26, 0.9));
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 12px;
  max-width: 500px;
  padding: 2rem;
  width: min(90vw, 500px);

  h3 {
    align-items: center;
    color: var(--text-primary, #e0ecf4);
    display: flex;
    gap: 0.75rem;
    margin: 0 0 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    color: var(--text-secondary, rgba(224, 236, 244, 0.82));
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  input,
  textarea {
    background: var(--input-bg, rgba(255, 255, 255, 0.1));
    border: 1px solid var(--border-muted, rgba(255, 255, 255, 0.2));
    border-radius: 6px;
    color: var(--text-primary, #e0ecf4);
    font-size: 0.9rem;
    min-height: 44px;
    padding: 0.75rem;
    width: 100%;

    &:focus {
      border-color: var(--accent-primary, #60c0f0);
      box-shadow: 0 0 0 2px var(--focus-ring, rgba(96, 192, 240, 0.2));
      outline: none;
    }

    &::placeholder {
      color: var(--text-muted, rgba(224, 236, 244, 0.55));
    }
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  @media (max-width: 480px) {
    padding: 1.25rem;

    .modal-actions {
      flex-direction: column-reverse;
    }
  }
`;
