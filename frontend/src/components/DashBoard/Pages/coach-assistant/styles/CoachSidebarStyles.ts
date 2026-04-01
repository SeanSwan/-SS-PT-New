/**
 * ============================================================================
 * FILE: CoachSidebarStyles.ts
 * PURPOSE: Conversation history sidebar styled components
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Sidebar Container
// ─────────────────────────────────────────────────────────────
export const SidebarOverlay = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1100;

  @media (min-width: 1024px) {
    background: rgba(0, 0, 0, 0.3);
  }
`;

export const SidebarContainer = styled.aside<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(280px, 85vw);
  max-height: 100vh;
  background: var(--bg-elevated, #141419);
  border-right: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  display: flex;
  flex-direction: column;
  z-index: 1101;
  transform: translateX(${({ $isOpen }) => $isOpen ? '0' : '-100%'});
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @media (min-width: 769px) and (max-width: 1023px) {
    width: 280px;
  }

  @media (min-width: 1024px) {
    position: fixed;
    width: 280px;
    flex-shrink: 0;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Sidebar Header
// ─────────────────────────────────────────────────────────────
export const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  flex-shrink: 0;
`;

export const NewChatBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const CloseSidebarBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover { color: var(--text-primary, #E0ECF4); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Search
// ─────────────────────────────────────────────────────────────
export const SearchInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  margin: 8px 14px;
  width: calc(100% - 28px);
  min-height: 40px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 8px;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Conversation List
// ─────────────────────────────────────────────────────────────
export const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    border-radius: 2px;
  }
`;

export const GroupLabel = styled.div`
  padding: 10px 14px 4px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
`;

export const ConvItemRow = styled.div<{ $active?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px 10px 18px;
  min-height: 48px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)' : 'transparent'};
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  /* Design consensus: ::before pseudo-element with transform: scaleY() */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 60%;
    border-radius: 0 2px 2px 0;
    background: var(--accent-secondary, #8B5CF6);
    transform: translateY(-50%) scaleY(${({ $active }) => $active ? '1' : '0'});
    transform-origin: center;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
    &::before { transform: translateY(-50%) scaleY(1); }
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

export const ConvItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ConvItemTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary, #E0ECF4);
`;

export const ConvItemMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
  margin-top: 2px;
`;

export const ConvItemActions = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;

  ${ConvItemRow}:hover & {
    opacity: 1;
  }
`;

export const ConvActionBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Empty State
// ─────────────────────────────────────────────────────────────
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  gap: 8px;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;
