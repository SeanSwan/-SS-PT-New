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

  @media (min-width: 1024px) {
    padding: 10px 24px;
    gap: 8px;
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
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)'
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

  @media (min-width: 768px) {
    font-size: 13px;
  }

  @media (min-width: 1200px) {
    font-size: 12px;
  }
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
    color: var(--text-primary, #E0ECF4);
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
  padding: 6px 16px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  flex-shrink: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (min-width: 1024px) {
    padding: 6px 24px;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }
`;

export const StyleBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 16px;
  min-height: 44px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, rgba(224, 236, 244, 0.45))'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;

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
