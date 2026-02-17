import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  Select,
  TextField,
  Typography
} from '../../../../ui/primitives/components';
import { Award, Star, Dumbbell, Zap, Target, Users, Edit, CheckCircle } from 'lucide-react';

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

interface PointReason {
  id: string;
  name: string;
  description: string;
  pointValue: number;
  icon: string;
}

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

/**
 * AwardPointsDialog Component
 * Modal dialog for awarding points to a client
 */
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
  awarding
}) => {
  // Handle point reason change
  const handlePointReasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setPointReason(value);

    // If a predefined reason is selected, set the default points
    if (value !== 'custom') {
      const reason = pointReasons.find(r => r.id === value);
      if (reason) {
        setPointsToAward(reason.pointValue);
      }
    } else {
      // For custom reason, reset points to 0 to prompt user to enter a value
      setPointsToAward(0);
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
        Award Points to {client?.firstName} {client?.lastName}
      </DialogTitle>
      <DialogContent>
        <Box style={{ marginTop: 16 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Reason for Points</InputLabel>
                <Select
                  value={pointReason}
                  onChange={handlePointReasonChange}
                  fullWidth
                  data-testid="point-reason-select"
                >
                  <option value="">Select a reason</option>
                  {pointReasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {pointReason === 'custom' && (
              <Grid item xs={12}>
                <TextField
                  style={{ width: '100%' }}
                  label="Custom Reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  data-testid="custom-reason-input"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                style={{ width: '100%' }}
                label="Points to Award"
                type="number"
                value={pointsToAward}
                onChange={(e) => setPointsToAward(parseInt(e.target.value) || 0)}
                data-testid="points-input"
              />
            </Grid>

            {pointReason && pointReason !== 'custom' && (
              <Grid item xs={12}>
                <Box style={{ padding: 16, background: 'rgba(0, 0, 0, 0.15)', borderRadius: 4 }}>
                  <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {pointReasons.find(r => r.id === pointReason)?.description}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
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
          disabled={!pointReason || (pointReason === 'custom' && !customReason) || pointsToAward <= 0 || awarding}
          data-testid="award-points-button"
        >
          {awarding ? 'Awarding...' : 'Award Points'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AwardPointsDialog;
