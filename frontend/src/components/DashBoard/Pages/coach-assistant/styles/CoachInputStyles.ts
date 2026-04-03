/**
 * ============================================================================
 * FILE: CoachInputStyles.ts
 * PURPOSE: Input bar, textarea, voice orb, send button, TTS toggle styles
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import styled, { css } from 'styled-components';
import { pulseGlow } from './CoachAnimations';

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

  @media (max-width: 375px) {
    padding: 8px 10px;
    gap: 6px;
  }

  @media (min-width: 1024px) {
    padding: 14px 24px;
    max-width: 100%;
    width: 100%;
    border-radius: 0;
    background: var(--bg-base, #030712);
    border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
    border-bottom: none;
  }

  @media (min-width: 2560px) {
    max-width: 1200px;
    padding: 16px 32px;
  }

  @media (min-width: 3840px) {
    max-width: 1600px;
    padding: 20px 48px;
  }
`;

export const ChatInput = styled.textarea`
  flex: 1;
  padding: 12px 14px;
  min-height: 48px;
  max-height: 200px;
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

  @media (max-width: 375px) {
    font-size: 16px;
    padding: 10px 12px;
    min-height: 44px;
  }

  @media (min-width: 1200px) {
    font-size: 15px;
    min-height: 56px;
  }

  @media (min-width: 2560px) {
    font-size: 17px;
    min-height: 52px;
  }

  @media (min-width: 3840px) {
    font-size: 20px;
    min-height: 60px;
    padding: 16px 18px;
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

  ${({ $listening }) => $listening && css`animation: ${pulseGlow} 1.5s ease-in-out infinite;`}

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
