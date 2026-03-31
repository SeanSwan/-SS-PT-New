/**
 * ============================================================================
 * FILE: SwanCoachStyles.ts
 * PURPOSE: Styled components for Swan Studios Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * AI VILLAGE VALIDATED: 2026-03-30
 * ============================================================================
 *
 * THEME: ALL colors use CSS custom properties with dark-first fallbacks.
 * MOBILE-FIRST: 16px minimum text, 56-64px touch targets, iOS safe-area.
 * TYPOGRAPHY: 16px mobile → 15px 1200px+ (AI Village design consensus).
 */

import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent); }
  70% { box-shadow: 0 0 0 14px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Page Layout
// ─────────────────────────────────────────────────────────────
export const CoachPage = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;
`;

export const CoachHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  flex-shrink: 0;

  @media (min-width: 1024px) {
    padding: 16px 24px;
  }
`;

export const CoachTitle = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 768px) {
    font-size: 1.25rem;
  }
`;

export const CoachHeaderIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  flex-shrink: 0;
`;

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
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
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
// SECTION: Messages Area
// ─────────────────────────────────────────────────────────────
export const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  scroll-behavior: smooth;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
    border-radius: 2px;
  }

  @media (min-width: 1024px) {
    padding: 20px 24px;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }
`;

export const MessageBubbleAI = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
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

  @media (min-width: 1200px) {
    font-size: 15px;
    max-width: 80%;
  }
`;

export const MessageBubbleUser = styled.div`
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
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

  @media (min-width: 1200px) {
    font-size: 15px;
    max-width: 70%;
  }
`;

export const MessageTime = styled.span`
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
  margin-top: 6px;
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
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
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
const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
`;

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
  padding: 6px 12px;
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

// ─────────────────────────────────────────────────────────────
// SECTION: Input Bar
// ─────────────────────────────────────────────────────────────
export const InputBar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  background: var(--bg-elevated, #141419);
  flex-shrink: 0;

  @media (min-width: 1024px) {
    padding: 14px 24px;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    border-radius: 0;
    background: var(--bg-base, #030712);
    border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
    border-bottom: none;
  }
`;

export const ChatInput = styled.textarea`
  flex: 1;
  padding: 12px 14px;
  min-height: 48px;
  max-height: 120px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 12px;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  line-height: 1.4;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.4));
  }

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  @media (min-width: 1200px) {
    font-size: 15px;
    min-height: 44px;
  }
`;

export const SendBtn = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%);
  color: #ffffff;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
  }

  &:active { transform: translateY(0); }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

export const VoiceOrbWrap = styled.button<{ $listening?: boolean; $size?: number }>`
  width: ${({ $size }) => $size || 56}px;
  height: ${({ $size }) => $size || 56}px;
  border-radius: 50%;
  border: 2px solid ${({ $listening }) =>
    $listening ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.15))'};
  background: ${({ $listening }) =>
    $listening
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'
      : 'var(--bg-base, #030712)'};
  color: ${({ $listening }) =>
    $listening ? '#ffffff' : 'var(--accent-primary, #60C0F0)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.3s ease,
              border-color 0.3s ease;
  will-change: transform, box-shadow;

  ${({ $listening }) => $listening && `animation: ${pulseGlow} 1.5s ease-in-out infinite;`}

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  }

  &:active { transform: scale(0.95); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transform: scale(1) !important;
    animation: none !important;
    transition: box-shadow 0.3s ease, background 0.3s ease, border-color 0.3s ease;
    will-change: box-shadow;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Empty / Welcome State
// ─────────────────────────────────────────────────────────────
export const WelcomeWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
  gap: 16px;
  flex: 1;
`;

export const WelcomeIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  margin-bottom: 8px;
`;

export const WelcomeTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

export const WelcomeSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0;
  max-width: 360px;
  line-height: 1.5;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: TTS Read Aloud Toggle
// ─────────────────────────────────────────────────────────────
export const TtsToggle = styled.button<{ $active?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-muted, rgba(224, 236, 244, 0.4))'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover { color: var(--accent-primary, #60C0F0); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
