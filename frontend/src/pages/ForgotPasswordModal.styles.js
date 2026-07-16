/**
 * @file ForgotPasswordModal.styles.js
 * @description Crystalline Swan styling for the canonical password-reset request surface.
 *
 * Design contract: dark-first tokens, 44px controls, visible focus, reduced motion,
 * and Dual-Button Glow. This module contains presentation only.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  min-height: 100dvh;
  place-items: center;
  overflow-y: auto;
  padding: clamp(1rem, 4vw, 3rem);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent);
`;

export const VideoBackground = styled.video`
  position: fixed;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.16;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

export const ModalContent = styled(motion.section)`
  position: relative;
  width: min(100%, 440px);
  overflow: hidden;
  padding: clamp(2rem, 6vw, 3rem);
  color: var(--text-primary, #E0ECF4);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--bg-elevated, #141419) 96%, var(--accent-primary, #60C0F0) 4%),
      var(--surface-elevated, #1A1A24)
    );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent);
  border-radius: clamp(1.25rem, 4vw, 2rem);
  box-shadow:
    0 24px 72px color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent),
    0 0 32px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);

  &::before {
    position: absolute;
    inset: 0 0 auto;
    height: 2px;
    content: '';
    background: linear-gradient(
      90deg,
      transparent,
      var(--accent-primary, #60C0F0),
      var(--accent-secondary, #8B5CF6),
      transparent
    );
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 0.875rem;
  right: 0.875rem;
  display: grid;
  min-width: 44px;
  min-height: 44px;
  place-items: center;
  padding: 0;
  color: var(--accent-primary, #60C0F0);
  font: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 64%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent);
  border-radius: 999px;
  transition: background 160ms ease, box-shadow 160ms ease, color 160ms ease;

  &:hover {
    color: var(--text-on-accent, #FFFFFF);
    background: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 48%, transparent);
  }

  &:focus-visible {
    outline: 3px solid var(--focus-ring, #8B5CF6);
    outline-offset: 3px;
  }
`;

export const Eyebrow = styled.p`
  margin: 0 0 0.625rem;
  color: var(--accent-primary, #60C0F0);
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 0 3rem 0.75rem 0;
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-size: clamp(1.75rem, 6vw, 2.4rem);
  line-height: 1.08;
`;

export const Intro = styled.p`
  margin: 0 0 1.75rem;
  color: var(--text-secondary, #A8BCD0);
  font-size: 0.95rem;
  line-height: 1.65;
`;

export const StatusMessage = styled.p`
  margin: 0 0 1rem;
  padding: 0.75rem 0.875rem;
  color: ${({ $tone }) =>
    $tone === 'error'
      ? 'var(--danger, #C92A54)'
      : 'var(--success, #3BC48D)'};
  font-size: 0.9rem;
  line-height: 1.45;
  text-align: center;
  background: ${({ $tone }) =>
    $tone === 'error'
      ? 'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)'
      : 'color-mix(in srgb, var(--success, #3BC48D) 12%, transparent)'};
  border: 1px solid ${({ $tone }) =>
    $tone === 'error'
      ? 'color-mix(in srgb, var(--danger, #C92A54) 42%, transparent)'
      : 'color-mix(in srgb, var(--success, #3BC48D) 42%, transparent)'};
  border-radius: 0.75rem;
`;

export const ResetForm = styled.form`
  display: grid;
  gap: 0.625rem;
`;

export const FieldLabel = styled.label`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  font-weight: 700;
`;

export const InputField = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 0.875rem;
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 52%, transparent);
  border-radius: 0.75rem;

  &::placeholder {
    color: var(--text-muted, #8195AA);
  }

  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    outline: 3px solid color-mix(in srgb, var(--focus-ring, #8B5CF6) 45%, transparent);
    outline-offset: 2px;
  }
`;

export const SubmitButton = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--text-on-accent, #FFFFFF);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  background: linear-gradient(
    135deg,
    var(--primary, #002060),
    var(--primary-hover, #003080)
  );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 52%, transparent);
  border-radius: 0.75rem;
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 0 28px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 52%, transparent);
  }

  &:focus-visible {
    outline: 3px solid var(--focus-ring, #8B5CF6);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.68;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
