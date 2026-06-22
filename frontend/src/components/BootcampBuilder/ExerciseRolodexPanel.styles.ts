import styled from 'styled-components';

export const PanelWrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-surface, #1A1A24);
  border-right: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  overflow: hidden;
`;

export const PanelHeader = styled.div`
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent));
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const PanelTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const ResultCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 42%, transparent));
`;

export const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 6px 10px;
  margin: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  background: var(--bg-base, #0A0A0F);
  flex-shrink: 0;

  input {
    flex: 1;
    min-width: 0;
    min-height: 36px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 13px;

    &::placeholder {
      color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 35%, transparent));
    }
  }
`;

export const IconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.55;
`;

export const ClearSearchButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    outline: none;
  }
`;

export const FilterToggle = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 8px 10px;
  margin: 2px 12px 4px;
  border-radius: 6px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  background: ${({ $open }) => $open ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)' : 'transparent'};
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;

  &:hover,
  &:focus-visible {
    color: var(--text-primary, #E0ECF4);
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const FilterSection = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'block' : 'none'};
  flex-shrink: 0;
  max-height: ${({ $open }) => $open ? '220px' : '0'};
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const ChipRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 3px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
  flex-wrap: wrap;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const Chip = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent))'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent))'};
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-secondary, #8B5CF6);
    outline: none;
  }
`;

export const EquipmentPickerWrap = styled.div`
  padding: 8px 12px 0;
  flex-shrink: 0;
`;

export const FormatInfoBar = styled.div`
  padding: 6px 12px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  border-bottom: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--accent-secondary, #8B5CF6);
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

export const StructureSelectGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(92px, 1fr) minmax(116px, 1fr);
  gap: 8px;
  width: 100%;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const FormatSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  cursor: pointer;
`;
