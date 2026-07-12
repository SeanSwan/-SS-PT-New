/**
 * PricingInquiryModal.styles.ts — presentation for PricingInquiryModal.
 * Crystalline Swan, dark-first, token-with-fallback (rule 6). Extracted from
 * the component to keep it under the 300-line cap (rule 4).
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(3, 7, 18, 0.78);
  backdrop-filter: blur(6px);
  overflow-y: auto;
`;

export const Panel = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 2rem 1.75rem;
  border-radius: 18px;
  background: linear-gradient(
    160deg,
    var(--surface-dark, #1a1a24) 0%,
    var(--card-dark, #141419) 100%
  );
  border: 1px solid var(--chrome-edge, rgba(96, 192, 240, 0.28));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(139, 92, 246, 0.12);
  color: var(--text-primary, #e0ecf4);

  @media (max-width: 520px) {
    padding: 1.75rem 1.25rem;
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--text-secondary, #8aa8b8);
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: var(--text-primary, #e0ecf4);
    background: rgba(96, 192, 240, 0.1);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const Kicker = styled.div`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--accent-primary, #60c0f0);
  margin-bottom: 0.4rem;
`;

export const Title = styled.h2`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 1.9rem;
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0 0.6rem;
  color: var(--text-primary, #f0f8ff);
`;

export const Lead = styled.p`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--text-secondary, #b7c9d6);
  margin: 0 0 1.25rem;

  strong {
    color: var(--text-primary, #e0ecf4);
  }
`;

export const Field = styled.div`
  margin-bottom: 1rem;

  label {
    display: block;
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary, #b7c9d6);
    margin-bottom: 0.4rem;
  }

  input,
  textarea {
    width: 100%;
    min-height: 44px;
    padding: 0.7rem 0.85rem;
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 1rem;
    color: var(--text-primary, #e0ecf4);
    background: rgba(10, 10, 15, 0.7);
    border: 1px solid rgba(96, 192, 240, 0.18);
    border-radius: 10px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  textarea {
    resize: vertical;
    min-height: 72px;
  }

  input:focus-visible,
  textarea:focus-visible {
    outline: none;
    border-color: var(--accent-glow, #8b5cf6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
  }

  input:disabled,
  textarea:disabled {
    opacity: 0.6;
  }
`;

export const Actions = styled.div`
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;

  & > * {
    width: 100%;
    max-width: 260px;
  }
`;

export const ErrorBox = styled.div`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.88rem;
  color: #ffd7d7;
  background: rgba(232, 80, 120, 0.14);
  border: 1px solid rgba(232, 80, 120, 0.4);
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  margin-bottom: 1rem;
`;

export const SuccessState = styled.div`
  text-align: center;
  padding: 0.5rem 0;
`;

export const SuccessMark = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #0a0a0f;
  background: linear-gradient(135deg, #60c0f0, #8b5cf6);
  border-radius: 50%;
  box-shadow: 0 0 24px rgba(96, 192, 240, 0.4);
`;
