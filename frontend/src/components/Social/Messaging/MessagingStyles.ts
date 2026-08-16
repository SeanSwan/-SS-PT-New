/**
 * ============================================================================
 * FILE: MessagingStyles.ts
 * PURPOSE: Styled components for the Direct Messaging system
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 */
import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

/**
 * Reduced-motion guard for the common case: compose this into any styled
 * component whose own declaration block carries an animation or transition.
 * Two places cannot use it and guard themselves inline instead — SendButton
 * (must also neutralise `transform` on :hover/:active, and its media block has
 * to stay AFTER those rules to win on source order) and TypingDots (the
 * animation lives on a nested `span`, not the block itself). If you add an
 * animation here, it composes this or it carries its own guard.
 */
const motionSafe = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────

export const MessagingContainer = styled.div`
  display: flex;
  height: clamp(560px, calc(100vh - 210px), 900px);
  min-height: 500px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-elevated, #141419);

  @media (max-width: 768px) {
    flex-direction: column;
    /* The old 520px floor overflowed a 375x667 handset (667-210=457) and pushed
       the composer below the fold. 240px is the portrait floor — but in
       landscape 100dvh-210px is ~165px, so an unconditional 240px floor would
       recreate the exact overflow this block exists to remove. min() takes the
       viewport when the viewport is the smaller of the two. */
    height: calc(100dvh - 210px);
    min-height: min(240px, calc(100dvh - 210px));
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Conversation List (Left Panel)
// ─────────────────────────────────────────────────────────────

export const ConversationPanel = styled.div<{ $mobileHidden?: boolean }>`
  width: 320px;
  min-width: 280px;
  border-right: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  display: flex;
  flex-direction: column;
  background: var(--bg-surface, #1A1A24);

  @media (max-width: 768px) {
    width: 100%;
    min-width: unset;
    ${({ $mobileHidden }) => $mobileHidden && css`display: none;`}
  }
`;

export const ConversationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

export const ConversationTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

export const NewChatButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  background: var(--bg-base, #0A0A0F);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.15);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

export const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-soft, rgba(96, 192, 240, 0.15));
    border-radius: 4px;
  }
`;

export const ConversationItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  min-height: 64px;
  /* Reserve the border in the base state. It used to be none and only appeared
     when active, so selecting a row shifted its contents by 1px. */
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: 10px;
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
      : 'transparent'};
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
  animation: ${fadeIn} 0.3s ease;
  ${motionSafe}

  ${({ $active }) => $active && css`
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
    border-left-color: var(--accent-primary, #60C0F0);
  `}

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const Avatar = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 44}px;
  height: ${({ $size }) => $size || 44}px;
  min-width: ${({ $size }) => $size || 44}px;
  border-radius: 50%;
  overflow: hidden;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, var(--bg-base, #0A0A0F));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: ${({ $size }) => ($size || 44) * 0.38}px;
  color: var(--accent-primary, #60C0F0);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const ConversationInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ConversationName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ConversationPreview = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;

export const ConversationMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
`;

export const TimeStamp = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.625rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

export const UnreadBadge = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  /* The unread count is the single signal that pulls a trainer back into the
     app, and it was the smallest text on screen (10px) filled with a surface
     token. Now Ice Wing on Obsidian — ~9.7:1 — at a legible size. */
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--accent-primary, #60C0F0);
  border: 1px solid var(--accent-primary, #60C0F0);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--bg-base, #0A0A0F);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Message Thread (Right Panel)
// ─────────────────────────────────────────────────────────────

export const ThreadPanel = styled.div<{ $mobileHidden?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-base, #0A0A0F);

  @media (max-width: 768px) {
    ${({ $mobileHidden }) => $mobileHidden && css`display: none;`}
  }
`;

export const ThreadHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: var(--bg-surface, #1A1A24);
`;

export const BackButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent); }

  @media (max-width: 768px) {
    display: flex;
  }
`;

export const ThreadUserName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

export const ThreadUserRole = styled.div`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  text-transform: capitalize;
`;

export const MessageArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-soft, rgba(96, 192, 240, 0.12));
    border-radius: 4px;
  }
`;

export const MessageBubble = styled.div<{ $isMine: boolean }>`
  max-width: 75%;
  padding: 0.625rem 0.875rem;
  border-radius: 14px;
  animation: ${slideUp} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  ${motionSafe}
  align-self: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};

  /* Own-message fill is deepened toward the base so Frost White body text
     clears 4.5:1. Raw #8B5CF6 under #E0ECF4 measured ~3.5:1 and failed at the
     13px body size — on the majority of the screen. */
  background: ${({ $isMine }) =>
    $isMine
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 72%, var(--bg-base, #0A0A0F))'
      : 'var(--bg-surface, #1A1A24)'};

  border: ${({ $isMine }) =>
    $isMine
      ? '1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
      : '1px solid var(--border-soft, rgba(96, 192, 240, 0.1))'};

  ${({ $isMine }) => $isMine && css`
    border-bottom-right-radius: 4px;
  `}
  ${({ $isMine }) => !$isMine && css`
    border-bottom-left-radius: 4px;
  `}
`;

export const MessageText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  word-break: break-word;
`;

export const MessageTime = styled.span<{ $isMine?: boolean }>`
  display: block;
  font-family: 'Fira Code', monospace;
  /* Raised from 0.6rem (9.6px). 12px is the micro-type floor used across this
     file (UnreadBadge, ConnectionStatus) so the same class of text matches. */
  font-size: 0.75rem;
  color: ${({ $isMine }) =>
    $isMine
      ? 'rgba(224, 236, 244, 0.95)'
      : 'var(--text-muted, rgba(224, 236, 244, 0.7))'};
  margin-top: 4px;
  text-align: ${({ $isMine }) => ($isMine ? 'right' : 'left')};
`;

export const DateDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-soft, rgba(96, 192, 240, 0.1));
  }

  span {
    font-family: 'Fira Code', monospace;
    font-size: 0.65rem;
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
    white-space: nowrap;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Compose Bar
// ─────────────────────────────────────────────────────────────

export const ComposeBar = styled.form`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: var(--bg-surface, #1A1A24);
`;

export const MessageInput = styled.input`
  flex: 1;
  height: 44px;
  padding: 0 1rem;
  border-radius: 22px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.12);
  }
`;

export const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-heading, #E0ECF4);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  /* Dual-Button Glow law: a purple background throws a CYAN glow, never purple
     on purple. Was rgba(139, 92, 246, 0.4) glowing its own fill. */
  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    /* 3px offset puts the ring on the dark chrome rather than half-overlapping
       the purple fill, which only reached ~2:1 against it. */
    outline-offset: 3px;
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  /* MUST stay below the :hover/:active rules above. A media query adds no
     specificity, so an equally-weighted rule declared later would win and the
     guard would silently do nothing for the state it names. */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Empty / Loading States
// ─────────────────────────────────────────────────────────────

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
`;

export const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-secondary, #8B5CF6);
`;

export const EmptyTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

export const EmptySubtext = styled.p`
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  margin: 0;
  max-width: 280px;
`;

export const SkeletonLine = styled.div<{ $width?: string }>`
  height: 14px;
  width: ${({ $width }) => $width || '100%'};
  border-radius: 7px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent) 25%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent) 50%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease infinite;
  ${motionSafe}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: New Conversation Modal
// ─────────────────────────────────────────────────────────────

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease;
  ${motionSafe}
`;

export const ModalContent = styled.div`
  width: 90%;
  max-width: 440px;
  max-height: 80vh;
  border-radius: 16px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-surface, #1A1A24);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  ${motionSafe}
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

export const ModalTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

export const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 1rem;
  margin: 0.75rem 1.25rem;
  width: calc(100% - 2.5rem);
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;

  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.55)); }
  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const UserList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-soft, rgba(96, 192, 240, 0.12));
    border-radius: 4px;
  }
`;

export const UserItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 56px;
  padding: 0.625rem 0.75rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const UserName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const UserRole = styled.div`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  text-transform: capitalize;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Real-Time Indicators (Online + Typing)
// ─────────────────────────────────────────────────────────────

const typingDot = keyframes`
  0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
`;

export const OnlineDot = styled.span<{ $online: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  /* Was #4ECDC4 / #4A5568 — a framework-default teal and slate that exist
     nowhere in the Crystalline Swan palette. Presence now reads Ice Wing. */
  background: ${({ $online }) =>
    $online
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 25%, transparent)'};
  border: 2px solid var(--bg-surface, #1A1A24);
  flex-shrink: 0;
  transition: background 0.3s ease;
  ${motionSafe}
  ${({ $online }) => $online && css`
    box-shadow: 0 0 6px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  `}
`;

export const AvatarWrap = styled.div`
  position: relative;
  display: inline-flex;
`;

export const OnlineBadge = styled.span<{ $online: boolean }>`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $online }) =>
    $online
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 25%, transparent)'};
  border: 2px solid var(--bg-surface, #1A1A24);
  ${({ $online }) => $online && css`
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  `}
`;

export const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 1.25rem;
  min-height: 24px;
  animation: ${fadeIn} 0.2s ease;
  ${motionSafe}
`;

export const TypingDots = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-primary, #60C0F0);
    animation: ${typingDot} 1.4s ease-in-out infinite;
    @media (prefers-reduced-motion: reduce) { animation: none; }

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

export const TypingText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  font-style: italic;
`;

export const ConnectionStatus = styled.div<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  /* Was #4ECDC4 / #D4A574 — off-palette teal and tan.
     TEXT uses the SOFT danger value, not the saturated one: #C92A54 measures
     3.2-3.7:1 on our dark surfaces and fails 4.5:1 at this size, whereas
     #FF8FA3 clears it comfortably. The saturated value is reserved below for
     non-text marks (dots, rails), where the 3:1 non-text threshold applies. */
  color: ${({ $connected }) =>
    $connected
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--danger-soft-text, #FF8FA3)'};
  margin-left: auto;
`;

export const StatusDot = styled.span<{ $connected: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $connected }) =>
    $connected
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--danger-text, #C92A54)'};
  ${({ $connected }) => $connected && css`
    box-shadow: 0 0 4px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  `}
  ${({ $connected }) => !$connected && css`
    box-shadow: 0 0 4px color-mix(in srgb, var(--danger-text, #C92A54) 45%, transparent);
  `}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Error Banner + Textarea + Pending Message
// ─────────────────────────────────────────────────────────────

const bannerSlideDown = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export const ErrorBanner = styled.div<{ $persistent?: boolean }>`
  /* Was tinted #D4A574 (off-palette tan) while every other Swan surface codes
     errors with the danger token. Left rail matches the Coach error-card idiom. */
  background: color-mix(in srgb, var(--danger-text, #C92A54) 14%, var(--bg-surface, #1A1A24));
  border-bottom: 1px solid color-mix(in srgb, var(--danger-text, #C92A54) 30%, transparent);
  border-left: 3px solid var(--danger-text, #C92A54);
  color: var(--danger-soft-text, #FF8FA3);
  padding: 0.75rem 1.25rem;
  min-height: 44px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${bannerSlideDown} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  ${motionSafe}
`;

/**
 * Dismiss control for ErrorBanner. The banner itself stays a `role="alert"`
 * div — correct for announcing — but the dismiss action must be a real button:
 * it previously lived on the div's onClick, which gave keyboard users no way
 * to clear an error at all.
 */
export const ErrorDismissButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--danger-soft-text, #FF8FA3);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--danger-text, #C92A54) 22%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  ${motionSafe}
`;

export const MessageTextArea = styled.textarea`
  flex: 1;
  min-height: 44px;
  max-height: 120px;
  padding: 10px 1rem;
  border-radius: 22px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  /* 16px is a hard floor on the composer: iOS Safari force-zooms any focused
     input below it, which yanks the whole thread sideways mid-conversation. */
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  overflow-y: auto;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.12);
  }
`;

export const PendingBubble = styled.div`
  max-width: 75%;
  padding: 0.625rem 0.875rem;
  border-radius: 14px;
  border-bottom-right-radius: 4px;
  align-self: flex-end;
  background: var(--accent-secondary, #8B5CF6);
  opacity: 0.5;
  animation: ${slideUp} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`;
