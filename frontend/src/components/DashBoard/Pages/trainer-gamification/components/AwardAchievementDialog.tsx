import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import { Award, Gift, TrendingUp, Trophy, Star, Dumbbell, Heart, Target, Zap, Calendar, Clock, Medal, CheckCircle, Users, Edit } from 'lucide-react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  streakDays: number;
}

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

interface AwardAchievementDialogProps {
  open: boolean;
  onClose: () => void;
  onAward: () => void;
  client: Client | null;
  selectedAchievement: string;
  setSelectedAchievement: (id: string) => void;
  achievements: Achievement[];
  awarding: boolean;
}

/**
 * AwardAchievementDialog Component
 * Modal dialog for awarding achievements to a client
 */
const AwardAchievementDialog: React.FC<AwardAchievementDialogProps> = ({
  open,
  onClose,
  onAward,
  client,
  selectedAchievement,
  setSelectedAchievement,
  achievements,
  awarding
}) => {
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
    <Dialog
      open={open}
      onClose={() => {
        if (!awarding) {
          onClose();
        }
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Award Achievement to {client?.firstName} {client?.lastName}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Select an achievement to award to this client. The points associated with the achievement will be automatically credited to their account.
        </DialogContentText>
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="achievement-label">Select Achievement</InputLabel>
          <Select
            labelId="achievement-label"
            value={selectedAchievement}
            onChange={(e) => setSelectedAchievement(e.target.value as string)}
            label="Select Achievement"
            inputProps={{ 'data-testid': 'achievement-select' }}
          >
            <MenuItem value="">
              <em>Select an achievement</em>
            </MenuItem>
            
            {achievements.map((achievement) => (
              <MenuItem key={achievement.id} value={achievement.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getIconComponent(achievement.icon)}
                  <Box>
                    <Typography variant="body1">{achievement.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {achievement.pointValue} points - {achievement.tier.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedAchievement && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
              Achievement Details:
            </Typography>
            
            {(() => {
              const achievement = achievements.find(a => a.id === selectedAchievement);
              if (!achievement) return null;
              
              return (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {achievement.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Star size={16} color="#FFC107" />
                    <Typography variant="body2" fontWeight="bold">
                      {achievement.pointValue} points will be awarded
                    </Typography>
                  </Box>
                </Box>
              );
            })()}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={awarding}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={onAward}
          disabled={!selectedAchievement || awarding}
          data-testid="award-achievement-button"
        >
          {awarding ? 'Awarding...' : 'Award Achievement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AwardAchievementDialog;