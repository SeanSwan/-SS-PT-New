/**
 * Filter controls, reward card actions, and shared buttons.
 */
import styled, { css } from 'styled-components';

const rewardTheme = {
  bg: 'var(--reward-bg, rgba(15, 23, 42, 0.95))',
  bgLight: 'var(--reward-bg-light, rgba(30, 41, 59, 0.8))',
  border: 'var(--reward-border, rgba(14, 165, 233, 0.2))',
  text: 'var(--reward-text, #e2e8f0)',
  textMuted: 'var(--reward-muted, #94a3b8)',
  accent: 'var(--reward-accent, #0ea5e9)',
  accentHover: 'var(--reward-accent-hover, #38bdf8)',
  error: 'var(--reward-error, #ef4444)',
  errorBg: 'var(--reward-error-bg, rgba(239, 68, 68, 0.15))',
};

export const Container = styled.div``;

export const ControlsBar = styled.div`
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const SearchWrapper = styled.div`
  position: relative;
  flex-grow: 1;
  min-width: 200px;
  max-width: 300px;
  display: flex;
  align-items: center;
`;

export const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: ${rewardTheme.textMuted};
  pointer-events: none;
`;

export const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px 8px 38px;
  background: ${rewardTheme.bgLight};
  border: 1px solid ${rewardTheme.border};
  border-radius: 8px;
  color: ${rewardTheme.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${rewardTheme.textMuted};
  }

  &:focus {
    border-color: ${rewardTheme.accent};
  }
`;

export const SelectWrapper = styled.div`
  position: relative;
  min-width: 120px;
`;

export const SelectLabel = styled.label`
  position: absolute;
  top: -8px;
  left: 10px;
  font-size: 0.7rem;
  color: ${rewardTheme.textMuted};
  background: var(--reward-label-bg, rgba(15, 23, 42, 1));
  padding: 0 4px;
  z-index: 1;
`;

export const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: ${rewardTheme.bgLight};
  border: 1px solid ${rewardTheme.border};
  border-radius: 8px;
  color: ${rewardTheme.text};
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${rewardTheme.accent};
  }

  option {
    background: var(--reward-option-bg, #1e293b);
    color: ${rewardTheme.text};
  }
`;

export const SwitchContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  min-height: 44px;
  user-select: none;
  color: ${rewardTheme.text};
  font-size: 0.875rem;
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
  background: ${({ $checked }) => ($checked ? rewardTheme.accent : 'var(--reward-switch-bg, rgba(100, 116, 139, 0.5))')};
  border-radius: 11px;
  transition: background 0.2s;
  flex-shrink: 0;
`;

export const SwitchThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '20px' : '2px')};
  width: 18px;
  height: 18px;
  background: var(--reward-switch-thumb, #ffffff);
  border-radius: 50%;
  transition: left 0.2s;
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 10px 20px;
  background: ${rewardTheme.accent};
  color: var(--reward-button-text, #ffffff);
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${rewardTheme.accentHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 16px;
  background: transparent;
  color: ${rewardTheme.textMuted};
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${rewardTheme.text};
    background: var(--reward-ghost-hover, rgba(255, 255, 255, 0.05));
  }
`;

export const StatusPositioner = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
`;

export const IconBtn = styled.button<{ $color?: 'accent' | 'error' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  color: ${({ $color }) => ($color === 'error' ? rewardTheme.error : rewardTheme.accent)};

  &:hover {
    background: ${({ $color }) => ($color === 'error' ? rewardTheme.errorBg : 'var(--reward-hover-bg, rgba(14, 165, 233, 0.12))')};
    color: ${({ $color }) => ($color === 'error' ? 'var(--reward-error-hover, #f87171)' : rewardTheme.accentHover)};
  }
`;

export const ChipsRow = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const Chip = styled.button<{ $variant?: 'error' | 'outlined' }>`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: ${({ $variant }) => ($variant === 'outlined' ? 'default' : 'pointer')};
  transition: background 0.2s;

  ${({ $variant }) => {
    if ($variant === 'error') {
      return css`
        background: ${rewardTheme.errorBg};
        color: var(--reward-error-hover, #f87171);
        border: 1px solid var(--reward-error-border, rgba(239, 68, 68, 0.3));
      `;
    }
    if ($variant === 'outlined') {
      return css`
        background: transparent;
        color: ${rewardTheme.accent};
        border: 1px solid ${rewardTheme.border};
      `;
    }
    return css`
      background: var(--reward-chip-bg, rgba(14, 165, 233, 0.12));
      color: ${rewardTheme.accent};
      border: 1px solid ${rewardTheme.border};
    `;
  }}
`;

export const ActionRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
  gap: 0.25rem;
  width: 100%;
`;

export const Spacer = styled.div`
  margin-top: auto;
`;

export const EmptyGridState = styled.div`
  grid-column: 1 / -1;
  color: ${rewardTheme.textMuted};
  text-align: center;
  padding: 48px 20px;
`;
