/**
 * Enhanced login presentation.
 *
 * C12 form-panel surface: calm, dark-first, keyboard-safe, and fully operable
 * with touch, keyboard, zoom, and reduced motion. AuthLayout owns viewport
 * height; this surface deliberately allows document scrolling.
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
export const LoginContainer = styled(motion.main)`
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: 100%;
  min-width: 0;
  padding: max(20px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(32px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  overflow: visible;
  background:
    radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--accent-primary, #60c0f0) 13%, transparent), transparent 34%),
    radial-gradient(circle at 82% 88%, color-mix(in srgb, var(--accent-secondary, #8b5cf6) 10%, transparent), transparent 38%),
    var(--bg-base, #030712);
  @media (max-height: 600px) {
    place-items: start center;
    padding-top: max(12px, env(safe-area-inset-top));
  }
`;
export const FormWrapper = styled(motion.section)`
  position: relative;
  z-index: 1;
  width: min(100%, 420px);
  margin-block: 12px;
  padding: clamp(24px, 5vw, 34px);
  border: 1px solid var(--border-cyan-strong, rgba(96, 192, 240, 0.52));
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-card, #141419) 94%, transparent);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.42), 0 0 28px rgba(64, 112, 192, 0.16);

  @supports (backdrop-filter: blur(14px)) {
    backdrop-filter: blur(14px);
  }

  @media (max-width: 480px) {
    margin-block: 0;
    padding: 22px 18px 26px;
    border-radius: 14px;
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.22));
  border-radius: 999px;
  background: var(--surface-elevated, #1a1a24);
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;

  &:hover {
    border-color: var(--accent-primary, #60c0f0);
    color: var(--accent-primary, #60c0f0);
  }

  &:focus-visible {
    outline: 3px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const ModalHeader = styled.div`
  display: grid;
  justify-items: center;
  gap: 8px;
  margin-bottom: 18px;
`;

export const LogoCircle = styled.div`
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--border-cyan-strong, rgba(96, 192, 240, 0.52));
  border-radius: 999px;
  background: linear-gradient(145deg, var(--primary, #002060), var(--surface-elevated, #1a1a24));
  box-shadow: 0 0 20px rgba(96, 192, 240, 0.18);
`;

export const LogoImage = styled.img`
  width: 112%;
  height: 112%;
  object-fit: contain;
`;

export const BrandName = styled.p`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font: 700 0.78rem/1.2 'Sora', sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

export const FormTitle = styled.h1`
  margin: 0 0 8px;
  color: var(--text-primary, #e0ecf4);
  font: 700 clamp(1.45rem, 5vw, 1.85rem)/1.2 'Plus Jakarta Sans', sans-serif;
  text-align: center;
`;

export const FormSubtitle = styled.p`
  margin: 0 0 22px;
  color: var(--text-secondary, #c7d7e5);
  font: 400 0.94rem/1.55 'Sora', sans-serif;
  text-align: center;
`;

export const CredentialForm = styled.form`
  display: grid;
  gap: 16px;
`;

export const FieldGroup = styled.div`
  display: grid;
  gap: 7px;
`;

export const FieldLabel = styled.label`
  color: var(--text-primary, #e0ecf4);
  font: 600 0.88rem/1.3 'Sora', sans-serif;
`;

export const InputShell = styled.div`
  position: relative;
`;

export const InputField = styled(motion.input)`
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.28));
  border-radius: 10px;
  background: var(--surface-elevated, #1a1a24);
  color: var(--text-primary, #e0ecf4);
  font: 400 1rem/1.4 'Sora', sans-serif;
  caret-color: var(--accent-primary, #60c0f0);

  &[data-password='true'] {
    padding-right: 56px;
  }

  &::placeholder {
    color: var(--text-muted, #a8b6c7);
  }

  &:focus {
    border-color: var(--accent-primary, #60c0f0);
    outline: 3px solid color-mix(in srgb, var(--accent-secondary, #8b5cf6) 42%, transparent);
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const PasswordToggle = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  place-items: center;
  width: 44px !important;
  min-width: 44px !important;
  max-width: 44px !important;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary, #c7d7e5);
  cursor: pointer;

  svg {
    pointer-events: none;
  }

  &:hover {
    color: var(--accent-primary, #60c0f0);
  }

  &:focus-visible {
    outline: 3px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 1px;
  }
`;

export const SubmitButton = styled(motion.button)`
  min-height: 48px;
  margin-top: 2px;
  padding: 12px 18px;
  border: 1px solid var(--accent-secondary, #8b5cf6);
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary, #002060), var(--tertiary, #4070c0));
  box-shadow: 0 0 22px rgba(139, 92, 246, 0.25);
  color: var(--text-primary, #e0ecf4);
  font: 700 1rem/1.3 'Sora', sans-serif;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 24px rgba(96, 192, 240, 0.3);
  }

  &:focus-visible {
    outline: 3px solid var(--accent-primary, #60c0f0);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const ErrorMessage = styled.p`
  margin: 0 0 16px;
  padding: 11px 12px;
  border: 1px solid var(--status-error-border, rgba(255, 128, 128, 0.5));
  border-radius: 9px;
  background: var(--status-error-bg, rgba(120, 22, 42, 0.28));
  color: var(--status-error-text, #ffc1c1);
  font: 500 0.9rem/1.45 'Sora', sans-serif;
  text-align: center;
`;

export const ClaimedWelcome = styled.p`
  margin: 0 0 16px;
  padding: 11px 12px;
  border: 1px solid var(--border-cyan-strong, rgba(96, 192, 240, 0.52));
  border-radius: 9px;
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 10%, transparent);
  color: var(--text-primary, #e0ecf4);
  font: 500 0.9rem/1.45 'Sora', sans-serif;
  text-align: center;
`;

export const PasswordPolicyHint = styled(motion.p)`
  margin: -6px 0 0;
  color: var(--text-secondary, #c7d7e5);
  font: 400 0.8rem/1.45 'Sora', sans-serif;
`;

export const AuthLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 18px;
  margin-top: 18px;
`;

export const AuthLink = styled(motion(Link))`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--accent-primary, #60c0f0);
  font: 600 0.88rem/1.3 'Sora', sans-serif;
  text-decoration: none;

  &:hover {
    color: var(--luxury-gold, #c6a84b);
    text-decoration: underline;
  }

  &:focus-visible {
    border-radius: 4px;
    outline: 3px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 3px;
  }
`;

export const ConnectionStatus = styled.p<{ $connected: boolean }>`
  margin: 12px 0 -12px;
  color: ${({ $connected }) => ($connected
    ? 'var(--status-success-text, #9ee6b1)'
    : 'var(--status-warning-text, #ffd58a)')};
  font: 500 0.74rem/1.3 'Fira Code', monospace;
  text-align: center;
`;
