/**
 * ============================================================================
 * FILE: AIPersistentPanelStyles.ts
 * PURPOSE: Styled components for the persistent AI panel (desktop + mobile)
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-29
 * AI VILLAGE VALIDATED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all styled-components for the AIPersistentPanel.
 * Desktop (1280px+): persistent right-side panel via flexbox.
 * Mobile (320px-1024px): sticky bottom sheet, 64px collapsed, 85vh expanded.
 *
 * HOW IT FITS IN THE APP: Imported exclusively by AIPersistentPanel.tsx.
 * Uses CSS custom properties with dark-theme Crystalline Swan fallbacks.
 *
 * KEY DECISIONS:
 * - Nested flexbox inside ExecutiveMainContent (NOT restructuring root grid)
 * - 64px collapsed mobile sheet (44px touch target + 10px padding each side)
 * - Panel widths scale: 320px@1280, 380px@1440, 420px@1920, 480px@3840
 * - All animations GPU-composited (transform + opacity only)
 *
 * DESIGN AUTHORITY: Gemini 3.1 Pro (CTO) + Claude Opus 4.6 (CEO) consensus
 */

import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animation Keyframes
// PURPOSE: GPU-composited animations for panel and messages
// WHY: transform + opacity only per project rules
// ─────────────────────────────────────────────────────────────

const slideUpFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout Wrapper
// PURPOSE: Flex container wrapping dashboard content + AI panel
// WHY: Nested flexbox approach avoids restructuring root grid
// ─────────────────────────────────────────────────────────────

export const ContentWithPanelWrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex: 1;
`;

export const DashboardScrollArea = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Desktop AI Panel (1280px+)
// PURPOSE: Persistent right-side panel for AI chat
// WHY: Always visible on desktop for instant access
// ─────────────────────────────────────────────────────────────

export const DesktopPanel = styled.aside`
  display: none;

  @media (min-width: 1280px) {
    display: flex;
    flex-direction: column;
    width: 320px;
    flex-shrink: 0;
    background-color: var(--bg-surface, #1A1A24);
    border-left: 1px solid rgba(224, 236, 244, 0.05);
    height: 100%;
    z-index: 10;
    border-radius: 16px 0 0 16px;
    overflow: hidden;
  }

  @media (min-width: 1440px) {
    width: 380px;
  }

  @media (min-width: 1920px) {
    width: 420px;
  }

  @media (min-width: 3840px) {
    width: 480px;
  }
`;

export const DesktopPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(224, 236, 244, 0.05);
  flex-shrink: 0;
`;

export const PanelTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PanelSparkle = styled.span`
  font-size: 16px;
  line-height: 1;
`;

export const ContextSelector = styled.select`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 32px;
  cursor: pointer;
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  option {
    background: var(--bg-surface, #1A1A24);
    color: var(--text-primary, #E0ECF4);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Chat Messages Area
// PURPOSE: Scrollable message list for both desktop and mobile
// ─────────────────────────────────────────────────────────────

export const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;

  /* Subtle scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(224, 236, 244, 0.1);
    border-radius: 4px;
  }
`;

export const MessageBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  animation: ${slideUpFade} 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  ${({ $role }) =>
    $role === 'user'
      ? css`
          align-self: flex-end;
          background-color: var(--accent-secondary, #002060);
          color: var(--text-primary, #E0ECF4);
          border-bottom-right-radius: 4px;
        `
      : css`
          align-self: flex-start;
          background-color: var(--bg-elevated, #141419);
          color: var(--text-primary, #E0ECF4);
          border: 1px solid var(--border-soft, rgba(0, 48, 128, 0.3));
          border-bottom-left-radius: 4px;
        `}
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  text-align: center;
  padding: 32px 16px;
`;

export const EmptyIcon = styled.span`
  font-size: 32px;
  opacity: 0.6;
`;

const typingDot = keyframes`
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
`;

export const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  padding: 10px 14px;
  align-self: flex-start;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-primary, #60C0F0);
    animation: ${typingDot} 1.4s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

export const ErrorBanner = styled.div`
  padding: 8px 12px;
  margin: 0 4px;
  border-radius: 8px;
  background: rgba(201, 42, 84, 0.1);
  border-left: 3px solid #C92A54;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.4;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Input Area (shared between desktop and mobile)
// PURPOSE: Text input + DictationOrb + send button
// WHY: 44px minimum touch targets on all interactive elements
// ─────────────────────────────────────────────────────────────

export const InputArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(224, 236, 244, 0.05);
  flex-shrink: 0;
  background: var(--bg-surface, #1A1A24);
`;

export const ChatInput = styled.input`
  flex: 1;
  height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  min-width: 0;

  &::placeholder {
    color: rgba(224, 236, 244, 0.5);
    font-family: 'Sora', sans-serif;
  }

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

export const SendBtn = styled.button<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: var(--accent-secondary, #8B5CF6);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  flex-shrink: 0;
  opacity: ${({ $active }) => ($active ? 1 : 0.4)};
  pointer-events: ${({ $active }) => ($active ? 'auto' : 'none')};
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    box-shadow: 0 0 16px var(--accent-primary, #60C0F0);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Mobile Bottom Sheet (320px - 1024px)
// PURPOSE: Sticky bottom sheet with collapsed/expanded states
// WHY: 64px collapsed (44px touch target + 10px padding each side)
// ─────────────────────────────────────────────────────────────

export const MobileBottomSheet = styled.div<{ $expanded: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${({ $expanded }) => ($expanded ? '85vh' : '64px')};
  background-color: var(--bg-surface, #1A1A24);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  box-shadow: 0 -8px 32px rgba(10, 10, 15, 0.8);
  transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 40;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (min-width: 1280px) {
    display: none;
  }
`;

export const MobileCollapsedRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 64px;
  padding: 10px 16px;
  flex-shrink: 0;
  cursor: pointer;

  @media (min-width: 768px) {
    padding: 10px 24px;
  }
`;

export const MobileExpandedHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(224, 236, 244, 0.05);
  flex-shrink: 0;
`;

export const MobileCloseBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const MobileCollapsedInput = styled.div`
  flex: 1;
  height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(224, 236, 244, 0.5);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const MobileCollapsedSparkle = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`;

export const DragHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(224, 236, 244, 0.2);
  margin: 8px auto 0;
  flex-shrink: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Mobile Content Padding
// PURPOSE: Add bottom padding to main content on mobile
// WHY: Prevents 64px bottom sheet from covering dashboard content
// ─────────────────────────────────────────────────────────────

export const MobileContentSpacer = styled.div`
  display: block;
  height: 72px;

  @media (min-width: 1280px) {
    display: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Orb Container
// PURPOSE: Wrapper for DictationOrb inside the input area
// WHY: Constrains orb size for panel context (smaller than drawer)
// ─────────────────────────────────────────────────────────────

export const OrbWrapper = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Scale orb for panel context */
  & > div {
    transform: scale(0.85);
    transform-origin: center;
  }
`;
