import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import type { AuraTone } from './SwanAuraPanel.types';

const auraPulse = keyframes`
  0%, 100% {
    opacity: 0.72;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.035);
  }
`;

export const AuraShell = styled(motion.section)`
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent), transparent 34%),
    radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent), transparent 38%),
    linear-gradient(145deg,
      color-mix(in srgb, var(--surface-primary, #07101F) 94%, transparent),
      color-mix(in srgb, var(--surface-secondary, #0B1730) 88%, transparent)
    );
  box-shadow:
    0 20px 52px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent);
  padding: clamp(1rem, 1.7vw, 1.25rem);
  color: var(--text-primary, #E0ECF4);
`;

export const AuraGlow = styled.div`
  position: absolute;
  inset: auto -18% -42% 34%;
  height: 156px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  filter: blur(34px);
  pointer-events: none;
  animation: ${auraPulse} 5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const AuraHeader = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 1rem;
`;

export const AuraAvatar = styled.div`
  width: 46px;
  min-width: 46px;
  height: 46px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;

export const AuraCopy = styled.div`
  min-width: 0;
`;

export const AuraEyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.25rem;
  font-size: 0.68rem;
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
`;

export const AuraTitle = styled.h3`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: clamp(1.04rem, 1.7vw, 1.22rem);
  font-weight: 800;
  letter-spacing: -0.02em;
`;

export const AuraSubtext = styled.p`
  margin: 0.35rem 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent);
  font-size: 0.86rem;
  line-height: 1.55;
`;

export const NudgeCard = styled.div<{ $tone: AuraTone }>`
  position: relative;
  display: grid;
  gap: 0.75rem;
  padding: 0.95rem;
  border-radius: 18px;
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--bg-elevated, #102040) 82%, transparent),
      color-mix(in srgb, var(--surface-primary, #07101F) 88%, transparent)
    );
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'challenge') return 'color-mix(in srgb, var(--gold-light, #DAC36E) 24%, transparent)';
    if ($tone === 'community') return 'color-mix(in srgb, #7DD3FC 24%, transparent)';
    if ($tone === 'progress') return 'color-mix(in srgb, #A78BFA 24%, transparent)';
    return 'color-mix(in srgb, #34D399 24%, transparent)';
  }};
`;

export const NudgeTop = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

export const NudgeIcon = styled.div<{ $tone: AuraTone }>`
  width: 36px;
  min-width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => {
    if ($tone === 'challenge') return 'var(--gold-light, #DAC36E)';
    if ($tone === 'community') return '#7DD3FC';
    if ($tone === 'progress') return '#A78BFA';
    return '#34D399';
  }};
  background: color-mix(in srgb, currentColor 12%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
`;

export const NudgeBody = styled.div`
  min-width: 0;
`;

export const NudgeEyebrow = styled.p`
  margin: 0 0 0.2rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
  font-size: 0.66rem;
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
`;

export const NudgeTitle = styled.h4`
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.25;
  font-weight: 800;
`;

export const NudgeText = styled.p`
  margin: 0.35rem 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font-size: 0.82rem;
  line-height: 1.5;
`;

export const AuraButton = styled.button`
  min-height: 44px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 56%, transparent);
    box-shadow: 0 10px 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    &:hover { transform: none; }
  }
`;

export const AuraMetaGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.8rem;

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const AuraMeta = styled.div`
  padding: 0.65rem 0.55rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-primary, #07101F) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  text-align: center;
`;

export const MetaValue = styled.div`
  font-family: var(--font-data, 'Sora', sans-serif);
  font-size: 0.92rem;
  font-weight: 900;
  color: var(--accent-primary, #60C0F0);
`;

export const MetaLabel = styled.div`
  margin-top: 0.15rem;
  font-size: 0.64rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent);
`;
