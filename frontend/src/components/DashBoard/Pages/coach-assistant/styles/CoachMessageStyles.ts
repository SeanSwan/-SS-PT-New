/**
 * ============================================================================
 * FILE: CoachMessageStyles.ts
 * PURPOSE: Message bubbles, timestamps, actions, and typing indicator styles
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import styled from 'styled-components';
import { fadeIn, bounce } from './CoachAnimations';

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

  @media (max-width: 375px) {
    font-size: 15px;
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
    min-height: 36px;
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
