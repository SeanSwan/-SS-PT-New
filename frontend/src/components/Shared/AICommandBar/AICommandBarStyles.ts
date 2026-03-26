/**
 * ============================================================================
 * FILE: AICommandBarStyles.ts
 * PURPOSE: Styled components for the Raycast/VS Code-style AI Command Bar.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all styled-components for the AICommandBar,
 * including the collapsed input, expanded chat panel, message bubbles,
 * context badge, and mobile full-screen overlay.
 *
 * HOW IT FITS IN THE APP: Imported exclusively by AICommandBar.tsx.
 * Uses CSS custom properties with dark-theme Crystalline Swan fallbacks
 * so the theme changer works automatically.
 *
 * KEY DECISIONS: Hit area expansion uses CSS ::after pseudo-element (not JS).
 * Mobile overlay triggers at <768px. Glassmorphism has @supports fallback.
 * All interactive elements meet 44px minimum touch target.
 */

import styled, { css, keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animation Keyframes
// PURPOSE: Subtle expand/fade animations for the chat panel
// WHY: GPU-composited (transform + opacity only) per project rules
// ─────────────────────────────────────────────────────────────

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: CommandBarWrapper
// PURPOSE: Outer container — positions the collapsed bar and expanded panel
// WHY: position: relative so the expanded panel can anchor below the input
// ─────────────────────────────────────────────────────────────

export const CommandBarWrapper = styled.div<{ $expanded: boolean }>`
  position: relative;
  width: 100%;
  z-index: 50;
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: InputRow
// PURPOSE: Flex row containing icon, input, context badge, send button
// WHY: 44px height collapsed, glassmorphic border on dark background
// ─────────────────────────────────────────────────────────────

export const InputRow = styled.div<{ $focused: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $focused }) =>
    $focused
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--border-soft, rgba(96, 192, 240, 0.15))'};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  /* Glassmorphism */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #1a1a24);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  ${({ $focused }) =>
    $focused &&
    css`
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent),
        0 4px 16px rgba(0, 0, 0, 0.3);
    `}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: SparklesIcon
// PURPOSE: Left-side icon indicating AI functionality
// WHY: 20px visual size, does not need to be a touch target itself
// ─────────────────────────────────────────────────────────────

export const SparklesIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--accent-primary, #60C0F0);
  font-size: 16px;
  opacity: 0.8;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: CommandBarInput
// PURPOSE: The text input — 44px tall with invisible hit area expansion
// WHY: CSS ::after pseudo-element expands touch target (not JS hook)
// ─────────────────────────────────────────────────────────────

export const CommandBarInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  line-height: 44px;

  &::placeholder {
    color: var(--text-muted, #94a3b8);
    opacity: 0.7;
  }

  /* Expand touch target via pseudo-element */
  position: relative;
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: ContextBadge
// PURPOSE: Pill showing the current AI context (e.g., "Training Coach")
// WHY: Gives users immediate context awareness without reading placeholder
// ─────────────────────────────────────────────────────────────

export const ContextBadge = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  user-select: none;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: KbdHint
// PURPOSE: Keyboard shortcut hint (Ctrl+K) shown when input is not focused
// WHY: Discoverability — users learn the shortcut from the UI
// ─────────────────────────────────────────────────────────────

export const KbdHint = styled.kbd`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  height: 22px;
  padding: 0 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-muted, #94a3b8) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-muted, #94a3b8) 20%, transparent);
  color: var(--text-muted, #94a3b8);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  user-select: none;

  @media (max-width: 768px) {
    display: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: SendButton
// PURPOSE: Send button inside the input row
// WHY: 44px touch target, accent-colored, visible only when there is input
// ─────────────────────────────────────────────────────────────

export const SendButton = styled.button<{ $visible: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: ${({ $visible }) =>
    $visible
      ? 'var(--accent-primary, #60C0F0)'
      : 'transparent'};
  color: ${({ $visible }) =>
    $visible
      ? 'var(--bg-base, #030712)'
      : 'var(--text-muted, #94a3b8)'};
  cursor: ${({ $visible }) => ($visible ? 'pointer' : 'default')};
  opacity: ${({ $visible }) => ($visible ? 1 : 0.3)};
  transition: background 0.15s ease, opacity 0.15s ease, transform 0.1s ease;
  font-size: 16px;

  &:hover {
    ${({ $visible }) =>
      $visible &&
      css`
        transform: scale(1.05);
      `}
  }

  &:active {
    ${({ $visible }) =>
      $visible &&
      css`
        transform: scale(0.95);
      `}
  }

  &:focus-visible {
    outline: 2px solid #60c0f0;
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: ExpandedPanel
// PURPOSE: Chat panel that slides down below the input when expanded
// WHY: Max 400px on desktop, full-screen on mobile via MobileOverlay
// ─────────────────────────────────────────────────────────────

export const ExpandedPanel = styled.div`
  margin-top: 4px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  overflow: hidden;
  animation: ${slideDown} 0.2s ease-out;

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #1a1a24);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }

  /* Hide on mobile — MobileOverlay takes over */
  @media (max-width: 767px) {
    display: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: MessageList
// PURPOSE: Scrollable message area inside the expanded panel
// WHY: Max 400px height prevents the panel from dominating the page
// ─────────────────────────────────────────────────────────────

export const MessageList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--text-muted, #94a3b8) 30%, transparent);
    border-radius: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: MessageBubble
// PURPOSE: Individual message bubble (user or assistant)
// WHY: Visual distinction between user/assistant via alignment and color
// ─────────────────────────────────────────────────────────────

export const MessageBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  align-self: ${({ $role }) => ($role === 'user' ? 'flex-end' : 'flex-start')};

  ${({ $role }) =>
    $role === 'user'
      ? css`
          background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
          color: var(--text-primary, #e0ecf4);
          border-bottom-right-radius: 4px;
        `
      : css`
          background: var(--bg-surface, #1a1a24);
          color: var(--text-primary, #e0ecf4);
          border-bottom-left-radius: 4px;
        `}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: EmptyState
// PURPOSE: Placeholder shown when no messages exist yet
// ─────────────────────────────────────────────────────────────

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted, #94a3b8);
  font-size: 13px;
  line-height: 1.5;
  gap: 8px;
  user-select: none;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: SendingIndicator
// PURPOSE: Pulsing dots shown while AI is generating a response
// WHY: GPU-composited opacity animation only
// ─────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
`;

export const SendingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  align-self: flex-start;

  & > span {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-primary, #60C0F0);
    animation: ${pulse} 1.2s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: MobileOverlay
// PURPOSE: Full-screen overlay for mobile (<768px)
// WHY: On small screens, a dropdown panel is too cramped
// ─────────────────────────────────────────────────────────────

export const MobileOverlay = styled.div`
  display: none;

  @media (max-width: 767px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--bg-base, #030712);
    animation: ${fadeIn} 0.15s ease-out;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: MobileHeader
// PURPOSE: Header row in mobile overlay with close button
// ─────────────────────────────────────────────────────────────

export const MobileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: MobileCloseButton
// PURPOSE: Close button in mobile overlay header
// WHY: 44px minimum touch target
// ─────────────────────────────────────────────────────────────

export const MobileCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, #94a3b8);
  font-size: 20px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--text-muted, #94a3b8) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid #60c0f0;
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: MobileMessageList
// PURPOSE: Scrollable message area in mobile overlay (fills remaining space)
// ─────────────────────────────────────────────────────────────

export const MobileMessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: MobileInputRow
// PURPOSE: Input row pinned to bottom of mobile overlay
// WHY: Thumb-accessible at the bottom of the screen
// ─────────────────────────────────────────────────────────────

export const MobileInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-elevated, #141419);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: ErrorBanner
// PURPOSE: Error message display below the input
// WHY: Crimson Frost left border per design system handoff spec
// ─────────────────────────────────────────────────────────────

export const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 4px 12px 8px;
  border-radius: 6px;
  background: rgba(26, 26, 36, 0.95);
  border-left: 4px solid #c92a54;
  color: var(--text-primary, #e0ecf4);
  font-size: 12px;
  line-height: 1.4;
`;
