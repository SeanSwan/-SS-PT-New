import styled from 'styled-components';
import { TIME_WHEEL_THEME } from './TimeWheel.theme';

export const PortalContainer = styled.div<{ $top: number; $left: number; $width: number }>`
  position: fixed;
  top: ${p => p.$top}px;
  left: ${p => p.$left}px;
  width: ${p => p.$width}px;
  z-index: var(--z-dropdown, 200);
`;

export const DropdownList = styled.div<{ $direction: 'down' | 'up' }>`
  max-height: 300px;
  overflow-y: auto;
  background: ${TIME_WHEEL_THEME.menuSurface};
  border: 2px solid ${TIME_WHEEL_THEME.borderStrong};
  border-radius: 8px;
  padding: 0.25rem 0;
  box-shadow: ${TIME_WHEEL_THEME.shadowStrong}, ${TIME_WHEEL_THEME.shadowGlow};
  transform-origin: ${p => p.$direction === 'up' ? 'bottom center' : 'top center'};
  outline: none;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${TIME_WHEEL_THEME.scrollbarTrack};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${TIME_WHEEL_THEME.scrollbarThumb};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${TIME_WHEEL_THEME.scrollbarThumbHover};
  }
`;

export const TimeSlotButton = styled.button<{
  $isSelected: boolean;
  $isFocused: boolean;
  $isDisabled: boolean;
}>`
  display: block;
  width: 100%;
  padding: 0 1rem;
  height: 44px;
  border: none;
  background: ${p =>
    p.$isSelected ? TIME_WHEEL_THEME.surfaceActive :
    p.$isFocused ? TIME_WHEEL_THEME.accentSoft :
    'transparent'};
  color: ${p =>
    p.$isDisabled ? TIME_WHEEL_THEME.textDisabled :
    p.$isSelected ? TIME_WHEEL_THEME.accent :
    TIME_WHEEL_THEME.textPrimary};
  font-size: 0.9rem;
  font-family: inherit;
  text-align: left;
  cursor: ${p => p.$isDisabled ? 'not-allowed' : 'pointer'};
  transition: background 100ms ease;
  border-left: 3px solid ${p => p.$isSelected ? TIME_WHEEL_THEME.accent : 'transparent'};

  &:hover:not([aria-disabled="true"]) {
    background: ${TIME_WHEEL_THEME.accentSoft};
  }
`;
