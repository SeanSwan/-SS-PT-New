/**
 * ┌─── STYLES: BookConsultCTA ──────────────────────────────────┐
 * │ PARENT: BookConsultCTA.tsx                                   │
 * │ PURPOSE: Crystalline Swan styled-components for the public   │
 * │          "Book a Free Consult" button + modal form.          │
 * │ RULES: dark-first (Rule 3), var(--token,#fallback) (Rule 6), │
 * │        44px+ targets (Rule 2), Dual-Button Glow (blue→purple │
 * │        glow), prefers-reduced-motion safe (Rule 25).         │
 * └──────────────────────────────────────────────────────────────┘
 */
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const riseIn = keyframes`from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); }`;

// Blue background → purple glow (Dual-Button Glow). Min 44px touch target.
export const TriggerButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px;
  min-width: 44px;
  padding: 14px 30px;
  border: 1px solid var(--accent-border, rgba(96, 192, 240, 0.45));
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-primary-bg, #002060) 0%, var(--surface-elevated, #003080) 100%);
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-heading, 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.25); /* Wing Purple glow */
  transition: transform 0.2s ease, box-shadow 0.25s ease;

  &:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(139, 92, 246, 0.45); }
  &:active { transform: translateY(0); }
  &:focus-visible { outline: 2px solid var(--focus-ring, #8B5CF6); outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) { transition: none; &:hover { transform: none; } }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000; /* portaled to <body>; must clear the sticky site header */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const Modal = styled.div`
  position: relative; /* anchors the absolute CloseButton */
  width: 100%;
  max-width: 460px;
  max-height: 92dvh;
  overflow-y: auto;
  padding: 28px 26px;
  border: 1px solid var(--surface-border, #2A3550);
  border-radius: 16px;
  background: var(--surface-dark, #1A1A24);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  color: var(--text-primary, #E0ECF4);
  animation: ${riseIn} 0.25s ease;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 8px;
  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--focus-ring, #8B5CF6); outline-offset: 2px; }
`;

export const Title = styled.h2`
  margin: 0 0 6px;
  font-family: var(--font-heading, 'Plus Jakarta Sans', system-ui, sans-serif);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const Subtitle = styled.p`
  margin: 0 0 20px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

const inputShared = `
  width: 100%;
  min-height: 46px;
  padding: 11px 14px;
  border: 1px solid var(--input-border, #2A3550);
  border-radius: 10px;
  background: var(--input-bg, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-body, 'Sora', system-ui, sans-serif);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.4)); }
  &:focus {
    outline: none;
    border-color: var(--accent-data, #50A0F0);
    box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.25);
  }
`;

export const Input = styled.input`${inputShared}`;
export const Textarea = styled.textarea`
  ${inputShared}
  min-height: 92px;
  resize: vertical;
`;

// Honeypot — visually hidden but reachable by bots; humans never see/fill it.
export const Honeypot = styled.input`
  position: absolute !important;
  left: -9999px !important;
  width: 1px;
  height: 1px;
  opacity: 0;
`;

export const SubmitButton = styled.button`
  min-height: 50px;
  margin-top: 6px;
  border: none;
  border-radius: 12px;
  background: var(--accent-primary-bg, #002060);
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-heading, 'Plus Jakarta Sans', system-ui, sans-serif);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3);
  transition: transform 0.2s ease, box-shadow 0.25s ease;

  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(139, 92, 246, 0.5); }
  &:active:not(:disabled) { transform: translateY(0); }
  &:focus-visible { outline: 2px solid var(--focus-ring, #8B5CF6); outline-offset: 2px; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  @media (prefers-reduced-motion: reduce) { transition: none; &:hover:not(:disabled) { transform: none; } }
`;

export const Alert = styled.div<{ $type: 'success' | 'error' }>`
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  line-height: 1.4;
  border: 1px solid ${({ $type }) => ($type === 'success' ? 'rgba(80, 200, 140, 0.4)' : 'rgba(240, 96, 96, 0.4)')};
  background: ${({ $type }) => ($type === 'success' ? 'rgba(80, 200, 140, 0.12)' : 'rgba(240, 96, 96, 0.12)')};
  color: ${({ $type }) => ($type === 'success' ? 'var(--success-text, #7EE0A8)' : 'var(--error-text, #F6A3A3)')};
`;
