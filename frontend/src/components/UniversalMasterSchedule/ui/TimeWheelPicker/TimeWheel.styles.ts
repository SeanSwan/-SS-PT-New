import styled from 'styled-components';
import { TIME_WHEEL_THEME } from './TimeWheel.theme';

export const ITEM_HEIGHT = 48;
export const VISIBLE_ITEMS = 5;
export const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export const WheelContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0;
  gap: 1rem;
`;

export const PreviewText = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${TIME_WHEEL_THEME.accent};
  text-align: center;
  letter-spacing: 0.02em;
`;

export const WheelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
`;

export const WheelSeparator = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${TIME_WHEEL_THEME.textMuted};
  padding: 0 0.25rem;
  align-self: center;
`;

export const ColumnContainer = styled.div`
  position: relative;
  width: 72px;
  height: ${WHEEL_HEIGHT}px;
  overflow: hidden;
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px ${TIME_WHEEL_THEME.borderStrong};
    border-radius: 8px;
  }
`;

export const HighlightBar = styled.div`
  position: absolute;
  top: ${Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT}px;
  left: 0;
  right: 0;
  height: ${ITEM_HEIGHT}px;
  background: ${TIME_WHEEL_THEME.accentSoft};
  border-radius: 8px;
  pointer-events: none;
  z-index: 1;
`;

export const ColumnMask = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background: linear-gradient(
    to bottom,
    ${TIME_WHEEL_THEME.menuSurface} 0%,
    transparent 30%,
    transparent 70%,
    ${TIME_WHEEL_THEME.menuSurface} 100%
  );
`;

export const WheelItem = styled.div<{ $isActive: boolean }>`
  height: ${ITEM_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${p => p.$isActive ? '1.25rem' : '1rem'};
  font-weight: ${p => p.$isActive ? 700 : 400};
  color: ${p => p.$isActive ? TIME_WHEEL_THEME.textPrimary : TIME_WHEEL_THEME.textDisabled};
  transition: font-size 150ms ease, color 150ms ease;
  cursor: pointer;
  user-select: none;
`;

export const LiveRegion = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
`;

export const ValidationMessage = styled.div`
  font-size: 0.8rem;
  color: ${TIME_WHEEL_THEME.warning};
  text-align: center;
`;

export const FooterRow = styled.div`
  display: flex;
  gap: 0.75rem;
  width: 100%;
`;

export const CancelBtn = styled.button`
  flex: 1;
  padding: 0.75rem;
  min-height: 44px;
  background: ${TIME_WHEEL_THEME.neutralButton};
  border: 1px solid ${TIME_WHEEL_THEME.border};
  border-radius: 8px;
  color: ${TIME_WHEEL_THEME.textSecondary};
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: ${TIME_WHEEL_THEME.neutralButtonHover};
  }
`;

export const ConfirmBtn = styled.button`
  flex: 1;
  padding: 0.75rem;
  min-height: 44px;
  background: ${TIME_WHEEL_THEME.surfaceActive};
  border: 1px solid ${TIME_WHEEL_THEME.borderStrong};
  border-radius: 8px;
  color: ${TIME_WHEEL_THEME.accent};
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover:not(:disabled) {
    background: ${TIME_WHEEL_THEME.accentSoft};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const NativeSelectWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 1rem 0;
`;

export const NativeSelect = styled.select`
  width: 100%;
  max-width: 280px;
  padding: 0.75rem 1rem;
  min-height: 44px;
  background: ${TIME_WHEEL_THEME.nativeSurface};
  border: 1px solid ${TIME_WHEEL_THEME.borderStrong};
  border-radius: 8px;
  color: ${TIME_WHEEL_THEME.textPrimary};
  font-size: 1rem;
  font-family: inherit;
  appearance: auto;
`;
