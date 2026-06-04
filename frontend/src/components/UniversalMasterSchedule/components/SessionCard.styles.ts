import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';

export const SESSION_CARD_TOKENS = {
  elevatedGlass: 'var(--bg-elevated, rgba(30, 30, 50, 0.7))',
  swanCyan: 'var(--accent-primary, #60C0F0)',
  cosmicPurple: 'var(--accent-secondary, #8B5CF6)',
  deepSpace: 'var(--bg-base, #0A0A0F)',
  stellarWhite: 'var(--text-primary, #E0ECF4)',
  mutedText: 'var(--text-muted, #8892b0)',
  successGreen: 'var(--success, #10b981)',
  dangerRed: 'var(--danger, #ef4444)',
  warningAmber: 'var(--warning, #f59e0b)',
  purpleStroke: 'var(--border-accent, rgba(139, 92, 246, 0.3))',
  strongShadow: 'var(--shadow-strong, 0 8px 32px rgba(0, 0, 0, 0.5))',
  softShadow: 'var(--shadow-soft, 0 4px 16px rgba(0, 0, 0, 0.3))',
};

const translucent = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, transparent)`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 ${translucent(SESSION_CARD_TOKENS.cosmicPurple, 30)}; }
  50% { box-shadow: 0 0 12px 4px ${translucent(SESSION_CARD_TOKENS.cosmicPurple, 15)}; }
`;

export const CardWrapper = styled(motion.button)<{
  $statusColor: string;
  $variant: string;
  $isSoon: boolean;
  $interactive: boolean;
}>`
  position: relative;
  width: 100%;
  background: ${SESSION_CARD_TOKENS.elevatedGlass};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${SESSION_CARD_TOKENS.purpleStroke};
  border-radius: 16px;
  overflow: hidden;
  cursor: ${p => p.$interactive ? 'pointer' : 'default'};
  color: inherit;
  font: inherit;
  text-align: left;
  transition: border-color 0.2s;
  box-shadow: ${SESSION_CARD_TOKENS.strongShadow};

  ${p => p.$isSoon && css`
    animation: ${pulseGlow} 2s ease-in-out infinite;
    border-color: ${SESSION_CARD_TOKENS.swanCyan};
  `}

  &:hover {
    border-color: ${p => translucent(p.$statusColor, 60)};
  }

  ${p => p.$variant === 'compact' && css`
    border-radius: 12px;
    box-shadow: ${SESSION_CARD_TOKENS.softShadow};
  `}
`;

export const StatusBar = styled.div<{ $color: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${p => p.$color};
  opacity: 0.8;
`;

export const CardContent = styled.div`
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

export const TimeBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

export const TimeText = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${SESSION_CARD_TOKENS.stellarWhite};
  font-variant-numeric: tabular-nums;
`;

export const DateText = styled.span<{ $isToday: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.$isToday ? SESSION_CARD_TOKENS.swanCyan : SESSION_CARD_TOKENS.mutedText};
`;

export const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${p => p.$color};
  background: ${p => translucent(p.$color, 15)};
  border: 1px solid ${p => translucent(p.$color, 30)};
`;

export const MetaRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

export const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${SESSION_CARD_TOKENS.mutedText};
`;

export const PersonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${SESSION_CARD_TOKENS.mutedText};

  strong {
    color: ${SESSION_CARD_TOKENS.stellarWhite};
    font-weight: 600;
  }
`;

export const BookButton = styled(motion.button)`
  margin-top: 4px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    ${SESSION_CARD_TOKENS.cosmicPurple} 0%,
    ${SESSION_CARD_TOKENS.swanCyan} 100%
  );
  color: ${SESSION_CARD_TOKENS.deepSpace};
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  min-height: 44px;
  transition: box-shadow 0.2s cubic-bezier(0.25, 1, 0.5, 1);

  &:hover {
    box-shadow: 0 0 15px ${translucent(SESSION_CARD_TOKENS.cosmicPurple, 40)};
  }
`;

export const JoinButton = styled(motion.button)`
  margin-top: 4px;
  padding: 12px 24px;
  border: 2px solid ${SESSION_CARD_TOKENS.swanCyan};
  border-radius: 8px;
  background: ${translucent(SESSION_CARD_TOKENS.swanCyan, 10)};
  color: ${SESSION_CARD_TOKENS.swanCyan};
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  min-height: 48px;
  text-transform: uppercase;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 0 20px ${translucent(SESSION_CARD_TOKENS.swanCyan, 50)};
  }
`;
