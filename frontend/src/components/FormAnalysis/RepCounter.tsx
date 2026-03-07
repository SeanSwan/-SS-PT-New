/**
 * RepCounter — Glassmorphic Pulsing HUD
 * =======================================
 * Gemini Directive 2: Glassmorphic rep counter with Framer Motion
 * spring animation on count change. Positioned top-right of video.
 */
import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getScoreColor } from './constants';

interface RepCounterProps {
  count: number;
  phase: 'idle' | 'descending' | 'ascending';
  score?: number;
  exerciseName?: string;
}

const Container = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const GlassPanel = styled.div`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 20px;
  padding: 12px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const Label = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(224, 236, 244, 0.6);
`;

const CountDisplay = styled(motion.span)`
  font-size: 48px;
  font-weight: 800;
  color: #E0ECF4;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`;

const PhaseIndicator = styled.div<{ $phase: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $phase }) =>
    $phase === 'descending' ? '#FFB800' :
    $phase === 'ascending' ? '#00FF88' :
    'rgba(224, 236, 244, 0.3)'};
  box-shadow: ${({ $phase }) =>
    $phase === 'idle' ? 'none' :
    `0 0 8px ${$phase === 'descending' ? '#FFB800' : '#00FF88'}`};
  transition: all 0.2s ease;
`;

const ScoreBadge = styled.div<{ $color: string }>`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid ${({ $color }) => $color}33;
  border-radius: 12px;
  padding: 4px 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ScoreText = styled.span<{ $color: string }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  font-variant-numeric: tabular-nums;
`;

const ExerciseLabel = styled.div`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 12px;
  padding: 4px 12px;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
  max-width: 140px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RepCounter: React.FC<RepCounterProps> = ({ count, phase, score, exerciseName }) => {
  const scoreColor = score != null ? getScoreColor(score) : '#60C0F0';

  return (
    <Container>
      <GlassPanel>
        <Label>Reps</Label>
        <AnimatePresence mode="popLayout">
          <CountDisplay
            key={count}
            initial={{ scale: 1.4, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {count}
          </CountDisplay>
        </AnimatePresence>
        <PhaseIndicator $phase={phase} />
      </GlassPanel>

      {score != null && (
        <ScoreBadge $color={scoreColor}>
          <ScoreText $color={scoreColor}>{score}</ScoreText>
          <Label style={{ margin: 0, fontSize: '8px' }}>Form</Label>
        </ScoreBadge>
      )}

      {exerciseName && (
        <ExerciseLabel>{exerciseName}</ExerciseLabel>
      )}
    </Container>
  );
};

export default RepCounter;
