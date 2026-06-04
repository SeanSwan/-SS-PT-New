import styled from 'styled-components';
import { TIME_WHEEL_THEME } from './TimeWheel.theme';

export const PickerContainer = styled.div`
  position: relative;
  width: 100%;
`;

export const TriggerButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  min-height: 44px;
  background: ${TIME_WHEEL_THEME.surface};
  border: 1px solid ${TIME_WHEEL_THEME.border};
  border-radius: 6px;
  color: ${TIME_WHEEL_THEME.textPrimary};
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 200ms ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  outline: none;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    border-color: ${TIME_WHEEL_THEME.borderStrong};
    background: ${TIME_WHEEL_THEME.surfaceHover};
  }

  &:focus-visible {
    border-color: ${TIME_WHEEL_THEME.accent};
    box-shadow: 0 0 0 3px ${TIME_WHEEL_THEME.accentSoft};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &[aria-expanded="true"] {
    border-color: ${TIME_WHEEL_THEME.borderStrong};
    background: ${TIME_WHEEL_THEME.surfaceActive};
  }
`;

export const TriggerContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: inherit;

  svg {
    color: ${TIME_WHEEL_THEME.textMuted};
    flex-shrink: 0;
  }
`;

export const TriggerText = styled.span`
  font-weight: 500;
`;

export const TzBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 500;
  color: ${TIME_WHEEL_THEME.textMuted};
  background: ${TIME_WHEEL_THEME.neutralButton};
  border: 1px solid ${TIME_WHEEL_THEME.border};
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
`;
