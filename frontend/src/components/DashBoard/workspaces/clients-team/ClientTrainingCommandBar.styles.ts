/**
 * ============================================================================
 * FILE: ClientTrainingCommandBar.styles.ts
 * PURPOSE: Styled-components surface for the selected-client Swan command bar.
 * OWNER: Codex | LAST MODIFIED: 2026-05-26
 * ============================================================================
 */

import styled from 'styled-components';
import { Mic2 } from 'lucide-react';

export const Shell = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 18%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-elevated, #1a1a24) 86%, var(--accent-primary, #60c0f0) 8%),
      color-mix(in srgb, var(--bg-base, #0a0a0f) 88%, var(--accent-secondary, #8b5cf6) 8%));
  box-shadow: 0 14px 34px var(--shadow-ambient, rgba(0, 0, 0, 0.26));

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  color: var(--accent-primary, #60c0f0);
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 84%, var(--accent-primary, #60c0f0) 8%);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;

  @media (max-width: 620px) {
    justify-content: center;
  }
`;

export const Form = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  min-width: 0;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const VoiceButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 34%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 84%, var(--accent-primary, #60c0f0) 8%);
  color: var(--accent-primary, #60c0f0);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 180ms ease, box-shadow 180ms ease;

  &[aria-pressed='true'] {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60c0f0) 18%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60c0f0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const InputWrap = styled.div`
  position: relative;
  min-width: 0;
`;

export const LeadingIcon = styled(Mic2)`
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  pointer-events: none;
`;

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px 10px 42px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.12));
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 88%, transparent);
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.56));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
    border-color: var(--accent-primary, #60c0f0);
  }
`;

export const SubmitButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--accent-secondary, #8b5cf6);
  background: linear-gradient(135deg, var(--accent-secondary, #8b5cf6), var(--accent-tertiary, #4070c0));
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 26px var(--shadow-accent, rgba(96, 192, 240, 0.16));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

export const StatusLine = styled.div<{ $tone?: 'error' | 'success' }>`
  grid-column: 2;
  margin-top: -6px;
  color: ${({ $tone }) =>
    $tone === 'error'
      ? 'var(--danger-text, #fca5a5)'
      : 'var(--accent-primary, #60c0f0)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;

  @media (max-width: 620px) {
    grid-column: 1;
    text-align: center;
  }
`;

export const OutputPanel = styled.div`
  grid-column: 2;
  display: grid;
  gap: 10px;
  padding-top: 2px;

  @media (max-width: 620px) {
    grid-column: 1;
  }
`;

export const AssistantNote = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 84%, var(--accent-primary, #60c0f0) 5%);
  color: var(--text-muted, rgba(224, 236, 244, 0.82));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.5;
`;
