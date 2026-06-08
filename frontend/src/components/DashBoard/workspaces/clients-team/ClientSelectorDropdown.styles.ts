import styled from 'styled-components';
import type { ClientSourceTone } from './clientSourceDisplay';

export const SelectorWrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
`;

export const SelectorButton = styled.button<{ $hasSelection: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  min-height: 52px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const Avatar = styled.div<{ $source?: ClientSourceTone }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $source }) =>
    $source === 'mf'
      ? 'var(--client-source-move-bg, linear-gradient(135deg, var(--accent-gold, #C6A84B) 0%, var(--accent-secondary, #8B5CF6) 100%))'
      : $source === 'external'
        ? 'var(--client-source-external-bg, linear-gradient(135deg, var(--bg-elevated, #1A1A24) 0%, var(--tertiary, #4070C0) 100%))'
      : 'var(--client-source-swan-bg, linear-gradient(135deg, var(--primary, #002060) 0%, var(--accent-primary, #60C0F0) 100%))'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--button-text, #FFFFFF);
  flex-shrink: 0;
`;

export const SelectionInfo = styled.div`
  flex: 1;
  text-align: left;
  min-width: 0;
`;

export const SelectionName = styled.div`
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SelectionMeta = styled.div`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
  font-family: 'Fira Code', monospace;
`;

export const SourceBadge = styled.span<{ $source: ClientSourceTone }>`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $source }) =>
    $source === 'mf'
      ? 'var(--client-source-move-soft, rgba(198, 168, 75, 0.15))'
      : $source === 'external'
        ? 'var(--client-source-external-soft, rgba(224, 236, 244, 0.1))'
      : 'var(--client-source-swan-soft, rgba(96, 192, 240, 0.12))'};
  color: ${({ $source }) =>
    $source === 'mf'
      ? 'var(--accent-gold, #C6A84B)'
      : $source === 'external'
        ? 'var(--text-primary, #E0ECF4)'
      : 'var(--accent-primary, #60C0F0)'};
`;

export const Dropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 380px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-surface, #1A1A24);
  box-shadow: var(--shadow-strong, 0 16px 48px rgba(0, 0, 0, 0.5));
  z-index: 50;
  display: ${({ $open }) => $open ? 'block' : 'none'};

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: var(--scroll-thumb, rgba(96, 192, 240, 0.15));
    border-radius: 2px;
  }
`;

export const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  position: sticky;
  top: 0;
  background: var(--bg-surface, #1A1A24);
  z-index: 1;
`;

export const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }
`;

export const MutedIconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.4;
`;

export const SelectorPlaceholder = styled.span`
  opacity: 0.5;
`;

export const ChevronIndicator = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.4;
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'none')};
  transition: transform 0.2s ease;
`;

export const ClearSearchButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const SectionLabelIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
`;

export const SectionLabel = styled.div`
  padding: 8px 14px 4px;
  display: flex;
  align-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
`;

export const ClientRow = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  min-height: 48px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)' : 'transparent'};
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

export const NewClientRow = styled(ClientRow)`
  color: var(--accent-secondary, #8B5CF6);
  font-weight: 600;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

export const EmptyMsg = styled.div`
  padding: 24px 14px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;
