/**
 * ============================================================================
 * FILE: EventStyles.ts
 * PURPOSE: Styled components for Community Events UI
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 */

import styled, { keyframes } from 'styled-components';

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Event Card
// ─────────────────────────────────────────────────────────────

export const CardWrap = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  animation: ${slideUp} 0.3s ease-out;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  &:last-child { margin-bottom: 0; }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

export const CardTitle = styled.h4`
  margin: 0;
  font-size: 0.9375rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const CategoryPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.6875rem;
  font-family: 'Sora', sans-serif;
  font-weight: 500;
  white-space: nowrap;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  color: var(--accent-secondary, #8B5CF6);
`;

export const CardDesc = styled.p`
  margin: 0 0 0.625rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;

export const AttendeeBadge = styled.span<{ $full?: boolean }>`
  color: ${({ $full }) => $full
    ? 'var(--error-accent, #C92A54)'
    : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Fira Code', monospace;
`;

export const RsvpRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

export const RsvpBtn = styled.button<{ $active?: boolean; $variant?: string }>`
  min-height: 36px;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--border-soft, rgba(96, 192, 240, 0.15))'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)'
      : 'transparent'};
  color: ${({ $active }) =>
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, #94a3b8)'};

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--accent-primary, #60C0F0);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Event Create Form
// ─────────────────────────────────────────────────────────────

export const FormOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

export const FormCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;

  h3 {
    margin: 0 0 1rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.125rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 0.875rem;

  label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary, #94a3b8);
    margin-bottom: 4px;
    font-family: 'Sora', sans-serif;
  }
`;

export const FormInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  box-sizing: border-box;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--accent-primary, #60C0F0);
  }
`;

export const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.625rem 0.75rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  resize: vertical;
  box-sizing: border-box;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--accent-primary, #60C0F0);
  }
`;

export const FormSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  box-sizing: border-box;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--accent-primary, #60C0F0);
  }

  option { background: var(--bg-surface, #1A1A24); }
`;

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

export const FormActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
`;

export const SubmitBtn = styled.button`
  min-height: 44px;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #002060);
  background: var(--accent-primary, #002060);
  color: #FFFFFF;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover:not(:disabled) {
    background: var(--bg-elevated, #003080);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

export const CancelBtn = styled.button`
  min-height: 44px;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--text-secondary, #94a3b8);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Events List Header
// ─────────────────────────────────────────────────────────────

export const EventsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;

  h3 {
    margin: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

export const CreateEventBtn = styled.button`
  min-height: 36px;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
