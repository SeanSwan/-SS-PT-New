/**
 * Filter controls, card actions, and empty-state styles for achievements.
 */
import styled from 'styled-components';
import { Trophy } from 'lucide-react';

export const ControlsRow = styled.div`
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

export const SearchInputWrapper = styled.div`
  position: relative;
  flex-grow: 1;
  min-width: 200px;
  max-width: 300px;
  display: flex;
  align-items: center;
`;

export const SearchIconBox = styled.div`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: var(--achievement-muted, #94a3b8);
`;

export const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px 8px 38px;
  background: var(--achievement-input-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--achievement-text, #e2e8f0);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--achievement-placeholder, #64748b);
  }

  &:focus {
    border-color: var(--achievement-accent, #0ea5e9);
  }
`;

export const StyledSelect = styled.select`
  min-height: 44px;
  min-width: 120px;
  padding: 8px 12px;
  background: var(--achievement-input-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--achievement-text, #e2e8f0);
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--achievement-accent, #0ea5e9);
  }

  option {
    background: var(--achievement-option-bg, #0f172a);
    color: var(--achievement-text, #e2e8f0);
  }
`;

export const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--achievement-text, #e2e8f0);
  font-size: 14px;
  min-height: 44px;
`;

export const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

export const SwitchTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 40px;
  height: 22px;
  background: ${({ $checked }) =>
    $checked
      ? 'var(--achievement-accent, #0ea5e9)'
      : 'var(--achievement-switch-bg, rgba(14, 165, 233, 0.2))'};
  border-radius: 11px;
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

export const SwitchThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '20px' : '2px')};
  width: 18px;
  height: 18px;
  background: var(--achievement-switch-thumb, #e2e8f0);
  border-radius: 50%;
  transition: left 0.2s ease;
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: var(--achievement-accent, #0ea5e9);
  color: var(--achievement-button-text, #ffffff);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: var(--achievement-accent-hover, #0284c7);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  color: var(--achievement-text, #e2e8f0);
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--achievement-accent, #0ea5e9);
    background: var(--achievement-hover-bg, rgba(14, 165, 233, 0.1));
  }
`;

export const StatusPositioner = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
`;

export const TooltipButton = styled.button<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: ${({ $isActive }) => ($isActive ? 'var(--achievement-accent, #0ea5e9)' : 'var(--achievement-muted-dark, #64748b)')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--achievement-hover-bg, rgba(14, 165, 233, 0.1));
  }
`;

export const ChipRequirement = styled.div`
  margin-top: auto;
  margin-bottom: 8px;
`;

export const ChipSpan = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: var(--achievement-chip-bg, rgba(14, 165, 233, 0.1));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 16px;
  color: var(--achievement-text, #e2e8f0);
  font-size: 12px;
  margin-bottom: 8px;
`;

export const ActionRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 12px;
  gap: 8px;
  width: 100%;
`;

export const IconActionButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: ${({ $variant }) => ($variant === 'danger' ? 'var(--achievement-danger, #ef4444)' : 'var(--achievement-accent, #0ea5e9)')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger'
        ? 'var(--achievement-danger-bg, rgba(239, 68, 68, 0.1))'
        : 'var(--achievement-hover-bg, rgba(14, 165, 233, 0.1))'};
  }
`;

export const BadgeIconImage = styled.img`
  width: 36px;
  height: 36px;
  object-fit: contain;
`;

export const EmojiIcon = styled.span`
  font-size: 28px;
`;

export const EmptyGridState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px 20px;
  opacity: 0.75;
  color: var(--achievement-text, #e2e8f0);
`;

export const EmptyStateIcon = styled(Trophy)`
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  color: var(--achievement-accent, #0ea5e9);
`;
