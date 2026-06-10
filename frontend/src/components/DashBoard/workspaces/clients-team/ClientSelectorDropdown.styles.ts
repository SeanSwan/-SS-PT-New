import styled from 'styled-components';
import type { ClientSourceTone } from './clientSourceDisplay';
import { swanClientActionButton, swanDataCardShell, swanPill } from './clientCardSystem';

export const SelectorWrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;

  @media (max-width: 520px) {
    max-width: none;
  }
`;

export const SelectorButton = styled.button<{ $hasSelection: boolean }>`
  ${swanClientActionButton}
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  min-height: 52px;
  box-sizing: border-box;
  font-family: 'Sora', sans-serif;
  font-size: 15px;

  &:hover {
    transform: none;
  }

  @media (max-width: 520px) {
    gap: 8px;
    min-height: 44px;
    padding: 7px 12px;
    border-radius: 11px;
    font-size: 14px;
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

  @media (max-width: 520px) {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }
`;

export const SelectionInfo = styled.div`
  flex: 1;
  text-align: left;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const SelectionName = styled.div`
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.25;
  overflow-wrap: anywhere;

  @media (max-width: 520px) {
    font-size: 13px;
    line-height: 1.1;
  }
`;

export const SelectionMeta = styled.div`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
  font-family: 'Fira Code', monospace;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  overflow-wrap: anywhere;

  @media (max-width: 520px) {
    display: none;
  }
`;

export const SourceBadge = styled.span<{ $source: ClientSourceTone }>`
  ${swanPill}
  box-sizing: border-box;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0;
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
  flex-shrink: 0;

  @media (max-width: 520px) {
    min-height: 24px;
    padding: 2px 7px;
    font-size: 9px;
  }
`;

export const Dropdown = styled.div<{ $open: boolean }>`
  --swan-card-padding: 0;
  --swan-card-radius: 12px;
  ${swanDataCardShell}
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: min(380px, calc(100vh - 160px));
  background-color: var(--bg-base, #050810);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 180;
  display: ${({ $open }) => $open ? 'block' : 'none'};

  &:hover {
    transform: none;
  }

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
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--bg-base, #050810) 94%, var(--surface-accent, #003080) 6%),
      color-mix(in srgb, var(--bg-base, #050810) 90%, var(--primary, #002060) 10%));
  background-color: var(--bg-base, #050810);
  z-index: 1;
`;

export const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  min-height: 44px;
  box-sizing: border-box;
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
  overflow-wrap: anywhere;
`;

export const ChevronIndicator = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.4;
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'none')};
  transition: transform 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
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
  letter-spacing: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  overflow-wrap: anywhere;
`;

export const ClientRow = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  min-height: 48px;
  box-sizing: border-box;
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

  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

export const EmptyMsg = styled.div`
  padding: 24px 14px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  overflow-wrap: anywhere;
`;
