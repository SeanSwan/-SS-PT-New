/**
 * ============================================================================
 * FILE: ClientTrainingCommandBar.styles.ts
 * PURPOSE: Styled-components surface for the selected-client Swan command bar.
 * OWNER: Codex | LAST MODIFIED: 2026-05-26
 * ============================================================================
 */

import styled from 'styled-components';
import { Mic2 } from 'lucide-react';
import { swanClientActionButton, swanDataCardShell, swanPill } from './clientCardSystem';

export const Shell = styled.section`
  --swan-card-padding: 12px;
  --swan-card-radius: 14px;
  ${swanDataCardShell}

  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const CommandDisclosure = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
`;

export const CommandToggleButton = styled.button<{ $open: boolean }>`
  ${swanClientActionButton}
  --swan-action-border: ${({ $open }) =>
    $open
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'};
  --swan-action-bg: ${({ $open }) =>
    $open
      ? 'color-mix(in srgb, var(--surface-accent, #003080) 76%, transparent)'
      : 'color-mix(in srgb, var(--bg-elevated, #1A1A24) 90%, transparent)'};
  --swan-action-fg: var(--text-primary, #E0ECF4);

  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 800;
  text-align: left;

  svg:last-child {
    margin-left: auto;
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
    transition: transform 160ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    svg:last-child {
      transition: none;
    }
  }
`;

export const CommandToggleCopy = styled.span`
  display: grid;
  gap: 2px;
  min-width: 0;

  small {
    color: var(--text-muted, rgba(224, 236, 244, 0.72));
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
`;

export const CommandPanel = styled.div`
  &[hidden] {
    display: none;
  }
`;

export const Badge = styled.div`
  ${swanPill}

  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  color: var(--accent-primary, #60c0f0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  justify-content: center;
  overflow-wrap: anywhere;

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
  --swan-action-border: color-mix(in srgb, var(--accent-primary, #60c0f0) 34%, transparent);
  --swan-action-bg: color-mix(in srgb, var(--bg-base, #0a0a0f) 84%, var(--accent-primary, #60c0f0) 8%);
  --swan-action-fg: var(--accent-primary, #60c0f0);
  ${swanClientActionButton}

  gap: 7px;
  padding: 10px 12px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;

  &[aria-pressed='true'] {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60c0f0) 18%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60c0f0);
  }

  &:disabled {
    transform: none;
    cursor: not-allowed;
    opacity: 0.5;
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
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
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
  --swan-action-border: var(--accent-secondary, #8b5cf6);
  --swan-action-bg: linear-gradient(135deg, var(--accent-secondary, #8b5cf6), var(--accent-tertiary, #4070c0));
  --swan-action-fg: var(--text-primary, #e0ecf4);
  --swan-action-shadow: var(--shadow-accent, rgba(96, 192, 240, 0.16));
  ${swanClientActionButton}

  gap: 8px;
  padding: 10px 14px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 26px var(--shadow-accent, rgba(96, 192, 240, 0.16));
  }

  &:disabled {
    transform: none;
    cursor: not-allowed;
    opacity: 0.56;
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
  overflow-wrap: anywhere;

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
  overflow-wrap: anywhere;
`;
