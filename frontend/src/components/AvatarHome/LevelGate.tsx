/**
 * ┌─── COMPONENT: LevelGate ───────────────────────────────────┐
 * │ PURPOSE: Shows locked state for users below Level 10.       │
 * │ Displays progress toward unlock with XP bar.               │
 * │ CEO RULING: 3D world unlocks at Lv10 as a milestone reward.│
 * └────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Lock, Sparkles } from 'lucide-react';

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  padding: 48px 24px;
  text-align: center;
`;

const LockIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(96, 192, 240, 0.08);
  border: 2px solid rgba(96, 192, 240, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  animation: ${pulse} 3s ease-in-out infinite;
  color: var(--accent-primary, #60C0F0);
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin: 0 0 32px;
  max-width: 400px;
`;

const ProgressContainer = styled.div`
  width: 100%;
  max-width: 320px;
  margin-bottom: 16px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 12px;
  border-radius: 6px;
  background: rgba(96, 192, 240, 0.1);
  overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.15);
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

const LevelText = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 4px;
`;

const Hint = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
`;

interface LevelGateProps {
  currentLevel: number;
  requiredLevel?: number;
}

const LevelGate: React.FC<LevelGateProps> = ({ currentLevel, requiredLevel = 10 }) => {
  const progress = Math.min((currentLevel / requiredLevel) * 100, 100);
  const levelsLeft = Math.max(requiredLevel - currentLevel, 0);

  return (
    <Wrapper>
      <LockIcon>
        <Lock size={36} />
      </LockIcon>
      <Title>Your SwanStudios Home</Title>
      <Subtitle>
        Reach Level {requiredLevel} to unlock your 3D avatar home — customize your space,
        upgrade furniture, and watch your progress come to life.
      </Subtitle>

      <ProgressContainer>
        <LevelText>Level {currentLevel} / {requiredLevel}</LevelText>
        <ProgressBar>
          <ProgressFill $pct={progress} />
        </ProgressBar>
      </ProgressContainer>

      <Hint>
        <Sparkles size={14} />
        {levelsLeft > 0
          ? `${levelsLeft} level${levelsLeft !== 1 ? 's' : ''} to go — keep training!`
          : 'Almost there!'}
      </Hint>
    </Wrapper>
  );
};

export default LevelGate;
