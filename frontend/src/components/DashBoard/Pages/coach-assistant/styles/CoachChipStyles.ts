/**
 * ============================================================================
 * FILE: CoachChipStyles.ts
 * PURPOSE: Context chips and response style selector styles
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Context Chip Bar
// ─────────────────────────────────────────────────────────────
export const ChipBarWrap = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 375px) {
    padding: 6px 8px;
    gap: 4px;
  }

  @media (min-width: 1024px) {
    padding: 10px 24px;
    gap: 8px;
  }

  @media (min-width: 2560px) {
    padding: 12px 32px;
    gap: 10px;
  }
`;

export const ContextChipBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.1))'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent)'
      : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 44px;
  ${({ $active }) => $active ? `
    box-shadow: inset 0 0 0 1px var(--accent-secondary, #8B5CF6),
                0 0 8px rgba(139, 92, 246, 0.2);
  ` : ''}

  @media (max-width: 430px) {
    font-size: 11px;
    padding: 5px 8px;
    gap: 3px;
    min-height: 36px;
  }

  @media (max-width: 375px) {
    font-size: 10px;
    padding: 4px 7px;
    gap: 2px;
  }

  @media (min-width: 768px) {
    font-size: 13px;
  }

  @media (min-width: 1200px) {
    font-size: 12px;
  }

  @media (min-width: 2560px) {
    font-size: 14px;
    padding: 10px 18px;
    min-height: 48px;
  }

  @media (min-width: 3840px) {
    font-size: 16px;
    padding: 12px 22px;
    min-height: 56px;
  }
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
    color: var(--text-primary, #E0ECF4);
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Response Style Selector
// ─────────────────────────────────────────────────────────────
export const StyleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  flex-shrink: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  justify-content: center;

  @media (max-width: 430px) {
    padding: 4px 8px;
    gap: 2px;
  }

  @media (min-width: 1024px) {
    padding: 6px 24px;
    width: 100%;
  }
`;

export const StyleBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 16px;
  min-height: 36px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, rgba(224, 236, 244, 0.45))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;

  @media (max-width: 430px) {
    font-size: 11px;
    padding: 5px 8px;
    min-height: 32px;
    gap: 3px;
  }

  @media (min-width: 768px) {
    font-size: 13px;
    padding: 6px 12px;
    min-height: 36px;
  }

  @media (min-width: 1200px) {
    font-size: 12px;
  }
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
