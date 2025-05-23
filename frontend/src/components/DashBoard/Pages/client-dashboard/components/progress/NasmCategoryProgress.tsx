import React from 'react';
import { motion } from 'framer-motion';
import { Typography } from '@mui/material';
import { Activity } from 'lucide-react';

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

import { NasmCategory } from '../../types';

interface NasmCategoryProgressProps {
  nasmCategories: NasmCategory[];
}

/**
 * Component displaying progress in NASM protocol fitness categories
 */
const NasmCategoryProgress: React.FC<NasmCategoryProgressProps> = ({ nasmCategories }) => {
  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Activity size={22} />
          NASM Protocol Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
          Your progression through core NASM fitness protocol categories
        </Typography>
        
        {nasmCategories.map((category) => (
          <ProgressBarContainer key={category.type}>
            <ProgressBarLabel>
              <ProgressBarName>
                {category.icon}
                {category.name}
              </ProgressBarName>
              <ProgressBarValue>Level {category.level}</ProgressBarValue>
            </ProgressBarLabel>
            <StyledLinearProgress 
              variant="determinate" 
              value={category.progress} 
              color={category.color as any}
            />
          </ProgressBarContainer>
        ))}
      </CardContent>
    </StyledCard>
  );
};

export default NasmCategoryProgress;
