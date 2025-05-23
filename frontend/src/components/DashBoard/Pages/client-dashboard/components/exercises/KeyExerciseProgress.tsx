import React from 'react';
import { motion } from 'framer-motion';
import { Box, Button, Typography } from '@mui/material';
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
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
          Your progression in foundational NASM exercises
        </Typography>
        
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
        
        <Box mt={2}>
          <Button 
            variant="outlined" 
            color="primary" 
            fullWidth
            startIcon={<PlayCircle size={18} />}
            onClick={onStartTraining}
            sx={{ 
              borderRadius: '10px', 
              py: 1.2, 
              textTransform: 'none',
              background: 'rgba(0, 255, 255, 0.05)'
            }}
          >
            Start Focused Training
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default KeyExerciseProgress;
