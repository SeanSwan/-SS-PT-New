import styled from 'styled-components';

export const SEARCHABLE_SELECT_THEME = {
  label: 'var(--text-secondary, rgba(224, 236, 244, 0.82))',
  surface: 'var(--input-bg, rgba(224, 236, 244, 0.05))',
  surfaceHover: 'var(--input-bg-hover, rgba(224, 236, 244, 0.08))',
  menuSurface: 'var(--bg-elevated, #141419)',
  menuBorder: 'var(--input-border, rgba(96, 192, 240, 0.22))',
  border: 'var(--input-border, rgba(96, 192, 240, 0.20))',
  borderOpen: 'var(--border-strong, rgba(96, 192, 240, 0.42))',
  borderHover: 'var(--input-border-hover, rgba(96, 192, 240, 0.30))',
  accent: 'var(--accent-primary, #60C0F0)',
  focusRing: 'var(--input-focus-ring, rgba(96, 192, 240, 0.16))',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.54))',
  textDisabled: 'var(--text-disabled, rgba(224, 236, 244, 0.32))',
  optionHover: 'var(--select-option-hover, rgba(96, 192, 240, 0.10))',
  optionSelected: 'var(--select-option-selected, rgba(96, 192, 240, 0.16))',
  optionHighlighted: 'var(--select-option-highlighted, rgba(96, 192, 240, 0.20))',
  scrollbarTrack: 'var(--scrollbar-track, rgba(224, 236, 244, 0.05))',
  scrollbarThumb: 'var(--scrollbar-thumb, rgba(96, 192, 240, 0.24))',
  scrollbarThumbHover: 'var(--scrollbar-thumb-hover, rgba(96, 192, 240, 0.34))',
  shadow: 'var(--shadow-strong, 0 8px 32px rgba(0, 0, 0, 0.42))',
} as const;

export const Container = styled.div`
  position: relative;
  width: 100%;
`;

export const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${SEARCHABLE_SELECT_THEME.label};
  margin-bottom: 6px;
`;

export const InputWrapper = styled.div<{ $isOpen: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  background: ${({ $isOpen }) =>
    $isOpen ? SEARCHABLE_SELECT_THEME.surfaceHover : SEARCHABLE_SELECT_THEME.surface};
  border: 1px solid ${({ $isOpen }) =>
    $isOpen ? SEARCHABLE_SELECT_THEME.borderOpen : SEARCHABLE_SELECT_THEME.border};
  border-radius: 12px;
  min-height: 44px;
  padding: 0 12px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;

  &:hover {
    border-color: ${({ $disabled }) =>
      $disabled ? SEARCHABLE_SELECT_THEME.border : SEARCHABLE_SELECT_THEME.borderHover};
  }

  ${({ $isOpen }) =>
    $isOpen &&
    `
      box-shadow: 0 0 0 3px ${SEARCHABLE_SELECT_THEME.focusRing};
    `}
`;

export const SearchIcon = styled.span<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $disabled }) =>
    $disabled ? SEARCHABLE_SELECT_THEME.textDisabled : SEARCHABLE_SELECT_THEME.accent};
  flex-shrink: 0;
  margin-right: 8px;
`;

export const StyledInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: ${SEARCHABLE_SELECT_THEME.textPrimary};
  font-size: 0.9rem;
  font-family: inherit;
  padding: 10px 0;
  min-width: 0;

  &::placeholder {
    color: ${SEARCHABLE_SELECT_THEME.textMuted};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

export const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: ${SEARCHABLE_SELECT_THEME.textMuted};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  transition: color 150ms ease, background 150ms ease;

  &:hover {
    color: ${SEARCHABLE_SELECT_THEME.textPrimary};
    background: ${SEARCHABLE_SELECT_THEME.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${SEARCHABLE_SELECT_THEME.accent};
    outline-offset: 2px;
  }
`;

export const ChevronIcon = styled.span<{ $isOpen: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $disabled }) =>
    $disabled ? SEARCHABLE_SELECT_THEME.textDisabled : SEARCHABLE_SELECT_THEME.textMuted};
  flex-shrink: 0;
  margin-left: 4px;
  transition: transform 200ms ease;
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0)')};
`;

export const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  background: ${SEARCHABLE_SELECT_THEME.menuSurface};
  border: 1px solid ${SEARCHABLE_SELECT_THEME.menuBorder};
  border-radius: 12px;
  box-shadow: ${SEARCHABLE_SELECT_THEME.shadow};
  overflow: hidden;
`;

export const Listbox = styled.ul`
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 240px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${SEARCHABLE_SELECT_THEME.scrollbarTrack};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${SEARCHABLE_SELECT_THEME.scrollbarThumb};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${SEARCHABLE_SELECT_THEME.scrollbarThumbHover};
  }
`;

export const Option = styled.li<{ $highlighted: boolean; $selected: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-height: 44px;
  cursor: pointer;
  transition: background 100ms ease;
  border-left: 3px solid transparent;

  ${({ $highlighted }) =>
    $highlighted &&
    `
      background: ${SEARCHABLE_SELECT_THEME.optionHighlighted};
      border-left-color: ${SEARCHABLE_SELECT_THEME.accent};
    `}

  ${({ $selected, $highlighted }) =>
    $selected &&
    !$highlighted &&
    `
      background: ${SEARCHABLE_SELECT_THEME.optionSelected};
    `}

  &:hover {
    background: ${SEARCHABLE_SELECT_THEME.optionHover};
  }
`;

export const OptionLabel = styled.span`
  color: ${SEARCHABLE_SELECT_THEME.textPrimary};
  font-size: 0.9rem;
`;

export const OptionSubLabel = styled.span`
  color: ${SEARCHABLE_SELECT_THEME.textMuted};
  font-size: 0.85rem;
  margin-left: 8px;
`;

export const NoResults = styled.li`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  min-height: 44px;
  color: ${SEARCHABLE_SELECT_THEME.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`;
