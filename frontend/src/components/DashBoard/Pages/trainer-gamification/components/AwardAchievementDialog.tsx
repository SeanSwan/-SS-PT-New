import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  Typography
} from '../../../../ui/primitives/components';
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
        <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 16 }}>
          Select an achievement to award to this client. The points associated with the achievement will be automatically credited to their account.
        </Typography>

        <FormControl fullWidth style={{ marginTop: 16 }}>
          <InputLabel>Select Achievement</InputLabel>
          <Select
            value={selectedAchievement}
            onChange={(e) => setSelectedAchievement(e.target.value)}
            fullWidth
            data-testid="achievement-select"
          >
            <option value="">Select an achievement</option>
            {achievements.map((achievement) => (
              <option key={achievement.id} value={achievement.id}>
                {achievement.name} — {achievement.pointValue} pts ({achievement.tier.toUpperCase()})
              </option>
            ))}
          </Select>
        </FormControl>

        {selectedAchievement && (
          <Box style={{ marginTop: 24, padding: 16, background: 'rgba(0, 0, 0, 0.15)', borderRadius: 4 }}>
            <Typography variant="body2" style={{ marginBottom: 8 }}>
              Achievement Details:
            </Typography>

            {(() => {
              const achievement = achievements.find(a => a.id === selectedAchievement);
              if (!achievement) return null;

              return (
                <Box>
                  <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 8 }}>
                    {achievement.description}
                  </Typography>
                  <Box style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <Star size={16} color="#FFC107" />
                    <Typography variant="body2" style={{ fontWeight: 'bold' }}>
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
