/**
 * FILE: SupportVoiceCapture.styles.ts
 * PURPOSE: Premium, accessible voice-first capture surface for support reports.
 */
import styled, { css, keyframes } from 'styled-components';

const listeningPulse = keyframes`
  0%, 100% { transform: scale(1); box-shadow: 0 0 24px var(--voice-glow, rgba(139, 92, 246, 0.28)); }
  50% { transform: scale(1.035); box-shadow: 0 0 42px var(--voice-glow-strong, rgba(96, 192, 240, 0.42)); }
`;

export const VoicePanel = styled.section`
  display: grid;
  justify-items: center;
  gap: 18px;
  margin-bottom: 24px;
  padding: clamp(24px, 5vw, 40px);
  border: 1px solid var(--voice-border, rgba(96, 192, 240, 0.36));
  border-radius: 20px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 18%, var(--voice-purple-wash, rgba(139, 92, 246, 0.16)), transparent 52%),
    var(--voice-surface, rgba(0, 32, 96, 0.58));
`;

export const VoiceEyebrow = styled.p`
  margin: 0;
  color: var(--gilded-fern, #C6A84B);
  font: 700 12px 'Sora', sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

export const VoiceTitle = styled.h3`
  margin: -8px 0 0;
  color: var(--frost-white, #E0ECF4);
  font: 700 clamp(22px, 4vw, 30px)/1.2 'Plus Jakarta Sans', sans-serif;
`;

export const VoiceCopy = styled.p`
  max-width: 58ch;
  margin: -8px 0 0;
  color: var(--text-secondary, #B8C7D9);
  font: 400 14px/1.6 'Plus Jakarta Sans', sans-serif;
`;

export const TargetLabel = styled.label`
  display: grid;
  gap: 8px;
  width: min(100%, 420px);
  color: var(--frost-white, #E0ECF4);
  font: 650 14px 'Plus Jakarta Sans', sans-serif;
`;

export const TargetSelect = styled.select`
  min-height: 48px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.35));
  border-radius: 12px;
  color: var(--frost-white, #E0ECF4);
  background: var(--graphite, #1A1A24);
  font: 600 16px 'Plus Jakarta Sans', sans-serif;

  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const MicButton = styled.button<{ $listening: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: min(100%, 260px);
  min-height: 64px;
  padding: 16px 28px;
  border: 2px solid ${({ $listening }) => $listening
    ? 'var(--gilded-fern, #C6A84B)'
    : 'var(--ice-wing, #60C0F0)'};
  border-radius: 999px;
  color: var(--frost-white, #E0ECF4);
  background: ${({ $listening }) => $listening
    ? 'var(--wing-purple, #8B5CF6)'
    : 'var(--midnight-sapphire, #002060)'};
  cursor: pointer;
  font: 700 17px 'Plus Jakarta Sans', sans-serif;
  touch-action: manipulation;
  ${({ $listening }) => $listening && css`animation: ${listeningPulse} 1.8s ease-in-out infinite;`}

  &:focus-visible { outline: 3px solid var(--wing-purple, #8B5CF6); outline-offset: 3px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const Transcript = styled.p`
  width: min(100%, 620px);
  min-height: 44px;
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  color: var(--frost-white, #E0ECF4);
  background: var(--obsidian-black, #0A0A0F);
  font: italic 500 15px/1.5 'Plus Jakarta Sans', sans-serif;
`;

export const VoiceAlert = styled.p`
  max-width: 58ch;
  margin: 0;
  color: var(--danger-text, #F0938A);
  font: 600 14px/1.5 'Plus Jakarta Sans', sans-serif;
`;
