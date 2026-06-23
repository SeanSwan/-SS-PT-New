import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
} from '../../../../ui/primitives/components';
import { Star } from 'lucide-react';
import type { Achievement, Client } from '../hooks/useTrainerGamification';
import {
  DetailPanel,
  DetailRow,
  DetailText,
  DialogStack,
} from './trainer-gamification-components.styles';

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

const AwardAchievementDialog: React.FC<AwardAchievementDialogProps> = ({
  open,
  onClose,
  onAward,
  client,
  selectedAchievement,
  setSelectedAchievement,
  achievements,
  awarding,
}) => {
  const achievement = achievements.find(row => row.id === selectedAchievement);

  return (
    <Dialog open={open} onClose={() => { if (!awarding) onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Award Achievement to {client?.firstName} {client?.lastName}</DialogTitle>
      <DialogContent>
        <DialogStack>
          <DetailText>Select an achievement to award. The associated points are credited automatically.</DetailText>
          <FormControl fullWidth>
            <InputLabel>Select Achievement</InputLabel>
            <Select value={selectedAchievement} onChange={(event) => setSelectedAchievement(event.target.value)} fullWidth data-testid="achievement-select">
              <option value="">Select an achievement</option>
              {achievements.map((row) => (
                <option key={row.id} value={row.id}>{row.name} - {row.pointValue} pts ({row.tier.toUpperCase()})</option>
              ))}
            </Select>
          </FormControl>

          {achievement && (
            <DetailPanel>
              <DetailText>Achievement Details:</DetailText>
              <DetailText>{achievement.description}</DetailText>
              <DetailRow><Star size={16} /> {achievement.pointValue} points will be awarded</DetailRow>
            </DetailPanel>
          )}
        </DialogStack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={awarding}>Cancel</Button>
        <Button variant="contained" onClick={onAward} disabled={!selectedAchievement || awarding} data-testid="award-achievement-button">
          {awarding ? 'Awarding...' : 'Award Achievement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AwardAchievementDialog;
