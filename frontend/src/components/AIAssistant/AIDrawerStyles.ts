/**
 * AIDrawerStyles.ts
 * ─────────────────────────────────────────────────────────────
 * All styled components + keyframes for the AI Assistant Drawer.
 * Extracted from the 1110-line monolith per the 300-line rule.
 *
 * WHAT THIS FILE DOES:
 *   Exports every styled-component and keyframe used by
 *   AIAssistantDrawer, ChatMessage, and AIContextSelector.
 *
 * THEME: Crystalline Swan via centralized CS tokens.
 */

import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';
import { CS, FONTS } from '../../styles/crystallineSwanTheme';

// ── Keyframes ──────────────────────────────────────────────

export const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const typingDots = keyframes`
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
`;

// ── Layout ─────────────────────────────────────────────────

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1400;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const DrawerPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1401;
  width: 420px;
  max-width: 100vw;
  background: ${CS.glassBg};
  border-left: 1px solid ${CS.borderSubtle};
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
  animation: ${slideIn} 0.3s ease;

  @media (max-width: 480px) {
    width: 100vw;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// ── Header ─────────────────────────────────────────────────

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${CS.headerBg};
  border-bottom: 1px solid ${CS.borderSubtle};
  flex-shrink: 0;

  @media (min-width: 480px) {
    padding: 16px 20px;
  }
`;

export const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${CS.wingPurple};
  font-family: ${FONTS.heading};
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: -0.02em;
  min-width: 0;
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
`;

export const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: ${CS.textSecondary};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  transition: background 0.2s, color 0.2s;
  &:hover { background: ${CS.hoverBg}; color: ${CS.textPrimary}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

// ── Context Selector ───────────────────────────────────────

export const ContextBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 6px;
  padding: 10px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid ${CS.borderSubtle};

  @media (min-width: 480px) {
    display: flex;
    gap: 6px;
    padding: 10px 16px;
    overflow-x: auto;
    &::-webkit-scrollbar { height: 0; }
  }
`;

export const ContextPill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => $active ? CS.wingPurple : 'rgba(224, 236, 244, 0.2)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'rgba(0, 32, 96, 0.85)'};
  color: ${CS.frostWhite};
  font-family: ${FONTS.ui};
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-direction: column;

  svg {
    flex-shrink: 0;
    color: ${({ $active }) => $active ? CS.wingPurple : CS.frostWhite};
    filter: ${({ $active }) => $active ? `drop-shadow(0 0 6px rgba(${CS.rgbWingPurple}, 0.5))` : 'none'};
    transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover { border-color: ${CS.wingPurple}; color: ${CS.wingPurple}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }

  /* Mobile: icon + short label stacked */
  @media (max-width: 479px) {
    border-radius: 12px;
    padding: 8px 10px;
    font-size: 0.8rem;
    gap: 4px;
    min-width: 64px;
  }

  /* Tablet+: horizontal pill */
  @media (min-width: 480px) {
    flex-direction: row;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.8rem;
    gap: 6px;
  }
`;

export const ResponseStyleBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.4);
  &::-webkit-scrollbar { height: 0; }

  @media (min-width: 480px) {
    padding: 8px 16px;
  }
`;

export const StylePill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? CS.iceWing : CS.borderSubtle};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? CS.iceWing : CS.textMuted};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:hover { border-color: ${CS.iceWing}; color: ${CS.iceWing}; }
  &:focus-visible { outline: 2px solid ${CS.iceWing}; outline-offset: 2px; }
`;

// ── Conversation List ──────────────────────────────────────

export const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
`;

export const ConvItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  min-height: 48px;
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid ${CS.borderSubtle};
  border-radius: 12px;
  color: ${CS.textPrimary};
  cursor: pointer;
  margin-bottom: 6px;
  transition: background 0.2s, border-color 0.2s;
  &:hover { background: ${CS.hoverBg}; border-color: ${CS.borderActive}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

export const ConvTitle = styled.div`
  flex: 1;
  font-size: 0.88rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ConvMeta = styled.div`
  font-size: 0.8rem;
  color: ${CS.textMuted};
`;

// ── Messages ───────────────────────────────────────────────

export const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(${CS.rgbWingPurple}, 0.2);
    border-radius: 3px;
  }

  @media (min-width: 480px) {
    padding: 16px 20px;
    gap: 12px;
  }
`;

export const MessageBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 88%;
  padding: 10px 14px;
  border-radius: ${({ $role }) => $role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  background: ${({ $role }) => $role === 'user'
    ? CS.userBubbleBg
    : CS.assistantBubbleBg};
  border: 1px solid ${({ $role }) => $role === 'user'
    ? CS.borderActive
    : CS.borderGlass};
  align-self: ${({ $role }) => $role === 'user' ? 'flex-end' : 'flex-start'};
  color: ${CS.textPrimary};
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  animation: ${fadeIn} 0.2s ease;

  @media (min-width: 480px) {
    max-width: 85%;
    padding: 12px 16px;
    font-size: 0.9rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ApplyToLoggerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  min-height: 44px;
  margin-top: 6px;
  border-radius: 10px;
  border: 1px solid ${CS.borderActive};
  background: ${CS.activePillBg};
  color: ${CS.wingPurple};
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  align-self: flex-start;
  &:hover {
    background: rgba(${CS.rgbWingPurple}, 0.2);
    border-color: rgba(${CS.rgbWingPurple}, 0.5);
    box-shadow: 0 0 12px rgba(${CS.rgbWingPurple}, 0.15);
  }
  &:active { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

export const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  align-self: flex-start;
  background: ${CS.assistantBubbleBg};
  border: 1px solid ${CS.borderGlass};
  border-radius: 16px 16px 16px 4px;
`;

export const Dot = styled.div<{ $delay: number }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${CS.wingPurple};
  animation: ${typingDots} 1.2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.6;
  }
`;

// ── Input Area ─────────────────────────────────────────────

export const InputArea = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid ${CS.borderSubtle};
  background: ${CS.inputBg};
  flex-shrink: 0;

  @media (min-width: 480px) {
    padding: 16px 20px;
  }
`;

export const ChatInput = styled.textarea`
  flex: 1;
  padding: 10px 14px;
  min-height: 44px;
  max-height: 120px;
  border-radius: 12px;
  border: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.4);
  color: ${CS.textPrimary};
  font-size: 0.9rem;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.5); }
  &:focus-visible {
    outline: 2px solid ${CS.wingPurple};
    outline-offset: 2px;
    border-color: ${CS.wingPurple};
    box-shadow: 0 0 0 2px rgba(${CS.rgbWingPurple}, 0.15);
  }
`;

export const SendBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: none;
  background: ${({ $active }) => $active
    ? `linear-gradient(135deg, ${CS.wingPurple}, ${CS.iceWing})`
    : 'rgba(0, 32, 96, 0.4)'};
  color: ${({ $active }) => $active ? CS.midnightSapphire : CS.textDisabled};
  cursor: ${({ $active }) => $active ? 'pointer' : 'default'};
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s, color 0.2s;
  flex-shrink: 0;
  &:hover:not(:disabled) {
    transform: ${({ $active }) => $active ? 'scale(1.05)' : 'none'};
    box-shadow: ${({ $active }) => $active ? `0 4px 18px rgba(${CS.rgbWingPurple}, 0.35)` : 'none'};
  }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

export const Spinner = styled(Loader2)`
  animation: ${spin} 0.6s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.5s;
  }
`;

// ── Empty / Welcome ────────────────────────────────────────

export const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 32px;
  color: ${CS.textMuted};
`;

export const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(${CS.rgbWingPurple}, 0.08);
  border: 2px solid ${CS.borderActive};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${CS.wingPurple};
`;

export const WelcomeTitle = styled.h3`
  color: ${CS.iceWing};
  font-family: ${FONTS.drama};
  font-style: italic;
  font-size: 1.4rem;
  margin: 0;
`;

export const WelcomeText = styled.p`
  color: ${CS.textSecondary};
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0;
`;

export const ErrorBanner = styled.div`
  padding: 10px 20px;
  background: ${CS.errorBg};
  border-bottom: 1px solid ${CS.errorBorder};
  color: ${CS.errorText};
  font-size: 0.82rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

// ── Action Card ────────────────────────────────────────────

export const ActionCard = styled.div<{ $color: string }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  margin-top: 6px;
  border-radius: 12px;
  border: 1px solid ${({ $color }) => $color}33;
  background: ${({ $color }) => $color}0D;
  align-self: flex-start;
  max-width: 88%;

  @media (min-width: 480px) {
    max-width: 85%;
  }
`;

export const ActionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${CS.textPrimary};
`;

export const ActionConfirmBtn = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $color }) => $color}66;
  background: ${({ $color }) => $color}1A;
  color: ${({ $color }) => $color};
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
  align-self: flex-start;

  &:hover {
    background: ${({ $color }) => $color}33;
    box-shadow: 0 0 12px ${({ $color }) => $color}26;
  }

  &:active { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid ${({ $color }) => $color}; outline-offset: 2px; }
`;

// ── Response Style Indicator ───────────────────────────────

export const ResponseStyleIndicator = styled.div`
  padding: 6px 20px;
  background: rgba(0, 32, 96, 0.3);
  border-bottom: 1px solid ${CS.borderSubtle};
  font-size: 0.8rem;
  color: ${CS.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;
