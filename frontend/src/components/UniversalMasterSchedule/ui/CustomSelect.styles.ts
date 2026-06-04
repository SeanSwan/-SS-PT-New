import styled from 'styled-components';
import type { OpenDirection } from './CustomSelect.types';

export const CUSTOM_SELECT_THEME = {
  surface: 'var(--input-bg, rgba(224, 236, 244, 0.05))',
  surfaceHover: 'var(--input-bg-hover, rgba(224, 236, 244, 0.08))',
  menuSurface: 'var(--bg-elevated, #141419)',
  optionSurface: 'var(--bg-elevated, #141419)',
  optionHover: 'var(--select-option-hover, rgba(96, 192, 240, 0.12))',
  optionSelected: 'var(--select-option-selected, rgba(96, 192, 240, 0.22))',
  border: 'var(--input-border, rgba(96, 192, 240, 0.20))',
  borderHover: 'var(--input-border-hover, rgba(96, 192, 240, 0.30))',
  borderStrong: 'var(--border-strong, rgba(96, 192, 240, 0.42))',
  accent: 'var(--accent-primary, #60C0F0)',
  accentSoft: 'var(--input-focus-ring, rgba(96, 192, 240, 0.16))',
  danger: 'var(--danger, #EF4444)',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.50))',
  shadowStrong: 'var(--shadow-strong, 0 25px 50px rgba(0, 0, 0, 0.55))',
  glow: 'var(--shadow-glow-primary, 0 0 15px rgba(96, 192, 240, 0.22))',
} as const;

export const SelectContainer = styled.div`
  position: relative;
  width: 100%;
  z-index: 1;
`;

export const SelectButton = styled.button<{ $isOpen: boolean; $hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  background: ${CUSTOM_SELECT_THEME.surface};
  border: 1px solid
    ${({ $hasError }) => ($hasError ? CUSTOM_SELECT_THEME.danger : CUSTOM_SELECT_THEME.border)};
  border-radius: 6px;
  color: ${CUSTOM_SELECT_THEME.textPrimary};
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  outline: none;
  min-height: 44px;
  touch-action: manipulation;

  &:hover {
    border-color: ${CUSTOM_SELECT_THEME.borderHover};
    background: ${CUSTOM_SELECT_THEME.surfaceHover};
  }

  &:focus-visible {
    border-color: ${CUSTOM_SELECT_THEME.accent};
    box-shadow: 0 0 0 3px ${CUSTOM_SELECT_THEME.accentSoft};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
    transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0)')};
  }

  .placeholder {
    color: ${CUSTOM_SELECT_THEME.textMuted};
  }
`;

export const PortalDropdown = styled.div<{
  $isOpen: boolean;
  $top: number;
  $left: number;
  $width: number;
  $openDirection: OpenDirection;
}>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  z-index: var(--z-dropdown, 200);
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
`;

export const DropdownMenu = styled.ul<{ $isOpen: boolean; $openDirection: OpenDirection }>`
  max-height: 240px;
  background: ${CUSTOM_SELECT_THEME.menuSurface};
  background-color: ${CUSTOM_SELECT_THEME.menuSurface};
  backdrop-filter: none;
  border: 2px solid ${CUSTOM_SELECT_THEME.accent};
  border-radius: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  box-shadow: ${CUSTOM_SELECT_THEME.shadowStrong}, ${CUSTOM_SELECT_THEME.glow};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'scale(1)' : 'scale(0.95)')};
  transform-origin: ${({ $openDirection }) =>
    $openDirection === 'up' ? 'bottom center' : 'top center'};
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${CUSTOM_SELECT_THEME.surface};
  }

  &::-webkit-scrollbar-thumb {
    background: ${CUSTOM_SELECT_THEME.border};
    border-radius: 4px;

    &:hover {
      background: ${CUSTOM_SELECT_THEME.borderHover};
    }
  }
`;

export const OptionItem = styled.li<{ $isSelected: boolean; $isFocused: boolean }>`
  padding: 0.875rem 1rem;
  min-height: 44px;
  color: ${CUSTOM_SELECT_THEME.textPrimary};
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.1s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ $isSelected, $isFocused }) => {
    if ($isSelected) return CUSTOM_SELECT_THEME.optionSelected;
    if ($isFocused) return CUSTOM_SELECT_THEME.optionHover;
    return CUSTOM_SELECT_THEME.optionSurface;
  }};
  user-select: none;

  &:hover {
    background: ${CUSTOM_SELECT_THEME.optionHover};
  }

  &:active {
    background: ${CUSTOM_SELECT_THEME.optionSelected};
  }

  svg {
    color: ${CUSTOM_SELECT_THEME.accent};
    opacity: ${({ $isSelected }) => ($isSelected ? 1 : 0)};
    flex-shrink: 0;
  }
`;

export const OptionLabel = styled.span`
  flex: 1;
`;

export const OptionRight = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

export const SearchInput = styled.input`
  width: calc(100% - 1rem);
  margin: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  background: ${CUSTOM_SELECT_THEME.surface};
  border: 1px solid ${CUSTOM_SELECT_THEME.border};
  border-radius: 4px;
  color: ${CUSTOM_SELECT_THEME.textPrimary};
  font-size: 1rem;
  outline: none;

  &::placeholder {
    color: ${CUSTOM_SELECT_THEME.textMuted};
  }

  &:focus {
    border-color: ${CUSTOM_SELECT_THEME.accent};
  }
`;
