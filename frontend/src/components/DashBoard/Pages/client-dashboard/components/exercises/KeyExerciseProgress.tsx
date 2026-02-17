import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Dumbbell, PlayCircle, Anchor } from 'lucide-react';

import {
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  ProgressBarContainer,
  ProgressBarLabel,
  ProgressBarName,
  ProgressBarValue,
  StyledLinearProgress,
  itemVariants
} from '../styled-components';

import { KeyExercises } from '../../types';

interface KeyExerciseProgressProps {
  keyExercises: KeyExercises;
  onStartTraining?: () => void;
}

const Description = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
`;

const StartButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: rgba(0, 255, 255, 0.05);
  color: #00ffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 16px;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
  }
`;

/**
 * Component displaying progress in key foundational exercises
 */
const KeyExerciseProgress: React.FC<KeyExerciseProgressProps> = ({
  keyExercises,
  onStartTraining
}) => {
  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Dumbbell size={22} />
          Key Exercise Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Description>Your progression in foundational NASM exercises</Description>

        <ProgressBarContainer>
          <ProgressBarLabel>
            <ProgressBarName>
              <Dumbbell size={16} />
              Squats
            </ProgressBarName>
            <ProgressBarValue>Level {keyExercises.squats.level}</ProgressBarValue>
          </ProgressBarLabel>
          <StyledLinearProgress
            variant="determinate"
            value={keyExercises.squats.progress}
            color="primary"
          />
        </ProgressBarContainer>

        <ProgressBarContainer>
          <ProgressBarLabel>
            <ProgressBarName>
              <Dumbbell size={16} />
              Lunges
            </ProgressBarName>
            <ProgressBarValue>Level {keyExercises.lunges.level}</ProgressBarValue>
          </ProgressBarLabel>
          <StyledLinearProgress
            variant="determinate"
            value={keyExercises.lunges.progress}
            color="secondary"
          />
        </ProgressBarContainer>

        <ProgressBarContainer>
          <ProgressBarLabel>
            <ProgressBarName>
              <Anchor size={16} />
              Planks
            </ProgressBarName>
            <ProgressBarValue>Level {keyExercises.planks.level}</ProgressBarValue>
          </ProgressBarLabel>
          <StyledLinearProgress
            variant="determinate"
            value={keyExercises.planks.progress}
            color="success"
          />
        </ProgressBarContainer>

        <ProgressBarContainer>
          <ProgressBarLabel>
            <ProgressBarName>
              <Anchor size={16} />
              Reverse Planks
            </ProgressBarName>
            <ProgressBarValue>Level {keyExercises.reversePlanks.level}</ProgressBarValue>
          </ProgressBarLabel>
          <StyledLinearProgress
            variant="determinate"
            value={keyExercises.reversePlanks.progress}
            color="warning"
          />
        </ProgressBarContainer>

        <StartButton onClick={onStartTraining}>
          <PlayCircle size={18} />
          Start Focused Training
        </StartButton>
      </CardContent>
    </StyledCard>
  );
};

export default KeyExerciseProgress;
