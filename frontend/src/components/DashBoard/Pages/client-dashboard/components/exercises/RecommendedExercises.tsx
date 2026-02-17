import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Target, Repeat, Plus } from 'lucide-react';

import {
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  ExerciseRow,
  ExerciseIcon,
  ExerciseInfo,
  ExerciseName,
  ExerciseDetails,
  ExerciseLevel,
  itemVariants
} from '../styled-components';

import { Exercise } from '../../types';

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
`;

const ViewAllButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(120, 81, 169, 0.4);
  background: rgba(120, 81, 169, 0.05);
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(120, 81, 169, 0.15);
    border-color: rgba(120, 81, 169, 0.6);
  }
`;

interface RecommendedExercisesProps {
  exercises: Exercise[];
  onViewAll?: () => void;
}

/**
 * Component displaying personalized recommended exercises
 */
const RecommendedExercises: React.FC<RecommendedExercisesProps> = ({
  exercises,
  onViewAll
}) => {
  return (
    <StyledCard as={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Target size={22} />
          Recommended Exercises
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Subtitle>
          Personalized exercises based on your NASM protocol progression
        </Subtitle>

        {exercises.map((exercise) => (
          <ExerciseRow key={exercise.id}>
            <ExerciseIcon>
              {exercise.icon}
            </ExerciseIcon>
            <ExerciseInfo>
              <ExerciseName>{exercise.name}</ExerciseName>
              <ExerciseDetails>
                <span><Repeat size={14} /> {exercise.sets} sets × {exercise.reps} reps</span>
                <span><Target size={14} /> {exercise.type}</span>
              </ExerciseDetails>
            </ExerciseInfo>
            <ExerciseLevel level={exercise.level}>
              Lvl {exercise.level}
            </ExerciseLevel>
          </ExerciseRow>
        ))}

        <div style={{ marginTop: 16 }}>
          <ViewAllButton onClick={onViewAll}>
            <Plus size={18} />
            View All Exercises
          </ViewAllButton>
        </div>
      </CardContent>
    </StyledCard>
  );
};

export default RecommendedExercises;
