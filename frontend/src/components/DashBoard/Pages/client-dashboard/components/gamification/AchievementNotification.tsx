import React from 'react';
import { Box, Zoom, Typography } from '@mui/material';
import { Award } from 'lucide-react';
import { Achievement } from '../../types';

interface AchievementNotificationProps {
  isVisible: boolean;
  achievement: Achievement | null;
}

/**
 * Component for displaying achievement unlock notifications
 */
const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  isVisible,
  achievement
}) => {
  if (!isVisible || !achievement) return null;
  
  return (
    <Zoom in={isVisible}>
      <Box sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        width: { xs: '90%', sm: 400 },
        background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2))',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(0, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mr: 2,
            color: 'rgba(0, 255, 255, 0.9)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
          }}>
            {achievement.icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Achievement Unlocked!</Typography>
            <Typography variant="body1">{achievement.name}</Typography>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">{achievement.description}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>+{achievement.points}</Typography>
              <Award size={16} style={{ marginRight: 4 }} />
              <Typography variant="body2">points</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Zoom>
  );
};

export default AchievementNotification;
