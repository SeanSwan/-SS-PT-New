/**
 * ============================================================================
 * FILE: WorkoutLoggerStyles.ts
 * PURPOSE: Styled components for WorkoutLoggerModal — extracted per 300-line rule
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Contains all styled-components for the WorkoutLoggerModal.
 * HOW IT FITS IN THE APP: Imported by WorkoutLoggerModal.tsx and ExerciseEntryCard.tsx
 * KEY DECISIONS: Extracted from 1070-line monolith to comply with 300-line rule
 */

import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Theme Tokens (Crystalline Swan)
// ─────────────────────────────────────────────────────────────
export const WING_PURPLE = '#8B5CF6';
export const MIDNIGHT_SAPPHIRE = '#002060';
export const ROYAL_DEPTH = '#003080';
export const ICE_WING = '#60C0F0';
export const FROST_WHITE = '#E0ECF4';
export const GILDED_FERN = '#C6A84B';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Modal Layout
// ─────────────────────────────────────────────────────────────
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: 16px;
`;

export const ModalPanel = styled.div`
  background: var(--bg-elevated, #141419);
  border-radius: 16px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
`;

export const ModalTitle = styled.h2`
  font-family: 'Sora', sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-heading, ${FROST_WHITE});
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  &:hover { background: rgba(224, 236, 244, 0.08); color: var(--text-primary, ${FROST_WHITE}); }
  &:focus-visible { outline: 2px solid var(--accent-primary, ${ICE_WING}); outline-offset: 2px; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Modal Body & Footer
// ─────────────────────────────────────────────────────────────
export const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ $fullWidth }) => $fullWidth && 'grid-column: 1 / -1;'}
`;

export const Label = styled.label`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary, #94a3b8);
`;

export const Input = styled.input`
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, ${FROST_WHITE});
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  min-height: 44px;
  transition: border-color 0.15s ease;
  &::placeholder { color: rgba(224, 236, 244, 0.35); }
  &:focus {
    outline: none;
    border-color: var(--accent-primary, ${ICE_WING});
    box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.15);
  }
`;

export const TextArea = styled.textarea`
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, ${FROST_WHITE});
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  min-height: 80px;
  resize: vertical;
  transition: border-color 0.15s ease;
  &::placeholder { color: rgba(224, 236, 244, 0.35); }
  &:focus {
    outline: none;
    border-color: var(--accent-primary, ${ICE_WING});
    box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.15);
  }
`;

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  margin: 24px 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Entry
// ─────────────────────────────────────────────────────────────
export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

export const SectionTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary, ${FROST_WHITE});
  margin: 0;
`;

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.25));
  background: transparent;
  color: var(--accent-primary, ${ICE_WING});
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: rgba(96, 192, 240, 0.08); border-color: ${ICE_WING}; }
  &:focus-visible { outline: 2px solid var(--accent-primary, ${ICE_WING}); outline-offset: 2px; }
`;

export const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
  &:focus-visible { outline: 2px solid var(--accent-primary, ${ICE_WING}); outline-offset: 2px; }
`;

export const ExerciseCard = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--bg-surface, #1A1A24);
`;

export const ExerciseHeader = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 8px;
`;

export const SetRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  @media (max-width: 600px) {
    flex-wrap: wrap;
    gap: 6px;
  }
`;

export const ExerciseMetaRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

export const CoreSectionCard = styled.div`
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  background: rgba(139, 92, 246, 0.04);
`;

export const CoreSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${WING_PURPLE};
`;

export const CoreBadge = styled.span`
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-primary, ${FROST_WHITE});
  background: ${WING_PURPLE};
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
`;

export const SetLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
  min-width: 28px;
  text-align: center;
  padding-top: 4px;
`;

export const SmallInput = styled(Input)`
  padding: 8px 10px;
  font-size: 0.8125rem;
  min-height: 40px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Footer & Status
// ─────────────────────────────────────────────────────────────
export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
`;

export const CancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: rgba(224, 236, 244, 0.06); color: var(--text-primary, ${FROST_WHITE}); }
  &:focus-visible { outline: 2px solid var(--accent-primary, ${ICE_WING}); outline-offset: 2px; }
`;

export const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, ${WING_PURPLE}, ${ICE_WING});
  color: white;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(139, 92, 246, 0.45); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--accent-primary, ${ICE_WING}); outline-offset: 2px; }
`;

export const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  display: inline-block;
`;

export const ErrorText = styled.p`
  color: #ef4444;
  font-size: 0.75rem;
  margin: 4px 0 0 0;
`;

export const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`;

export const ModeButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? WING_PURPLE : 'var(--border-soft, rgba(96, 192, 240, 0.15))'};
  background: ${({ $active }) => $active ? `color-mix(in srgb, ${WING_PURPLE} 15%, var(--bg-elevated, #141419))` : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #94a3b8)'};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: rgba(139, 92, 246, 0.1); border-color: ${WING_PURPLE}; }
  &:focus-visible { outline: 2px solid var(--accent-primary, ${ICE_WING}); outline-offset: 2px; }
`;
