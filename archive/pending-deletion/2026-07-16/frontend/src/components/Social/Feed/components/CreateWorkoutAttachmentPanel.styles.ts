/**
 * ============================================================================
 * FILE: CreateWorkoutAttachmentPanel.styles.ts
 * PURPOSE: Styled-components for the Social workout attachment panel
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the responsive, dark-first surface used by the
 * composer workout builder without adding more weight to CreatePostStyles.ts.
 *
 * HOW IT FITS IN THE APP: Imported only by CreateWorkoutAttachmentPanel.tsx.
 * The panel inherits Swan dashboard tokens and keeps every control at 44px+.
 *
 * KEY DECISIONS: The panel reads as a compact coaching slate, not a nested card
 * stack. Motion is minimal and disabled for reduced-motion users.
 */

import styled from 'styled-components';

export const PanelShell = styled.section`
  margin-top: 16px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-surface, #001440) 88%, transparent),
      color-mix(in srgb, var(--bg-elevated, #002060) 70%, transparent));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-heading, #F8FAFC);
    font-size: 0.95rem;
    font-weight: 700;
  }
`;

export const SmallCopy = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.78rem;
`;

export const SearchField = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    color: var(--text-secondary, rgba(224, 236, 244, 0.78));
    font-size: 0.78rem;
    font-weight: 700;
  }
`;

export const SearchIconWrap = styled.span`
  position: absolute;
  left: 12px;
  bottom: 14px;
  display: inline-flex;
  color: var(--accent-primary, #60C0F0);
  pointer-events: none;
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px 10px 38px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.18));
  background: color-mix(in srgb, var(--bg-base, #030712) 76%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.56));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  }
`;

export const SearchResults = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 10px;
`;

export const ResultButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;

  strong {
    display: block;
    font-size: 0.88rem;
  }

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const ResultMeta = styled.span`
  display: block;
  margin-top: 2px;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-size: 0.74rem;
`;

export const AddCustomButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--accent-gold, #C6A84B) 48%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  color: var(--accent-gold, #C6A84B);
  cursor: pointer;
  font: inherit;
  font-weight: 700;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const SelectedList = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 12px;
`;

export const EmptySlate = styled.div`
  padding: 14px;
  border-radius: 8px;
  border: 1px dashed var(--border-soft, rgba(224, 236, 244, 0.2));
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.82rem;
`;

export const ExerciseCard = styled.article`
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  background: color-mix(in srgb, var(--bg-base, #030712) 72%, transparent);
`;

export const ExerciseHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`;

export const ExerciseName = styled.h4`
  margin: 0;
  color: var(--text-heading, #F8FAFC);
  font-size: 0.92rem;
`;

export const ExerciseMeta = styled.span`
  display: inline-flex;
  margin-top: 3px;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.72rem;
  font-weight: 700;
`;

export const RemoveExerciseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text-muted, #94A3B8) 26%, transparent);
  background: transparent;
  color: var(--text-secondary, #CBD5E1);
  cursor: pointer;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ExerciseFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldLabel = styled.label<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};

  > span:first-child {
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: capitalize;
  }
`;

export const PanelInput = styled.input`
  min-height: 44px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.16));
  background: color-mix(in srgb, var(--bg-surface, #001440) 82%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.54));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
    border-color: var(--accent-secondary, #8B5CF6);
  }
`;
