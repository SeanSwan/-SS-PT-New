import React from 'react';
import { motion } from 'framer-motion';
import { Chip, Tooltip, Typography } from '@mui/material';
import { Award } from 'lucide-react';

import { 
  StyledCard, 
  CardHeader, 
  CardTitle, 
  CardContent,
  AchievementGrid,
  AchievementItem,
  itemVariants
} from '../styled-components';

import { Achievement } from '../../types';

interface AchievementsCardProps {
  achievements: Achievement[];
}

/**
 * Component displaying unlocked and locked achievements
 */
const AchievementsCard: React.FC<AchievementsCardProps> = ({ achievements }) => {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  
  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Award size={22} />
          Achievements
        </CardTitle>
        <Chip 
          label={`${unlockedCount}/${achievements.length}`} 
          size="small"
          sx={{ 
            background: 'rgba(120, 81, 169, 0.15)',
            color: '#7851a9',
            fontWeight: 500
          }}
        />
      </CardHeader>
      <CardContent>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
          Unlock achievements as you progress through your fitness journey
        </Typography>
        
        <AchievementGrid>
          {achievements.map((achievement) => (
            <AchievementItem
              key={achievement.id}
              unlocked={achievement.unlocked}
              whileHover={{ y: -5 }}
            >
              <Tooltip 
                title={
                  <>
                    <Typography variant="subtitle2">{achievement.name}</Typography>
                    <Typography variant="body2">{achievement.description}</Typography>
                    {achievement.unlocked && achievement.dateUnlocked && (
                      <Typography variant="caption">
                        Unlocked: {new Date(achievement.dateUnlocked).toLocaleDateString()}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      {achievement.points} points
                    </Typography>
                  </>
                } 
                arrow
              >
                <div className="achievement-icon">
                  {achievement.icon}
                </div>
              </Tooltip>
              <div className="achievement-name">{achievement.name}</div>
            </AchievementItem>
          ))}
        </AchievementGrid>
      </CardContent>
    </StyledCard>
  );
};

export default AchievementsCard;
