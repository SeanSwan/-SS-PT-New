/**
 * ============================================================================
 * FILE: WorkoutPlanBuilderStyles.ts
 * PURPOSE: All styled components and design tokens for WorkoutPlanBuilder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exports every styled-component, keyframe, CSS helper,
 * and the TOKENS object consumed by WorkoutPlanBuilder and its sub-components.
 *
 * HOW IT FITS IN THE APP: Imported by WorkoutPlanBuilder.tsx, MultiChipPicker,
 * PlanDetailsStep, TrainingScheduleStep, ExerciseSelectionStep, ReviewSaveStep.
 *
 * KEY DECISIONS: Centralised styles file avoids duplication across step files.
 * Styles files are exempt from the 300-line limit per project rules.
 */

import styled, { css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Crystalline Swan Design Tokens
// PURPOSE: Single source of truth for all colour/spacing values
// ─────────────────────────────────────────────────────────────
export const TOKENS = {
  bg: 'rgba(0,32,96,0.95)',
  bgSolid: '#002060',
  border: 'rgba(96,192,240,0.2)',
  borderHover: 'rgba(96,192,240,0.45)',
  text: '#E0ECF4',
  muted: '#94a3b8',
  accent: '#60C0F0',
  accentHover: '#8B5CF6',
  danger: '#ef4444',
  dangerHover: '#f87171',
  surface: 'rgba(0,48,128,0.92)',
  glass: 'rgba(0,48,128,0.55)',
  radius: '12px',
  radiusSm: '8px',
  shadow: '0 4px 24px rgba(0,0,0,0.35)',
  minTouch: '44px',
} as const;

// ─────────────────────────────────────────────────────────────
// SECTION: Shared CSS helpers
// ─────────────────────────────────────────────────────────────
export const inputStyles = css`
  width: 100%;
  min-height: ${TOKENS.minTouch};
  padding: 10px 14px;
  font-size: 0.938rem;
  color: ${TOKENS.text};
  background: ${TOKENS.surface};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radiusSm};
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: ${TOKENS.accent};
    box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
  }

  &::placeholder {
    color: ${TOKENS.muted};
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────
export const PageWrapper = styled.div`
  color: ${TOKENS.text};
`;

export const FormGrid = styled.div<{ $cols?: string }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: 20px;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
`;

export const FlexRow = styled.div<{ $justify?: string; $align?: string; $gap?: string; $wrap?: string }>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'center'};
  gap: ${({ $gap }) => $gap || '0'};
  flex-wrap: ${({ $wrap }) => $wrap || 'nowrap'};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Typography
// ─────────────────────────────────────────────────────────────
export const PageTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: ${TOKENS.text};
`;

export const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: ${TOKENS.text};
`;

export const SubTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: ${TOKENS.text};
`;

export const BodyText = styled.p<{ $muted?: boolean }>`
  font-size: 0.938rem;
  margin: 0 0 12px 0;
  color: ${({ $muted }) => ($muted ? TOKENS.muted : TOKENS.text)};
  line-height: 1.55;
`;

export const SmallText = styled.span<{ $muted?: boolean }>`
  font-size: 0.813rem;
  color: ${({ $muted }) => ($muted ? TOKENS.muted : TOKENS.text)};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Surface / Cards
// ─────────────────────────────────────────────────────────────
export const Surface = styled.div`
  background: ${TOKENS.bg};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radius};
  padding: 24px;
  backdrop-filter: blur(12px);
  box-shadow: ${TOKENS.shadow};
`;

export const CardPanel = styled.div`
  background: ${TOKENS.glass};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radius};
  padding: 20px;
  backdrop-filter: blur(12px);
  margin-bottom: 16px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Form Controls
// ─────────────────────────────────────────────────────────────
export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const FieldLabel = styled.label`
  font-size: 0.813rem;
  font-weight: 500;
  color: ${TOKENS.muted};
`;

export const StyledInput = styled.input`
  ${inputStyles}
`;

export const StyledTextarea = styled.textarea`
  ${inputStyles}
  resize: vertical;
  min-height: 80px;
`;

export const NativeSelect = styled.select`
  ${inputStyles}
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Buttons
// ─────────────────────────────────────────────────────────────
export const PrimaryButton = styled.button<{ $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${TOKENS.minTouch};
  padding: 10px 24px;
  font-size: 0.938rem;
  font-weight: 600;
  color: #fff;
  background: ${TOKENS.accent};
  border: none;
  border-radius: ${TOKENS.radiusSm};
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  &:hover:not(:disabled) {
    background: ${TOKENS.accentHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${TOKENS.minTouch};
  padding: 10px 20px;
  font-size: 0.938rem;
  font-weight: 600;
  color: ${TOKENS.accent};
  background: transparent;
  border: 1px solid ${TOKENS.accent};
  border-radius: ${TOKENS.radiusSm};
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    background: rgba(14,165,233,0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${TOKENS.minTouch};
  padding: 10px 16px;
  font-size: 0.938rem;
  font-weight: 500;
  color: ${TOKENS.muted};
  background: transparent;
  border: none;
  border-radius: ${TOKENS.radiusSm};
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover:not(:disabled) {
    color: ${TOKENS.text};
    background: rgba(148,163,184,0.08);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const RoundIconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${TOKENS.minTouch};
  min-height: ${TOKENS.minTouch};
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ $danger }) => ($danger ? TOKENS.danger : TOKENS.muted)};
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)'};
    color: ${({ $danger }) => ($danger ? TOKENS.dangerHover : TOKENS.text)};
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Stepper
// ─────────────────────────────────────────────────────────────
export const StepperRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 28px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

export const StepCircle = styled.div<{ $active?: boolean; $completed?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.25s;

  ${({ $active, $completed }) => {
    if ($active) {
      return css`
        background: ${TOKENS.accent};
        color: #fff;
        box-shadow: 0 0 12px rgba(14,165,233,0.4);
      `;
    }
    if ($completed) {
      return css`
        background: rgba(14,165,233,0.25);
        color: ${TOKENS.accent};
      `;
    }
    return css`
      background: rgba(148,163,184,0.15);
      color: ${TOKENS.muted};
    `;
  }}
`;

export const StepConnector = styled.div<{ $completed?: boolean }>`
  flex: 1;
  height: 2px;
  min-width: 32px;
  background: ${({ $completed }) =>
    $completed ? TOKENS.accent : 'rgba(148,163,184,0.2)'};
  transition: background 0.25s;
`;

export const StepLabelText = styled.span<{ $active?: boolean }>`
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active }) => ($active ? TOKENS.text : TOKENS.muted)};
  margin-left: 8px;
  white-space: nowrap;
`;

export const StepItem = styled.div`
  display: flex;
  align-items: center;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Alert
// ─────────────────────────────────────────────────────────────
export const AlertBox = styled.div<{ $severity?: 'error' | 'warning' | 'info' | 'success' }>`
  padding: 14px 18px;
  border-radius: ${TOKENS.radiusSm};
  margin-bottom: 16px;
  font-size: 0.938rem;
  line-height: 1.5;
  border-left: 4px solid;

  ${({ $severity }) => {
    switch ($severity) {
      case 'error':
        return css`
          background: rgba(239,68,68,0.08);
          border-left-color: ${TOKENS.danger};
          color: #fca5a5;
        `;
      case 'warning':
        return css`
          background: rgba(234,179,8,0.08);
          border-left-color: #eab308;
          color: #fde047;
        `;
      case 'success':
        return css`
          background: rgba(34,197,94,0.08);
          border-left-color: #22c55e;
          color: #86efac;
        `;
      default:
        return css`
          background: rgba(14,165,233,0.08);
          border-left-color: ${TOKENS.accent};
          color: ${TOKENS.text};
        `;
    }
  }}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Collapsible (Accordion replacement)
// ─────────────────────────────────────────────────────────────
export const CollapsibleWrapper = styled.div`
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radiusSm};
  margin-bottom: 8px;
  overflow: hidden;
  background: ${TOKENS.glass};
  backdrop-filter: blur(12px);
`;

export const CollapsibleHeader = styled.button<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: ${TOKENS.minTouch};
  padding: 12px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: ${TOKENS.text};
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;

  & > svg:last-child {
    transition: transform 0.25s;
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0)')};
    flex-shrink: 0;
  }
`;

export const CollapsibleBody = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  padding: 0 16px 16px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Chip
// ─────────────────────────────────────────────────────────────
export const ChipTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 0.813rem;
  font-weight: 500;
  color: ${TOKENS.accent};
  background: rgba(14,165,233,0.1);
  border: 1px solid ${TOKENS.border};
  border-radius: 999px;
  white-space: nowrap;
`;

export const ChipRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  color: ${TOKENS.muted};
  cursor: pointer;
  line-height: 1;

  &:hover {
    color: ${TOKENS.danger};
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Table
// ─────────────────────────────────────────────────────────────
export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const StyledThead = styled.thead`
  background: rgba(14,165,233,0.06);
`;

export const StyledTh = styled.th`
  text-align: left;
  padding: 10px 14px;
  font-size: 0.813rem;
  font-weight: 600;
  color: ${TOKENS.muted};
  border-bottom: 1px solid ${TOKENS.border};
  white-space: nowrap;
`;

export const StyledTd = styled.td`
  padding: 8px 14px;
  font-size: 0.875rem;
  color: ${TOKENS.text};
  border-bottom: 1px solid rgba(148,163,184,0.08);
  vertical-align: middle;
`;

export const CompactInput = styled.input`
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  font-size: 0.875rem;
  color: ${TOKENS.text};
  background: ${TOKENS.surface};
  border: 1px solid ${TOKENS.border};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${TOKENS.accent};
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Divider
// ─────────────────────────────────────────────────────────────
export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${TOKENS.border};
  margin: 24px 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: List
// ─────────────────────────────────────────────────────────────
export const ListUl = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const ListLi = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(148,163,184,0.08);

  &:last-child {
    border-bottom: none;
  }
`;

export const ListItemContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Modal (Dialog replacement)
// ─────────────────────────────────────────────────────────────
export const ModalOverlay = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
`;

export const ModalPanel = styled.div`
  width: 90vw;
  max-width: 960px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${TOKENS.bgSolid};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radius};
  box-shadow: ${TOKENS.shadow};
  overflow: hidden;
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid ${TOKENS.border};
  font-size: 1.125rem;
  font-weight: 600;
  color: ${TOKENS.text};
`;

export const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${TOKENS.border};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Stat Card for Review
// ─────────────────────────────────────────────────────────────
export const StatCard = styled.div`
  text-align: center;
  padding: 16px;
`;

export const StatIcon = styled.div`
  color: ${TOKENS.accent};
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Multi-Select Chip Picker
// ─────────────────────────────────────────────────────────────
export const ChipPickerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ChipSelectedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 10px;
`;
