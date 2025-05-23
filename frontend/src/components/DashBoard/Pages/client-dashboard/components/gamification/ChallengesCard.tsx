import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Button } from '@mui/material';
import { Trophy, Calendar } from 'lucide-react';

import { 
  StyledCard, 
  CardHeader, 
  CardTitle, 
  CardContent,
  ChallengeCard,
  StyledLinearProgress,
  itemVariants
} from '../styled-components';

import { Challenge } from '../../types';

interface ChallengesCardProps {
  challenges: Challenge[];
  onViewAllChallenges?: () => void;
}

/**
 * Component displaying active fitness challenges
 */
const ChallengesCard: React.FC<ChallengesCardProps> = ({ 
  challenges,
  onViewAllChallenges
}) => {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Trophy size={22} />
          Active Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
          Complete challenges to earn points and special achievements
        </Typography>
        
        {challenges.slice(0, 2).map((challenge) => (
          <ChallengeCard key={challenge.id} active={challenge.active} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {challenge.title}
            </Typography>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ mb: 2 }}>
              {challenge.description}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
              <Typography variant="body2" color="primary">
                {Math.round((challenge.progress / challenge.goal) * 100)}% Complete
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Calendar size={14} />
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                  Ends: {formatDate(challenge.endDate)}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ width: '100%', mb: 1 }}>
              <StyledLinearProgress 
                variant="determinate" 
                value={(challenge.progress / challenge.goal) * 100} 
                color="primary"
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="rgba(255, 255, 255, 0.5)">
                  {challenge.progress} of {challenge.goal}
                </Typography>
                <Typography variant="caption" color="rgba(255, 255, 255, 0.5)">
                  Reward: {challenge.reward}
                </Typography>
              </Box>
            </Box>
          </ChallengeCard>
        ))}
        
        {challenges.length > 2 && (
          <Box mt={2}>
            <Button 
              variant="outlined" 
              color="secondary" 
              fullWidth
              onClick={onViewAllChallenges}
              sx={{ 
                borderRadius: '10px', 
                py: 1.2, 
                textTransform: 'none',
                background: 'rgba(120, 81, 169, 0.05)'
              }}
            >
              View All Challenges ({challenges.length})
            </Button>
          </Box>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default ChallengesCard;
