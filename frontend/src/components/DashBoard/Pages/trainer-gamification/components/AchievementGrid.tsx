import React from 'react';
import { Box, Chip } from '@mui/material';
import { Star, Award, Gift, TrendingUp, Trophy, Heart, Target, Zap, Calendar, Clock, Dumbbell, Medal, CheckCircle, Users, Edit } from 'lucide-react';
import {
  AchievementGrid as StyledAchievementGrid,
  AchievementItem,
  AchievementIcon,
  AchievementName,
  AchievementDescription,
  AchievementReward,
  AchievementBadge
} from '../../admin-gamification/styled-gamification-system';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
}

interface AchievementGridProps {
  achievements: Achievement[];
}

/**
 * AchievementGrid Component
 * Displays a grid of achievements with their details
 */
const AchievementGrid: React.FC<AchievementGridProps> = ({ achievements }) => {
  // Helper function to get icon component
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award />;
      case 'Gift': return <Gift />;
      case 'TrendingUp': return <TrendingUp />;
      case 'Star': return <Star />;
      case 'Trophy': return <Trophy />;
      case 'Heart': return <Heart />;
      case 'Target': return <Target />;
      case 'Zap': return <Zap />;
      case 'Calendar': return <Calendar />;
      case 'Clock': return <Clock />;
      case 'Dumbbell': return <Dumbbell />;
      case 'Medal': return <Medal />;
      case 'CheckCircle': return <CheckCircle />;
      case 'Users': return <Users />;
      case 'Edit': return <Edit />;
      default: return <Award />;
    }
  };

  return (
    <StyledAchievementGrid>
      {achievements.map((achievement) => (
        <AchievementItem 
          key={achievement.id}
          tier={achievement.tier}
          whileHover={{ 
            y: -5,
            transition: { duration: 0.2 }
          }}
        >
          <AchievementBadge tier={achievement.tier}>
            {achievement.tier.toUpperCase()}
          </AchievementBadge>
          
          <AchievementIcon tier={achievement.tier}>
            {getIconComponent(achievement.icon)}
          </AchievementIcon>
          
          <AchievementName>{achievement.name}</AchievementName>
          
          <AchievementDescription>
            {achievement.description}
          </AchievementDescription>
          
          <Box sx={{ mt: 'auto', mb: 1 }}>
            <Chip 
              label={`${achievement.requirementValue} ${achievement.requirementType.replace('_', ' ')}`} 
              size="small" 
              sx={{ mb: 1 }}
            />
          </Box>
          
          <AchievementReward>
            <Star size={18} /> {achievement.pointValue} points
          </AchievementReward>
        </AchievementItem>
      ))}
    </StyledAchievementGrid>
  );
};

export default AchievementGrid;