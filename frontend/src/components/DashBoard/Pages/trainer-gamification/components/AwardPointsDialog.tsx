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
  TextField,
} from '../../../../ui/primitives/components';
import type { Client, PointReason } from '../hooks/useTrainerGamification';
import {
  MAX_TRAINER_POINT_AWARD,
  normalizeTrainerPointInput,
} from '../trainerGamificationData';
import {
  DetailPanel,
  DetailText,
  DialogStack,
} from './trainer-gamification-components.styles';

interface AwardPointsDialogProps {
  open: boolean;
  onClose: () => void;
  onAward: () => void;
  client: Client | null;
  pointsToAward: number;
  setPointsToAward: (points: number) => void;
  pointReason: string;
  setPointReason: (reason: string) => void;
  customReason: string;
  setCustomReason: (reason: string) => void;
  pointReasons: PointReason[];
  awarding: boolean;
}

const AwardPointsDialog: React.FC<AwardPointsDialogProps> = ({
  open,
  onClose,
  onAward,
  client,
  pointsToAward,
  setPointsToAward,
  pointReason,
  setPointReason,
  customReason,
  setCustomReason,
  pointReasons,
  awarding,
}) => {
  const selectedReason = pointReasons.find(reason => reason.id === pointReason);
  const handlePointReasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setPointReason(value);
    const reason = pointReasons.find(row => row.id === value);
    setPointsToAward(value === 'custom' ? 0 : reason?.pointValue || 0);
  };

  return (
    <Dialog open={open} onClose={() => { if (!awarding) onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Award Points to {client?.firstName} {client?.lastName}</DialogTitle>
      <DialogContent>
        <DialogStack>
          <FormControl fullWidth>
            <InputLabel>Reason for Points</InputLabel>
            <Select value={pointReason} onChange={handlePointReasonChange} fullWidth data-testid="point-reason-select">
              <option value="">Select a reason</option>
              {pointReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
            </Select>
          </FormControl>

          {pointReason === 'custom' && (
            <TextField label="Custom Reason" value={customReason} onChange={(event) => setCustomReason(event.target.value)} data-testid="custom-reason-input" fullWidth />
          )}

          <TextField
            label="Points to Award"
            type="number"
            value={pointsToAward}
            onChange={(event) => setPointsToAward(normalizeTrainerPointInput(event.target.value))}
            inputProps={{ min: 0, max: MAX_TRAINER_POINT_AWARD }}
            data-testid="points-input"
            fullWidth
          />

          {selectedReason && pointReason !== 'custom' && (
            <DetailPanel><DetailText>{selectedReason.description}</DetailText></DetailPanel>
          )}
        </DialogStack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={awarding}>Cancel</Button>
        <Button variant="contained" onClick={onAward} disabled={!pointReason || (pointReason === 'custom' && !customReason) || pointsToAward <= 0 || awarding} data-testid="award-points-button">
          {awarding ? 'Awarding...' : 'Award Points'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AwardPointsDialog;
