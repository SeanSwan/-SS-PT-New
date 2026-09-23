# GLM-5.3 PACKET B — REAL STYLE SOURCE for the beautification review

**Date:** 2026-08-15 · **Companion to:** `GLM-COACH-JARVIS-PACKET-2026-08-15.md` (Packet A)
**Source:** `origin/main`, verbatim file contents (not summaries)

---

## Why this packet exists

Packet A gave you the architecture, the Swan Brain doctrine, Sean's Jarvis/PLAUD vision, and a
**file inventory** of the six review targets. It did **not** give you the actual styling code, so a
design critique based on Packet A alone would be inference from filenames.

This packet contains the **verbatim styled-components source** for those surfaces. Your job here is
narrower and deeper than Packet A's §A: **judge the actual visual craft and tell Sean specifically
how to beautify it.**

---

## Your remit for this packet

For each surface below, produce a hostile, specific critique **anchored to real line-level
evidence you can see in the code**, then the concrete upgrade.

Run every surface against this checklist (from SwanStudios' mandatory design discipline):

1. **Generic / template feel** — does it look like any bootstrap dashboard, or like SwanStudios?
2. **Hierarchy** — is the most important thing on screen the most visually dominant thing?
3. **Spacing rhythm** — consistent scale, or arbitrary px values scattered around?
4. **Cheap chrome** — flat `box-shadow: 0 2px 4px rgba(0,0,0,.2)`-grade shadows, 1px grey borders,
   default border-radius, unstyled scrollbars, icon sizing drift.
5. **Depth / atmosphere** — flat fills vs layered surface treatment. Dark-first means the dark state
   is the designed state, not an inverted light theme.
6. **Mobile** — density and squeeze at 320 / 375 / 414px. Overflow, clipped text, hover-only actions.
7. **Motion** — dead, noisy, or excessive; GPU-safe; `prefers-reduced-motion` honoured.
8. **Contrast** — WCAG 4.5:1 for text. Call out any pair you believe fails, with the two values.
9. **44px touch targets** — flag anything smaller that is interactive.
10. **Token discipline** — SwanStudios law is `var(--token, #fallback)`. **Hardcoded hex is a
    violation.** Count and cite them.

### Palette law (violations are findings)
- Midnight Sapphire `#002060` (button bg) · Royal Depth `#003080` (elevated surface)
- Ice Wing `#60C0F0` (glow/accent) · Arctic Cyan `#50A0F0` (**charts only — never buttons/glow**)
- Gilded Fern `#C6A84B` (gold — **restricted**: a PR numeral, a ≤1px filigree line, a focus ring,
  or ONE badge per scene. Not a general warm accent.)
- Frost White `#E0ECF4` (text) · Obsidian `#0A0A0F` (bg) · Carbon `#141419` · Graphite `#1A1A24`
- Wing Purple `#8B5CF6` (glow accent) · Swan Lavender `#4070C0`
- **Dual-Button Glow:** blue bg → purple glow; purple bg → cyan glow.
- **RETIRED — any use is a defect:** Galaxy-Swan `#0a0a1a`, `#00FFFF`, `#7851A9`.
- Type: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI).
- **No Material-UI.** styled-components only.

### Required output for Packet B

`## P1. Per-surface hostile critique` — one subsection per surface, findings ranked worst-first,
each with **file + what you saw + why it's weak + the concrete replacement**. Cite actual
identifiers/values from the source, not generalities.

`## P2. Cross-cutting defects` — problems that repeat across surfaces (token drift, shadow
inconsistency, spacing-scale chaos, duplicated primitives that should be one shared component).

`## P3. The beautification plan for the client ↔ trainer chat` — Sean named this surface
explicitly. Give it the deepest treatment: full restyle direction, the signature visual moment,
message-bubble architecture, list/thread hierarchy, empty/loading/error states, and mobile.

`## P4. Shared primitives to extract` — the specific components that should exist once and be
reused across Coach, Logger, Planner, Bootcamp and Chat.

`## P5. Ranked build order` — highest visual-impact-per-effort first, with real file paths.

Be concrete. "Improve the hierarchy" is a failed finding. "The thread header at
`MessageThread.styles.ts` uses the same 14px/500 as the message body, so the conversation has no
anchor — raise it to 18px/600 Plus Jakarta Sans and add a 1px `#C6A84B` filigree underline" is a
finding.

---

## SOURCE FILES (verbatim from `origin/main`)


## SURFACE 5 — CLIENT <-> TRAINER/TEAM CHAT (Sean's named beautification target)

### FILE: frontend/src/components/Social/Messaging/MessagingStyles.ts
```ts
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
    height: calc(100dvh - 210px);
    min-height: 520px;
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
  border: none;
  border-radius: 10px;
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
      : 'transparent'};
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
  animation: ${fadeIn} 0.3s ease;

  ${({ $active }) => $active && css`
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
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
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--bg-primary, #002060);
  border: 1px solid var(--accent-primary, #60C0F0);
  box-shadow: 0 0 8px rgba(96, 192, 240, 0.4);
  font-family: 'Sora', sans-serif;
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
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
  align-self: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};

  background: ${({ $isMine }) =>
    $isMine
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'var(--bg-surface, #1A1A24)'};

  border: ${({ $isMine }) =>
    $isMine
      ? 'none'
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
  font-size: 0.6rem;
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

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
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
  background: ${({ $online }) => ($online ? '#4ECDC4' : '#4A5568')};
  border: 2px solid var(--bg-surface, #1A1A24);
  flex-shrink: 0;
  transition: background 0.3s ease;
  ${({ $online }) => $online && `box-shadow: 0 0 6px rgba(78, 205, 196, 0.5);`}
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
  background: ${({ $online }) => ($online ? '#4ECDC4' : '#4A5568')};
  border: 2px solid var(--bg-surface, #1A1A24);
  ${({ $online }) => $online && `box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);`}
`;

export const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 1.25rem;
  min-height: 24px;
  animation: ${fadeIn} 0.2s ease;
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
  font-size: 0.6rem;
  color: ${({ $connected }) => ($connected ? '#4ECDC4' : '#D4A574')};
  margin-left: auto;
`;

export const StatusDot = styled.span<{ $connected: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $connected }) => ($connected ? '#4ECDC4' : '#D4A574')};
  ${({ $connected }) => $connected && `box-shadow: 0 0 4px rgba(78, 205, 196, 0.5);`}
  ${({ $connected }) => !$connected && `box-shadow: 0 0 4px rgba(212, 165, 116, 0.4);`}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Error Banner + Textarea + Pending Message
// ─────────────────────────────────────────────────────────────

const bannerSlideDown = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export const ErrorBanner = styled.div<{ $persistent?: boolean }>`
  background: color-mix(in srgb, #D4A574 15%, var(--bg-surface, #1A1A24));
  border-bottom: 1px solid color-mix(in srgb, #D4A574 30%, transparent);
  color: #D4A574;
  padding: 0.75rem 1.25rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${bannerSlideDown} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, #D4A574 25%, var(--bg-surface, #1A1A24));
  }
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
  font-size: 0.8125rem;
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
```

### FILE: frontend/src/components/Social/Messaging/MessageThread.styles.ts
```ts
import styled from 'styled-components';
import { Loader2 } from 'lucide-react';

export const ErrorMessageText = styled.span`
  flex: 1;
`;

export const LoadingMessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 1rem 0;
`;

export const LoadingMessageRow = styled.div<{ $alignEnd?: boolean }>`
  align-self: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};
  max-width: 60%;
`;

export const ReadReceiptWrap = styled.span<{ $read?: boolean }>`
  display: inline-flex;
  margin-left: 4px;
  vertical-align: middle;
  color: ${({ $read }) => ($read ? 'var(--accent-primary, #60C0F0)' : 'currentColor')};
`;

export const PendingSpinnerIcon = styled(Loader2)`
  display: inline;
  margin-right: 4px;
  vertical-align: middle;
`;
```

### FILE: frontend/src/components/Social/Messaging/ConversationListPanel.styles.ts
```ts
import styled, { css } from 'styled-components';

export const HeaderCopy = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
`;

export const HeaderKicker = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
`;

export const InboxTools = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

export const MetricRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
`;

export const MetricPill = styled.div<{ $urgent?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--accent-primary, #60C0F0) 8%);
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.72rem;

  strong {
    color: ${({ $urgent }) => ($urgent ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)')};
    font-family: 'Sora', sans-serif;
    font-size: 0.95rem;
  }
`;

export const SearchBox = styled.label`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: var(--bg-base, #0A0A0F);
  color: var(--accent-primary, #60C0F0);
  padding: 0 0.75rem;
`;

export const InboxSearch = styled.input`
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }
`;

export const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem;
`;

export const FilterButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  text-transform: capitalize;

  ${({ $active }) => $active && css`
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    color: var(--text-primary, #E0ECF4);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  `}

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const RoleLine = styled.div<{ $group?: boolean }>`
  color: ${({ $group }) => ($group ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.65rem;
  margin-top: 2px;
  text-transform: capitalize;
`;

export const SkeletonConversationRow = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  align-items: center;
`;

export const SkeletonAvatar = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
`;

export const SkeletonStack = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;```

### FILE: frontend/src/components/Social/Messaging/GroupMessageBubble.styles.ts
```ts
import styled, { css } from 'styled-components';
import type { GroupRole } from './MessagingTypes';

const roleTone = (role: GroupRole) => {
  if (role === 'owner') return 'var(--accent-gold, #C6A84B)';
  if (role === 'admin') return 'var(--accent-primary, #60C0F0)';
  return 'var(--accent-secondary, #8B5CF6)';
};

export const GroupMessageBubbleRow = styled.div<{ $isMine: boolean }>`
  display: flex;
  flex-direction: ${({ $isMine }) => ($isMine ? 'row-reverse' : 'row')};
  align-items: flex-end;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  gap: 0.65rem;
  width: 100%;
  padding: 0.25rem 0;
`;

export const GroupMessageAvatar = styled.div<{ $isMine: boolean }>`
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $isMine }) => (
    $isMine
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)'
  )};
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent), transparent 34%),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, var(--bg-base, #0A0A0F));
  color: var(--text-heading, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  box-shadow: 0 10px 20px color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const GroupMessageContent = styled.div<{ $isMine: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  max-width: min(74%, 560px);
  min-width: 0;

  @media (max-width: 640px) {
    max-width: calc(100% - 48px);
  }
`;

export const GroupSpeakerLine = styled.div<{ $isMine: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  gap: 0.45rem;
  margin: 0 0 0.28rem;
  max-width: 100%;
`;

export const GroupSpeakerName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
`;

export const GroupRoleBadge = styled.span<{ $role: GroupRole }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 0.45rem;
  border-radius: 999px;
  border: 1px solid ${({ $role }) => `color-mix(in srgb, ${roleTone($role)} 42%, transparent)`};
  background: ${({ $role }) => `color-mix(in srgb, ${roleTone($role)} 14%, transparent)`};
  color: ${({ $role }) => roleTone($role)};
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const GroupBubbleCard = styled.div<{ $isMine: boolean }>`
  width: fit-content;
  max-width: 100%;
  padding: 0.72rem 0.9rem;
  border-radius: 16px;
  border: 1px solid ${({ $isMine }) => (
    $isMine
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
  )};
  background: ${({ $isMine }) => (
    $isMine
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 62%, var(--bg-primary, #002060)))'
      : 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, var(--accent-primary, #60C0F0)), var(--bg-surface, #1A1A24))'
  )};
  box-shadow: ${({ $isMine }) => (
    $isMine
      ? '0 14px 30px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)'
      : '0 12px 28px color-mix(in srgb, var(--bg-base, #0A0A0F) 45%, transparent)'
  )};

  ${({ $isMine }) => $isMine && css`
    border-bottom-right-radius: 6px;
  `}

  ${({ $isMine }) => !$isMine && css`
    border-bottom-left-radius: 6px;
  `}
`;

export const GroupMessageMeta = styled.span<{ $isMine: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  gap: 0.25rem;
  margin-top: 0.45rem;
  color: ${({ $isMine }) => (
    $isMine
      ? 'var(--text-heading, #E0ECF4)'
      : 'var(--text-muted, rgba(224, 236, 244, 0.72))'
  )};
  font-family: 'Fira Code', monospace;
  font-size: 0.62rem;
`;
```

## SURFACE 1 — SWAN COACH message/chat styling

### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/styles/CoachMessageStyles.ts
```ts
/**
 * ============================================================================
 * FILE: CoachMessageStyles.ts
 * PURPOSE: Message bubbles, timestamps, actions, and typing indicator styles
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import styled from 'styled-components';
import { fadeIn, bounce, diamondShimmer } from './CoachAnimations';

// ─────────────────────────────────────────────────────────────
// SECTION: Messages Area
// ─────────────────────────────────────────────────────────────
/* DESIGN-3: Glassmorphism chat container — backdrop-filter blur 16px */
export const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  scroll-behavior: smooth;
  background: rgba(var(--midnight-sapphire-rgb, 0, 32, 96), 0.15);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  /* Phase 11.1 CLS reduction 2026-04-14: positioning parent for the
     absolute-overlay SuggestedPrompts component. Without this, the
     prompts overlay would escape to the next position:relative ancestor
     and break its centering. */
  position: relative;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
    border-radius: 2px;
  }

  @media (max-width: 375px) {
    padding: 10px 8px;
    gap: 8px;
  }

  @media (min-width: 1024px) {
    padding: 20px 24px;
    max-width: 100%;
    width: 100%;
  }

  @media (min-width: 2560px) {
    max-width: 100%;
    padding: 24px 32px;
    gap: 16px;
  }

  @media (min-width: 3840px) {
    max-width: 100%;
    padding: 32px 48px;
    gap: 20px;
  }
`;

/* DESIGN-3: Coach bubble — Royal Depth bg + Ice Wing left border 3px
 * Glassmorphism with backdrop-filter blur 16px */
export const MessageBubbleAI = styled.div`
  background: rgba(var(--royal-depth-rgb, 0, 48, 128), 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(var(--ice-wing-rgb, 96, 192, 240), 0.12);
  border-left: 3px solid var(--ice-wing, rgb(96, 192, 240));
  border-radius: 16px 16px 16px 4px;
  padding: 14px 16px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  line-height: 1.65;
  animation: ${fadeIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  max-width: 92%;
  word-wrap: break-word;
  overflow-wrap: break-word;

  /* Markdown-like content formatting */
  strong { color: var(--accent-primary, #60C0F0); }
  code {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
  }

  @media (max-width: 520px) {
    font-size: 14px;
    line-height: 1.5;
    padding: 12px 14px;
    max-width: 100%;
  }

  @media (max-width: 375px) {
    font-size: 14px;
    line-height: 1.5;
    padding: 10px 12px;
    max-width: 96%;
  }

  @media (min-width: 1200px) {
    font-size: 15px;
    max-width: 80%;
  }

  @media (min-width: 2560px) {
    font-size: 17px;
    padding: 16px 20px;
  }

  @media (min-width: 3840px) {
    font-size: 20px;
    padding: 20px 24px;
  }
`;

/* DESIGN-3: User bubble — Carbon bg + Wing Purple right border 3px */
export const MessageBubbleUser = styled.div`
  background: var(--carbon, #141419);
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.2);
  border-right: 3px solid var(--wing-purple, rgb(139, 92, 246));
  border-radius: 16px 16px 4px 16px;
  padding: 14px 16px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  margin-left: auto;
  max-width: 85%;
  animation: ${fadeIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 375px) {
    font-size: 15px;
    padding: 10px 12px;
    max-width: 92%;
  }

  @media (min-width: 1200px) {
    font-size: 15px;
    max-width: 70%;
  }

  @media (min-width: 2560px) {
    font-size: 17px;
    padding: 16px 20px;
  }

  @media (min-width: 3840px) {
    font-size: 20px;
    padding: 20px 24px;
  }
`;

export const MessageTime = styled.span`
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
  margin-top: 6px;

  @media (min-width: 768px) {
    font-size: 12px;
  }

  @media (min-width: 1200px) {
    font-size: 11px;
  }
`;

export const MessageActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
`;

export const MessageActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 14px;

  @media (min-width: 768px) {
    font-size: 13px;
    padding: 6px 12px;
    min-height: 44px;
  }

  @media (min-width: 1200px) {
    font-size: 12px;
  }
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Typing Indicator
// ─────────────────────────────────────────────────────────────
export const TypingWrap = styled.div`
  display: flex;
  gap: 4px;
  padding: 14px 16px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 16px 16px 16px 4px;
  max-width: 80px;

  @media (prefers-reduced-motion: reduce) {
    span { animation: none !important; }
  }
`;

export const TypingDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
  animation: ${bounce} 1.2s ease-in-out infinite;

  &:nth-child(2) { animation-delay: 0.15s; }
  &:nth-child(3) { animation-delay: 0.3s; }
`;

/* DESIGN-2: Crystalline diamond thinking indicator
 * - clip-path polygon for diamond shape (no rotation transforms)
 * - Staggered shimmer: 0s, 0.2s, 0.4s
 * - GPU-composited via translateZ(0) */
export const ThinkingWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 16px;
  background: rgba(var(--royal-depth-rgb, 0, 48, 128), 0.5);
  border: 1px solid rgba(var(--ice-wing-rgb, 96, 192, 240), 0.12);
  border-left: 3px solid var(--ice-wing, rgb(96, 192, 240));
  border-radius: 16px 16px 16px 4px;
  backdrop-filter: blur(var(--glass-blur, 12px));
  max-width: 100px;

  @media (prefers-reduced-motion: reduce) {
    span { animation: none !important; opacity: 1 !important; }
  }
`;

export const ThinkingDiamond = styled.span`
  width: 12px;
  height: 12px;
  /* Diamond via clip-path — zero rotation transforms */
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: linear-gradient(
    135deg,
    var(--color-ice-wing-peak, #80E0FF),
    var(--ice-wing, rgb(96, 192, 240)),
    var(--color-swan-lavender-base, #50A0D0)
  );
  will-change: transform, opacity;
  animation: ${diamondShimmer} 1.6s ease-in-out infinite;

  &:nth-child(2) { animation-delay: var(--animation-shimmer-stagger-2, 0.2s); }
  &:nth-child(3) { animation-delay: var(--animation-shimmer-stagger-3, 0.4s); }
`;
```

### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.styles.ts
```ts
import styled from 'styled-components';

export const ActionCard = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-accent-soft, rgba(96, 192, 240, 0.15));
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, var(--bg-surface, #1A1A24));
`;

export const CardTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

export const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

export const CardLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  min-width: 100px;
`;

export const CardValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  word-break: break-all;
`;

export const ErrorActionCard = styled(ActionCard)`
  border-color: var(--danger-border-soft, rgba(201, 42, 84, 0.3));
`;

export const CriticalActionCard = styled(ActionCard)`
  border-color: var(--danger-text, #C92A54);
`;

export const ErrorCardTitle = styled(CardTitle)`
  color: var(--danger-text, #C92A54);
`;

export const SoftErrorCardTitle = styled(CardTitle)`
  color: var(--danger-soft-text, #ff8fa3);
`;

export const SuccessCardValue = styled(CardValue)`
  color: var(--success-text, #10B981);
`;

export const FailureCardValue = styled(CardValue)`
  color: var(--danger-text, #C92A54);
`;

export const PainFlagsWrap = styled.div`
  margin-top: 8px;
`;

export const ProgressBar = styled.div<{ $pct: number }>`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  overflow: hidden;
  max-width: 120px;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => $pct}%;
    background: var(--accent-secondary, #8B5CF6);
    border-radius: 3px;
  }
`;

export const TranscriptCard = styled(ActionCard)`
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
`;

export const TranscriptErrorCard = styled(TranscriptCard)`
  border-color: var(--danger-border-soft, rgba(201, 42, 84, 0.3));
`;

export const TranscriptDetails = styled.details`
  margin: 10px 0 6px;

  & > summary {
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    color: var(--accent-primary, #60C0F0);
    padding: 4px 0;
    list-style: none;
    user-select: none;
  }

  & > summary::-webkit-details-marker {
    display: none;
  }

  & > pre {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg-deep-scrim, rgba(0, 0, 0, 0.25));
    color: var(--text-secondary, rgba(224, 236, 244, 0.7));
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    max-height: 240px;
    overflow-y: auto;
  }
`;

export const PainFlagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  margin-right: 6px;
  margin-bottom: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--danger-text, #C92A54) 15%, transparent);
  border: 1px solid var(--danger-border-soft, rgba(201, 42, 84, 0.3));
  color: var(--danger-soft-text, #ff8fa3);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
`;

export const ConfidenceBadge = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  display: inline-block;
  padding: 2px 8px;
  margin-left: 8px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $level }) =>
    $level === 'high'
      ? 'color-mix(in srgb, var(--success-text, #10B981) 18%, transparent)'
      : $level === 'medium'
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
        : 'color-mix(in srgb, var(--danger-text, #C92A54) 18%, transparent)'};
  color: ${({ $level }) =>
    $level === 'high'
      ? 'var(--success-text, #10B981)'
      : $level === 'medium'
        ? 'var(--accent-primary, #60C0F0)'
        : 'var(--danger-soft-text, #ff8fa3)'};
`;

export const TranscriptActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

export const TranscriptBtn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: ${({ $primary, $danger }) =>
    $primary
      ? 'none'
      : $danger
        ? '1px solid var(--danger-border, rgba(201, 42, 84, 0.4))'
        : '1px solid var(--border-strong, rgba(255, 255, 255, 0.15))'};
  background: ${({ $primary, $danger }) =>
    $primary
      ? 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-data, #50A0F0))'
      : $danger
        ? 'color-mix(in srgb, var(--danger-text, #C92A54) 12%, transparent)'
        : 'var(--surface-subtle, rgba(255, 255, 255, 0.04))'};
  color: ${({ $primary, $danger }) =>
    $primary ? 'var(--bg-base, #0A0A0F)' : $danger ? 'var(--danger-soft-text, #ff8fa3)' : 'var(--text-primary, #e2e8f0)'};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ReceiptActionButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary, #002060) 82%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, var(--bg-surface, #1A1A24))
    );
  color: var(--text-primary, #E0ECF4);
  padding: 0 14px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }
`;

export const TranscriptError = styled.div<{ $kind?: 'duplicate_date' | 'future_date' | 'warning' | 'other' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $kind }) =>
    $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
      ? 'color-mix(in srgb, var(--warning-text, #F5D678) 12%, transparent)'
      : 'color-mix(in srgb, var(--danger-text, #C92A54) 12%, transparent)'};
  border: 1px solid
    ${({ $kind }) =>
      $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
        ? 'color-mix(in srgb, var(--warning-text, #F5D678) 40%, transparent)'
        : 'var(--danger-border-soft, rgba(201, 42, 84, 0.3))'};
  color: ${({ $kind }) =>
    $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
      ? 'var(--warning-text, #F5D678)'
      : 'var(--danger-soft-text, #ff8fa3)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.45;
`;

export const DateRow = styled(CardRow)`
  margin-top: 4px;
`;

export const DateInput = styled.input.attrs({ type: 'date' })`
  background: var(--bg-deep-scrim, rgba(0, 0, 0, 0.25));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  border-radius: 6px;
  padding: 6px 10px;
  min-height: 44px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color-scheme: dark;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/VoiceRecordingOverlay.styles.ts
```ts
import styled, { keyframes } from 'styled-components';
import { Loader } from 'lucide-react';

const pulseRing = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  /* Portaled to document.body: an active dictation session outranks all
     page chrome incl. the coach ops drawer band (10040-10050). Inline
     z-index 1000 was buried under it (cube bug class). */
  z-index: 10060;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: color-mix(in srgb, var(--bg-base, #030712) 92%, transparent);
  backdrop-filter: blur(12px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const OrbContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const RecordingOrb = styled.button<{ $recording: boolean }>`
  width: 80px;
  height: 80px;
  min-width: 80px;
  min-height: 80px;
  border-radius: 50%;
  border: 0;
  background: ${({ $recording }) =>
    $recording
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'
      : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: background 0.3s ease;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const PulseRing = styled.span`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid var(--accent-primary, #60C0F0);
  animation: ${pulseRing} 1.5s ease-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

/* Live mic-level halo: transform/opacity driven imperatively per frame
   from the recorder's analyser (GPU-safe; no per-frame React state).
   Stays invisible until speech is detected — proof the mic hears you. */
export const LevelRing = styled.span`
  position: absolute;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 3px solid var(--accent-secondary, #8B5CF6);
  opacity: 0;
  will-change: transform, opacity;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

export const DurationText = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 24px;
  color: var(--text-primary, #E0ECF4);
`;

export const StatusText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  text-align: center;
  max-width: 300px;
  min-height: 20px;
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
  justify-content: center;
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  min-height: 48px;
  border-radius: 12px;
  border: ${({ $variant }) =>
    $variant === 'ghost'
      ? '1px solid var(--border-soft, rgba(96, 192, 240, 0.12))'
      : '0'};
  background: ${({ $variant }) =>
    $variant === 'ghost'
      ? 'transparent'
      : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 0.2s ease;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

export const SpinIcon = styled(Loader)`
  animation: ${spin} 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
```

## SURFACE 2 — WORKOUT LOGGER

### FILE: frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.styles.ts
```ts
/**
 * EnhancedWorkoutLogger Styles
 * ============================
 *
 * Keeps the canonical admin/trainer workout logger component under the
 * project line cap while preserving its existing dark-first layout.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

export const WorkoutContainer = styled(motion.div)`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 100vh;
  background: linear-gradient(135deg,
    rgba(var(--obsidian-black-rgb, 10, 10, 15), 0.95) 0%,
    rgba(var(--wing-purple-rgb, 139, 92, 246), 0.1) 50%,
    rgba(var(--wing-purple-rgb, 139, 92, 246), 0.05) 100%
  );

  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

export const NavigationBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

export const CenteredLoading = styled.div`
  align-items: center;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 60vh;
`;

export const ActionRow = styled.div<{ $center?: boolean; $bottom?: string }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ $bottom }) => ($bottom ? '1rem' : '0.75rem')};
  justify-content: ${({ $center }) => ($center ? 'center' : 'flex-start')};
  margin-bottom: ${({ $bottom }) => $bottom ?? '0'};
`;

export const ErrorContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: rgba(var(--frost-white-rgb, 224, 236, 244), 0.9);

  .error-icon {
    color: var(--warning, #f59e0b);
    margin-bottom: 1.5rem;
  }

  h3 {
    color: var(--text-primary, #E0ECF4);
    margin-bottom: 1rem;
  }

  p {
    margin-bottom: 2rem;
    max-width: 500px;
    line-height: 1.6;
    color: rgba(var(--frost-white-rgb, 224, 236, 244), 0.8);
  }
`;
```

### FILE: frontend/src/components/WorkoutLogger/ExerciseCardComponent.styles.ts
```ts
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { CS, reducedMotionSafe, withAlpha } from './WorkoutLoggerCS';

export const CardContainer = styled(motion.div)<{ $isSuperset?: boolean }>`
  background: ${withAlpha(CS.cardDark, 0.7)};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  /* Lens token seam: recipes may retune the panel radius; host value is the fallback. */
  border-radius: var(--world-panel-radius, 1.5rem);
  padding: 2rem;
  margin-bottom: ${({ $isSuperset }) => $isSuperset ? '0.25rem' : '1.5rem'};
  border: 1px solid ${({ $isSuperset }) => $isSuperset ? withAlpha(CS.secondary, 0.2) : withAlpha(CS.text, 0.03)};
  box-shadow: 0 8px 32px ${withAlpha(CS.bgDeep, 0.4)}, 0 0 40px ${withAlpha(CS.glow, 0.02)};
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 1rem;
    left: 0;
    bottom: 1rem;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, ${CS.glow}, ${CS.gaming});
    opacity: 0.6;
    transition: opacity 0.3s;
  }

  &:hover {
    border-color: ${withAlpha(CS.glow, 0.3)};
    transform: translateY(-2px);
    box-shadow: 0 16px 48px ${withAlpha(CS.bgDeep, 0.4)}, 0 0 60px ${withAlpha(CS.glow, 0.08)};
    &::before { opacity: 1; }
  }

  ${reducedMotionSafe}

  @media (max-width: 430px) {
    padding: 1.25rem;
    border-radius: var(--world-panel-radius, 1rem);
  }
`;

export const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  @media (max-width: 768px) { flex-direction: column; }
`;

export const ExerciseTitle = styled.div`
  flex: 1;

  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${CS.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.01em;
    svg { color: ${CS.gaming}; }
  }
`;

export const ExerciseRatings = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 100%;

  @media (max-width: 768px) {
    width: 100%;
    gap: 1rem;
  }
`;

export const RatingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1 1 220px;
  min-width: min(100%, 220px);
  max-width: 100%;

  @media (max-width: 430px) {
    min-width: auto;
    width: 100%;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${CS.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: 'Sora', sans-serif;
  }
`;

export const RatingControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  max-width: 100%;
`;

export const StarRatingContainer = styled.div`
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  max-width: 100%;
  row-gap: 0.125rem;
`;

export const StarButton = styled.button<{ $filled: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    width: 20px;
    height: 20px;
    fill: ${({ $filled }) => $filled ? CS.accent : 'none'};
    stroke: ${CS.accent};
    transition: fill 0.15s, transform 0.15s;
  }

  &:hover svg { fill: ${CS.accent}; transform: scale(1.15); }
  &:focus-visible { outline: 2px solid ${CS.glow}; outline-offset: 2px; border-radius: 0.375rem; }
`;

export const SliderInput = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, ${withAlpha(CS.gaming, 0.15)}, ${withAlpha(CS.glow, 0.2)});
  outline: none;
  appearance: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    box-shadow: 0 2px 8px ${withAlpha(CS.glow, 0.4)}, 0 0 12px ${withAlpha(CS.glow, 0.2)};
    border: 2px solid ${withAlpha(CS.text, 0.2)};
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    border: 2px solid ${withAlpha(CS.text, 0.2)};
    box-shadow: 0 2px 8px ${withAlpha(CS.glow, 0.4)};
  }

  &:focus-visible { outline: 2px solid ${CS.gaming}; outline-offset: 4px; }
`;

export const SliderValue = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${CS.glowLight};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
`;

export const RemoveExerciseBtn = styled.button`
  background: ${CS.errorBg};
  border: 1px solid ${CS.errorBorder};
  border-radius: 0.5rem;
  color: ${CS.errorText};
  cursor: pointer;
  padding: 0.5rem;
  align-self: flex-start;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${withAlpha(CS.error, 0.25)};
    border-color: ${withAlpha(CS.error, 0.5)};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${CS.error};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${CS.errorBg};
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const SupersetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  margin-left: 0.5rem;
  border-radius: 999px;
  background: ${withAlpha(CS.secondary, 0.15)};
  color: ${CS.gaming};
  border: 1px solid ${withAlpha(CS.secondary, 0.3)};
  text-transform: uppercase;
`;

/* Phase 3c.2: link/unlink-with-previous superset control (44px target). */
export const SupersetLinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  min-width: 44px;
  margin-top: 0.25rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  color: ${CS.gaming};
  border: 1px solid ${withAlpha(CS.secondary, 0.35)};

  &[aria-pressed='true'] {
    background: ${withAlpha(CS.secondary, 0.18)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.secondary};
    outline-offset: 2px;
  }
`;
```

### FILE: frontend/src/components/WorkoutLogger/ExerciseSetRow.styles.ts
```ts
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';
import { TRAIN } from '../../styles/train-tokens';

export const SetsTable = styled.div`
  background: ${withAlpha(CS.bgDeep, 0.6)};
  /* Lens token seam: row-surface radius follows the active recipe. */
  border-radius: var(--world-row-radius, 1rem);
  /* Honest overflow: narrow desktop bands (sidebar open ~1181-1320px) scroll
     horizontally instead of silently clipping the Log/Remove columns. */
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid ${withAlpha(CS.text, 0.04)};
`;

export const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 50px minmax(80px, 0.8fr) minmax(64px, 0.6fr) minmax(110px, 1fr) minmax(120px, 1.1fr) minmax(224px, 1.7fr) minmax(110px, 1fr) minmax(140px, 1.4fr) 48px 44px;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: ${withAlpha(CS.surfaceDark, 0.8)};
  font-weight: 700;
  font-size: 0.7rem;
  color: ${CS.gaming};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: 'Sora', sans-serif;
  border-bottom: 1px solid ${CS.glassBorder};
  @media (max-width: 1180px) { display: none; }

  /* Phase-2C law: phones show the essentials header (Set | Weight | Reps | Log). */
  @media (max-width: 767px) {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) minmax(0, 1fr) 48px;
    padding: 0.625rem 0.875rem;
    & > div:not([data-m]) { display: none; }
  }
`;

export const SetRow = styled.div`
  display: grid;
  grid-template-columns: 50px minmax(80px, 0.8fr) minmax(64px, 0.6fr) minmax(110px, 1fr) minmax(120px, 1.1fr) minmax(224px, 1.7fr) minmax(110px, 1fr) minmax(140px, 1.4fr) 48px 44px;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${withAlpha(CS.text, 0.06)};
  border-left: 2px solid transparent;
  align-items: center;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s;

  &:last-child { border-bottom: none; }
  &:hover { background: ${withAlpha(TRAIN.active, 0.05)}; }

  /* Train state language (§12-C2): the row being edited is the ONE loud thing. */
  &:focus-within {
    border-left-color: ${TRAIN.active};
    background: ${withAlpha(TRAIN.active, 0.06)};
  }
  /* Logged rows read as earned and recede — inputs dim, gold edge holds. */
  &[data-logged='true'] {
    border-left-color: ${withAlpha(TRAIN.done, 0.55)};
    &:not(:focus-within) input { opacity: 0.72; }
  }

  @media (max-width: 1180px) {
    display: block;
    margin: 8px;
    border-radius: 8px;
    background: ${withAlpha(CS.cardDark, 0.5)};
    padding: 4px 0;
    border-bottom: none;
    &:last-child { margin-bottom: 4px; }
  }

  /* Phase-2C law grid (HOST-FIXED, lens-immutable): Set# | Weight | Reps | Log.
     Secondary fields span full width below and hide behind the details
     disclosure. 320px is a hard gate. */
  @media (max-width: 767px) {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) minmax(0, 1fr) 48px;
    grid-auto-rows: minmax(56px, auto);
    gap: 0.5rem;
    align-items: center;
    padding: 0.375rem 0.625rem;
  }
`;

export const SetCell = styled.div`
  display: contents;

  @media (max-width: 1180px) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;

    &::before {
      content: attr(data-label);
      font-weight: 700;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${CS.textMuted};
      min-width: 60px;
      flex-shrink: 0;
      font-family: 'Sora', sans-serif;
    }

    &[data-label=""]::before { display: none; }

    & > input,
    & > div {
      flex: 1;
      min-width: 0;
    }
  }

  @media (max-width: 430px) { padding: 6px 10px; }

  /* Phase-2C law grid roles on phones. */
  @media (max-width: 767px) {
    &[data-essential='cell'] {
      display: contents;
      &::before { content: none; }
    }
    &[data-essential='log'] {
      display: flex;
      align-items: center;
      justify-content: center;
      grid-row: 1;
      grid-column: 4;
      padding: 0;
      &::before { content: none; }
    }
    &:not([data-essential]) { grid-column: 1 / -1; }
    ${SetRow}[data-details='closed'] &:not([data-essential]) { display: none; }
  }
`;

export const SetNumber = styled.div`
  font-weight: 700;
  color: ${TRAIN.pending};
  font-size: 1.1rem;
  text-align: center;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
  transition: color 0.2s;

  /* State language: pending recedes, the active row lights Ice Wing, logged holds gold. */
  ${SetRow}:focus-within & { color: ${TRAIN.active}; }
  ${SetRow}[data-logged='true'] & { color: ${TRAIN.done}; }
`;

export const NumberInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: ${withAlpha(CS.cardDark, 0.6)};
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  text-align: center;
  font-size: 0.9rem;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${TRAIN.active};
    box-shadow: 0 0 0 2px ${withAlpha(TRAIN.active, 0.15)};
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] { -moz-appearance: textfield; }
  @media (max-width: 1180px) { min-height: 48px; }
  @media (max-width: 430px) { font-size: 16px; padding: 10px; }
`;

export const WeightInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  @media (max-width: 1180px) { flex: 1; }
`;

export const TextInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: ${withAlpha(CS.cardDark, 0.6)};
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${TRAIN.active};
    box-shadow: 0 0 0 2px ${withAlpha(TRAIN.active, 0.15)};
  }

  &::placeholder { color: ${withAlpha(CS.text, 0.4)}; }
  @media (max-width: 1180px) { min-height: 48px; }
  @media (max-width: 430px) { font-size: 16px; }
`;

export const AddSetButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: ${withAlpha(TRAIN.active, 0.08)};
  border: 2px dashed ${withAlpha(TRAIN.active, 0.3)};
  border-radius: 0.75rem;
  color: ${CS.glowLight};
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  min-height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${withAlpha(TRAIN.active, 0.15)};
    border-color: ${withAlpha(TRAIN.active, 0.5)};
    border-style: solid;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${TRAIN.active};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${withAlpha(TRAIN.active, 0.15)};
  }
`;

export { SetLogCheckButton, SetDetailsToggle, LastWeightChip } from './ExerciseSetRowControls.styles';

export const RemoveSetButton = styled.button`
  background: ${withAlpha(CS.error, 0.1)};
  border: 1px solid ${withAlpha(CS.error, 0.3)};
  border-radius: 0.5rem;
  color: ${CS.errorText};
  cursor: pointer;
  padding: 0.25rem;
  min-width: 44px;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${withAlpha(CS.error, 0.2)};
    border-color: ${withAlpha(CS.error, 0.5)};
    box-shadow: 0 0 12px ${withAlpha(CS.error, 0.2)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.errorText};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${withAlpha(CS.error, 0.15)};
  }

  &:disabled { opacity: 0.3; cursor: not-allowed; }
  svg { width: 18px; height: 18px; }
`;
```

## SURFACE 3 — WORKOUT PLANNER

### FILE: frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.styles.ts
```ts
import styled from 'styled-components';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';
import {
  EmptyMessage,
  ExerciseName,
  GeneratingSkeletonRow,
  MesocycleCard,
  MiniInput,
  Panel,
  PlanModeLabel,
  ScheduleDay,
  ScheduleDayNumber,
} from './WorkoutPlannerStyles';

export const ResultsCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: rgba(224, 236, 244, 0.5);
`;

export const FiltersPane = styled.div`
  flex-shrink: 0;
  padding: 12px 16px 4px;
  display: flex;
  flex-direction: column;
  gap: 0;
`;

export const ExerciseListPane = styled.div`
  flex: 1;
  min-height: 0;
  padding: 0 16px 8px;
`;

export const DegradedPanel = styled(Panel)<{ $degraded?: boolean }>`
  border: ${({ $degraded }) => ($degraded ? `1px solid ${PLANNER_GOLD}` : undefined)};
`;

export const ActionWrap = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SkeletonDelayRow = styled(GeneratingSkeletonRow)<{ $delayMs: number }>`
  animation-delay: ${({ $delayMs }) => $delayMs}ms;
`;

export const SkeletonTextStack = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const ClickableExerciseName = styled(ExerciseName)`
  cursor: pointer;
`;

export const BuilderParamGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;

  @container (max-width: 640px) {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 100%;

    & > div { min-width: 0; }
    input { box-sizing: border-box; width: 100%; }
  }
`;

export const ParamField = styled.div`
  text-align: center;
`;

export const ParamLabel = styled.div`
  font-size: 0.6rem;
  color: rgba(224, 236, 244, 0.4);
  margin-bottom: 2px;
`;

export const RepsInput = styled(MiniInput)`
  width: 64px;
`;

export const TempoInput = styled(MiniInput)`
  width: 56px;
`;

export const BuilderActionRow = styled.div`
  margin-top: 16px;
  display: flex;
  gap: 8px;
`;

export const ExplanationDetails = styled.div`
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Fira Code', monospace;
`;

export const PlanLabelBlock = styled(PlanModeLabel)<{ $top?: boolean }>`
  display: block;
  margin-top: ${({ $top }) => ($top ? '20px' : 0)};
  margin-bottom: 8px;
`;

export const ActiveScheduleDay = styled(ScheduleDay)<{ $active?: boolean }>`
  cursor: pointer;
  outline: ${({ $active }) => ($active ? '2px solid var(--accent-secondary, #8B5CF6)' : 'none')};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #1A1A24))'
      : undefined};
  transition: all 0.2s ease;
`;

export const ActiveScheduleDayNumber = styled(ScheduleDayNumber)<{ $active?: boolean }>`
  color: ${({ $active }) => ($active ? 'var(--accent-secondary, #8B5CF6)' : undefined)};
`;

export const ActiveDayDetail = styled.div`
  padding: 12px 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, var(--bg-surface, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  margin-bottom: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
`;

export const ActiveDayTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--accent-secondary, #8B5CF6);
`;

export const ActiveDayMeta = styled.div`
  color: var(--text-muted, rgba(224,236,244,0.5));
  font-size: 0.7rem;
`;

export const ClickableMesocycleCard = styled(MesocycleCard)<{ $selected?: boolean }>`
  cursor: pointer;
  text-align: left;
  outline: ${({ $selected }) => ($selected ? '2px solid var(--accent-secondary, #8B5CF6)' : 'none')};
  transition: all 0.2s ease;
`;

export const RecommendationSource = styled.span`
  margin-left: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224,236,244,0.5));
`;

export const SavedPlansCount = styled.span`
  margin-left: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224,236,244,0.5));
`;

export const SavedPlansLoading = styled.div`
  padding: 16px;
`;

export const SavedPlansEmpty = styled(EmptyMessage)`
  padding: 16px;
`;

export const PlannerHandoffActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PlannerHandoffLink = styled.a<{ $variant?: 'primary' }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? plannerGoldAlpha(0.42)
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? `color-mix(in srgb, ${PLANNER_GOLD} 12%, var(--bg-elevated, #141419))`
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-elevated, #141419))'};
  color: ${({ $variant }) =>
    $variant === 'primary'
      ? PLANNER_GOLD
      : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;
```

### FILE: frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerShell.styles.ts
```ts
/**
 * ============================================================================
 * FILE: WorkoutPlannerShell.styles.ts
 * PURPOSE: Shell, control, and panel styles for the NASM Workout Planner page
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 */

import styled, { keyframes } from 'styled-components';
import { PLANNER_GOLD } from './plannerGold';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
export const iceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────
export const Page = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  color: var(--accent-secondary, #8B5CF6);
`;

export const Title = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

export const Subtitle = styled.p`
  margin: 4px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Controls Row
// ─────────────────────────────────────────────────────────────
export const ControlRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
`;

export const Select = styled.select`
  background: var(--bg-surface, #003080);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  }

  option {
    background: var(--bg-base, #030712);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'cosmic' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  color: var(--text-primary, #E0ECF4);

  background: ${({ $variant }) =>
    $variant === 'cosmic'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%)'
      : 'var(--bg-surface, #002060)'};
  box-shadow: ${({ $variant }) =>
    $variant === 'cosmic'
      ? '0 4px 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'
      : 'none'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ $variant }) =>
      $variant === 'cosmic'
        ? '0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent)'
        : '0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'};
  }

  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Status Banner
// ─────────────────────────────────────────────────────────────
export const StatusBanner = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  background: ${({ $type }) => $type === 'error'
    ? 'rgba(26, 26, 36, 0.95)'
    : 'rgba(26, 26, 36, 0.95)'};
  border-left: 4px solid ${({ $type }) => $type === 'error' ? 'var(--danger, #C92A54)' : PLANNER_GOLD};
  color: var(--text-primary, #E0ECF4);

  .planner-status-text { flex: 1 1 220px; }
  .planner-status-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

  > button {
    background: none;
    border: none;
    color: var(--text-secondary, #94a3b8);
    font-size: 1.2rem;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { color: var(--text-primary, #E0ECF4); }

    &:focus-visible {
      outline: 2px solid var(--accent-primary, #60C0F0);
      outline-offset: 2px;
    }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Degraded Intelligence Banner
// PURPOSE: Gilded Fern-bordered warning when pain/injury data unavailable
// WHY: AI Village Phase 3 consensus — trainer must review before assigning
// ─────────────────────────────────────────────────────────────
export const DegradedBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: rgba(26, 26, 36, 0.95);
  border: 1px solid ${PLANNER_GOLD};
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    color: ${PLANNER_GOLD};
  }

  strong {
    color: ${PLANNER_GOLD};
    font-weight: 700;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Three-Panel Layout
// ─────────────────────────────────────────────────────────────
export const ThreePanel = styled.div<{ $teachModeOpen?: boolean }>`
  display: grid;
  gap: 16px;
  grid-template-columns: ${({ $teachModeOpen }) =>
    $teachModeOpen ? 'minmax(280px, 360px) 1fr minmax(280px, 360px)' : 'minmax(280px, 360px) 1fr'};
  transition: grid-template-columns 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);

  @media (max-width: 1279px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 430px) {
    gap: 10px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Panel / Card
// ─────────────────────────────────────────────────────────────
export const Panel = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const PanelHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
    border-radius: 3px;
  }

  @media (max-width: 430px) {
    max-height: 320px;
    flex: none;
  }
`;

// ─────────────────────────────────────────────────────────────
```

### FILE: frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerRolodexCard.styles.ts
```ts
/**
 * WorkoutPlannerRolodexCard.styles
 *
 * Stable card geometry for the virtualized exercise rolodex in the active
 * admin/trainer Workout Planner. The grid keeps media, exercise copy, and the
 * 44px add action aligned from narrow phone widths through desktop/4K.
 */
import styled from 'styled-components';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';

export const ExerciseAddBtn = styled.button`
  all: unset;
  grid-column: 3;
  align-self: center;
  justify-self: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 44%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 430px) { grid-column: 2; }
`;

export const ExerciseItem = styled.div<{ $selected?: boolean }>`
  box-sizing: border-box;
  width: 100%;
  height: calc(100% - 8px);
  min-width: 0;
  min-height: 132px;
  text-align: left;
  display: grid;
  grid-template-columns: clamp(72px, 24%, 96px) minmax(0, 1fr) 44px;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)' : 'var(--border-soft, rgba(96, 192, 240, 0.06))'};
  border-left: 3px solid ${({ $selected }) => $selected ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};
  border-radius: 10px;
  background: ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)' : 'color-mix(in srgb, var(--bg-elevated, #141419) 96%, transparent)'};
  color: inherit;
  font: inherit;
  cursor: pointer;
  margin-bottom: 8px;
  overflow: hidden;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, var(--bg-elevated, #141419));
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-left-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(68px, 82px) minmax(0, 1fr) 44px;
    gap: 8px;
  }

  @media (max-width: 430px) {
    grid-template-columns: minmax(0, 1fr) 44px;
    padding: 8px 10px;
  }
`;

export const PlannerMediaThumb = styled.div`
  grid-column: 1;
  min-width: 0;
  height: 100%;
  min-height: 0;
  align-self: stretch;
  display: block;
  overflow: hidden;

  > div {
    width: 100%;
    height: 100%;
    min-height: 100%;
    aspect-ratio: auto;
    margin-bottom: 0;
  }

  > div [role='img'] {
    align-content: center;
    gap: 4px;
    padding: 8px 6px;
    overflow: hidden;
  }

  > div [role='img']::before {
    width: 44px;
    height: 38px;
  }

  > div [role='img'] > div {
    max-width: 100%;
    overflow: hidden;
    overflow-wrap: anywhere;
    text-overflow: ellipsis;
  }

  > div [role='img'] > div:first-of-type,
  > div [role='img'] > div:last-of-type {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  > div [role='img'] > div:first-of-type { font-size: 0.64rem; line-height: 1.1; }
  > div [role='img'] > div:last-of-type { font-size: 0.55rem; line-height: 1.15; }

  @media (max-width: 640px) {
    > div [role='img'] { padding: 7px 5px; }
    > div [role='img']::before { width: 38px; height: 34px; }
  }

  @media (max-width: 430px) { display: none; }
`;

export const ExerciseRowContent = styled.div`
  grid-column: 2;
  min-width: 0;
  min-height: 0;
  align-self: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  overflow: hidden;

  @media (max-width: 430px) { grid-column: 1; }
`;

export const ExerciseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.3;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 3px;
  white-space: normal;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

export const ExerciseDetailLine = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.35;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
`;

export const ExerciseMeta = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  display: flex;
  column-gap: 4px;
  row-gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  max-height: 48px;
  overflow: hidden;

  & > span {
    white-space: nowrap;
    flex-shrink: 1;
    min-width: 0;
  }
`;

export const MetaTag = styled.span<{ $impact?: string }>`
  display: inline-flex;
  align-items: center;
  max-width: min(16ch, 100%);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
    if ($impact === 'Medium Impact') return plannerGoldAlpha(0.12);
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)';
  }};
  color: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'var(--accent-primary, #60C0F0)';
    if ($impact === 'Medium Impact') return PLANNER_GOLD;
    if ($impact === 'High Impact') return 'var(--danger, #C92A54)';
    return 'var(--text-muted, rgba(224, 236, 244, 0.55))';
  }};
  border: 1px solid ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)';
    if ($impact === 'Medium Impact') return plannerGoldAlpha(0.2);
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 20%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)';
  }};
  margin: 2px 3px 2px 0;
`;
```

## SURFACE 4 — BOOTCAMP CREATOR

### FILE: frontend/src/components/BootcampBuilder/BootcampBuilderStyles.ts
```ts
/**
 * ============================================================================
 * FILE: BootcampBuilderStyles.ts
 * PURPOSE: Styled components for the Bootcamp Builder UI
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */
import styled, { css } from 'styled-components';

export const PageWrapper = styled.div<{ $floorMode?: boolean }>`
  min-height: 100vh;
  padding: 20px;
  ${({ $floorMode }) => $floorMode
    ? css`background: var(--bg-base, #0A0A0F); color: var(--text-primary, #F8F9FA);`
    : css`background: var(--bg-base, #0A0A0F); color: var(--text-primary, #e0ecf4);`
  }

  @media (max-width: 430px) {
    padding: 12px;
  }

  @media (max-width: 375px) {
    padding: 8px;
  }
`;

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 8px;
  }
`;

export const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  margin: 0;

  @media (max-width: 430px) {
    font-size: 18px;
  }
`;

export const Subtitle = styled.p`
  font-size: 14px;
  opacity: 0.7;
  margin: 4px 0 0 0;
`;

export const FloorModeToggle = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 8px;
  border: 2px solid ${({ $active }) => $active ? 'var(--accent-gold, #C6A84B)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60c0f0)'};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
`;

export const ThreePane = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (max-width: 430px) {
    gap: 8px;
  }
`;

export const Panel = styled.div`
  background: var(--bg-elevated, rgba(20, 20, 25, 0.6));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: var(--world-panel-radius, 12px);
  padding: 16px;

  @media (max-width: 430px) {
    padding: 12px;
    border-radius: 8px;
  }
`;

export const PanelTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--world-accent, var(--accent-primary, #60c0f0));
`;

export const FormGroup = styled.div`
  margin-bottom: 12px;
`;

export const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  opacity: 0.7;
`;

export const Select = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 6px;
  color: var(--text-primary, #e0ecf4);
  font-size: 14px;
  &:focus { border-color: var(--accent-primary, #60c0f0); outline: none; }

  @media (max-width: 430px) {
    font-size: 16px;
    padding: 10px 14px;
  }
`;

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 6px;
  color: var(--text-primary, #e0ecf4);
  font-size: 14px;
  &:focus { border-color: var(--accent-primary, #60c0f0); outline: none; }

  @media (max-width: 430px) {
    font-size: 16px;
    padding: 10px 14px;
  }
`;

export const PrimaryButton = styled.button<{ $floorMode?: boolean }>`
  width: 100%;
  min-height: ${({ $floorMode }) => $floorMode ? '64px' : '44px'};
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--accent-primary, #60c0f0) 0%, var(--accent-secondary, #8B5CF6) 100%);
  border: none;
  border-radius: 8px;
  color: var(--text-inverse, #030712);
  font-weight: 600;
  font-size: ${({ $floorMode }) => $floorMode ? '18px' : '14px'};
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const ErrorBanner = styled.div`
  background: color-mix(in srgb, var(--danger, #C92A54) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #C92A54) 30%, transparent);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  border-left: 4px solid var(--danger, #C92A54);
`;

export const SectionDivider = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary, #60c0f0);
  margin: 16px 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
`;

export const StationCard = styled.div`
  background: var(--bg-surface, rgba(20, 20, 25, 0.7));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: var(--world-row-radius, 8px);
  padding: 12px;
  margin-bottom: 8px;
`;

export const StationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const StationName = styled.span`
  font-weight: 600;
  font-size: 14px;
`;

export const ExerciseRow = styled.button<{ $isCardio?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  font-size: 13px;
  min-height: 44px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  ${({ $isCardio }) => $isCardio && css`
    color: var(--success, #60C0F0);
    font-style: italic;
  `}

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-left-color: rgba(96, 192, 240, 0.3);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: -2px;
    border-radius: 4px;
  }

  @media (max-width: 430px) {
    padding: 10px 4px;
    font-size: 14px;
  }
`;

export const DifficultyChip = styled.span<{ $tier: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  ${({ $tier }) => {
    switch ($tier) {
      case 'easy': return css`background: color-mix(in srgb, var(--success, #60C0F0) 10%, transparent); color: var(--success, #60C0F0);`;
      case 'hard': return css`background: color-mix(in srgb, var(--danger, #C92A54) 10%, transparent); color: var(--danger, #C92A54);`;
      default: return css`background: rgba(96,192,240,0.1); color: var(--text-primary, #E0ECF4);`;
    }
  }}
`;

export const TimingBadge = styled.span`
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--text-primary, #E0ECF4);
`;

export const InsightCard = styled.div<{ $type?: string }>`
  background: ${({ $type }) => {
    switch ($type) {
      case 'overflow': return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent)';
      case 'freshness': return 'color-mix(in srgb, var(--success, #60C0F0) 6%, transparent)';
      default: return 'rgba(96, 192, 240, 0.06)';
    }
  }};
  border: 1px solid ${({ $type }) => {
    switch ($type) {
      case 'overflow': return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)';
      case 'freshness': return 'color-mix(in srgb, var(--success, #60C0F0) 20%, transparent)';
      default: return 'rgba(96, 192, 240, 0.15)';
    }
  }};
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 13px;
`;

export const ModGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 4px;
  margin-top: 4px;
`;

export const ModChip = styled.span`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;
```

### FILE: frontend/src/components/BootcampBuilder/BootcampBuilderChrome.styles.ts
```ts
import styled from 'styled-components';

export const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;
```

### FILE: frontend/src/components/BootcampBuilder/BootcampCommandDeck.styles.ts
```ts
import styled, { css } from 'styled-components';
import type { BootcampCommandDeckModel } from './BootcampCommandDeck.logic';

type ReadinessTone = BootcampCommandDeckModel['readinessTone'];

const toneStyles = {
  ready: css`
    --command-tone: var(--accent-gold, #C6A84B);
    --command-glow: color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  `,
  steady: css`
    --command-tone: var(--accent-primary, #60C0F0);
    --command-glow: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  `,
  warning: css`
    --command-tone: var(--accent-secondary, #8B5CF6);
    --command-glow: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  `,
  danger: css`
    --command-tone: var(--danger, #C92A54);
    --command-glow: color-mix(in srgb, var(--danger, #C92A54) 18%, transparent);
  `,
};

export const CommandDeckShell = styled.section<{ $tone: ReadinessTone }>`
  ${({ $tone }) => toneStyles[$tone]}
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--command-tone) 36%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 86%, transparent), color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent)),
    radial-gradient(circle at top right, var(--command-glow), transparent 42%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) inset,
    0 18px 44px color-mix(in srgb, var(--bg-base, #0A0A0F) 64%, transparent);

  @media (max-width: 430px) {
    padding: 12px;
    gap: 12px;
  }

  @media (min-width: 2200px) {
    padding: 20px;
    gap: 18px;
  }
`;

export const CommandDeckHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) minmax(220px, 1.4fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const CommandDeckKicker = styled.span`
  display: block;
  margin-bottom: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;

  @media (min-width: 2200px) {
    font-size: 13px;
  }
`;

export const CommandScoreLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
`;

export const CommandScore = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: clamp(34px, 3vw, 56px);
  line-height: 0.95;
  letter-spacing: 0;
`;

export const ReadinessPill = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--command-tone) 42%, transparent);
  color: var(--command-tone);
  background: color-mix(in srgb, var(--command-tone) 12%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
`;

export const CommandMeter = styled.div`
  width: 100%;
  height: 8px;
  overflow: hidden;
  margin-top: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
`;

export const CommandMeterFill = styled.div<{ $score: number }>`
  width: ${({ $score }) => `${$score}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--command-tone));
  transition: width 220ms cubic-bezier(0.34, 1.56, 0.64, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const NextAction = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 15px;
  line-height: 1.45;

  strong {
    color: var(--command-tone);
  }
`;

export const MetricRail = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 1.25fr) minmax(128px, 1fr) minmax(112px, 0.9fr) minmax(112px, 0.85fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-radius: 8px;
  background: var(--border-soft, rgba(96, 192, 240, 0.16));

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricSegment = styled.div`
  min-width: 0;
  padding: 10px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent);

  @media (min-width: 2200px) {
    padding: 14px;
  }
`;

export const MetricLabel = styled.span`
  display: block;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const MetricValue = styled.strong`
  display: block;
  margin-top: 4px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  line-height: 1.1;
  overflow-wrap: anywhere;

  @media (min-width: 2200px) {
    font-size: 22px;
  }
`;

export const MetricDetail = styled.span`
  display: block;
  margin-top: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 12px;
  line-height: 1.35;
`;

export const AlertStrip = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const AlertChip = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 9%, transparent);
  font-size: 12px;
  font-weight: 700;
`;

export const RepairQueue = styled.div`
  display: grid;
  gap: 8px;
`;

export const RepairQueueTitle = styled.span`
  color: var(--command-tone);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const RepairQueueList = styled.ol`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const RepairQueueItem = styled.li`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--command-tone) 28%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--command-tone) 9%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  padding: 6px 10px;
`;
```

---

## END OF PACKET B

Produce P1-P5. Anchor every finding to a real value you can see in the source above.
