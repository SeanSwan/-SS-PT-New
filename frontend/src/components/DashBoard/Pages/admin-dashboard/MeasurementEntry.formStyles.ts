/**
 * ============================================================================
 * FILE: MeasurementEntry.formStyles.ts
 * PURPOSE: Form, autocomplete, upload, chip, and recent-list style atoms.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Keeps MeasurementEntry's reusable form controls outside the active biometrics
 * shell so the component can continue shrinking toward the project line cap.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry imports these atoms alongside base layout styles while modal
 * and chart styles remain separate follow-up extraction slices.
 */

import styled from 'styled-components';
import { SubsectionTitle } from './MeasurementEntry.baseStyles';

export const InputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const StyledLabel = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
  padding-left: 2px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

export const StyledInput = styled.input<{ $hasAdornment?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  padding-right: ${({ $hasAdornment }) => ($hasAdornment ? '60px' : '12px')};
  background: var(--bg-card, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.1));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  &[type='number']::-webkit-inner-spin-button,
  &[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

export const InputAdornmentSpan = styled.span`
  position: absolute;
  right: 12px;
  bottom: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  pointer-events: none;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

export const AutocompleteWrapper = styled.div`
  position: relative;
  width: 100%;
`;

export const DropdownList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: rgba(20, 27, 40, 0.98);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 0 0 8px 8px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

export const DropdownItem = styled.button<{ $highlighted?: boolean }>`
  width: 100%;
  padding: 10px 14px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  text-align: left;
  border: 0;
  background: ${({ $highlighted }) =>
    $highlighted ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  transition: background 0.15s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
  }

  &:disabled {
    cursor: default;
    color: rgba(255, 255, 255, 0.45);
  }
`;

export const EmbeddedClientBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.95rem;
  font-weight: 500;
  min-height: 44px;
`;

export const ClearClientButton = styled.button`
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted, #4070C0);
`;

export const TightSubsectionTitle = styled(SubsectionTitle)`
  margin: 0;
`;

export const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  background: transparent;
  color: #8B5CF6;
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.08);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const RemovePhotoButton = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

export const UploadZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 120px;
  height: 100%;
  border: 2px dashed rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: rgba(139, 92, 246, 0.7);
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    border-color: #8B5CF6;
    background: rgba(139, 92, 246, 0.04);
  }
`;

export const ChangeChip = styled.span<{ $variant?: 'success' | 'error' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'success'
        ? '#4caf50'
        : $variant === 'error'
          ? '#f44336'
          : 'rgba(255, 255, 255, 0.3)'};
  color: ${({ $variant }) =>
    $variant === 'success'
      ? '#4caf50'
      : $variant === 'error'
        ? '#f44336'
        : 'rgba(255, 255, 255, 0.7)'};

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

export const MeasurementList = styled.div`
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const MeasurementListItem = styled.button`
  width: 100%;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-top: 0;
  border-left: 0;
  border-right: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.06);
  }

  &:last-child {
    border-bottom: none;
  }
`;

export const ListPrimary = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 500;
`;

export const ListSecondary = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.82rem;
  margin-top: 2px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;
