import React from 'react';
import { motion } from 'framer-motion';
import { Box, Button, Typography } from '@mui/material';
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
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Target size={22} />
          Recommended Exercises
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
          Personalized exercises based on your NASM protocol progression
        </Typography>
        
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
        
        <Box mt={2}>
          <Button 
            variant="outlined" 
            color="secondary" 
            fullWidth
            startIcon={<Plus size={18} />}
            onClick={onViewAll}
            sx={{ 
              borderRadius: '10px', 
              py: 1.2, 
              textTransform: 'none',
              background: 'rgba(120, 81, 169, 0.05)'
            }}
          >
            View All Exercises
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default RecommendedExercises;
