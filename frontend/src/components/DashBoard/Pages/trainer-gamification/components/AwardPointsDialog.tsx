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
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
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
  // Helper function to get icon component
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award />;
      case 'Star': return <Star />;
      case 'Dumbbell': return <Dumbbell />;
      case 'Zap': return <Zap />;
      case 'Target': return <Target />;
      case 'Users': return <Users />;
      case 'Edit': return <Edit />;
      case 'CheckCircle': return <CheckCircle />;
      default: return <Award />;
    }
  };

  // Handle point reason change
  const handlePointReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="reason-label">Reason for Points</InputLabel>
                <Select
                  labelId="reason-label"
                  value={pointReason}
                  onChange={handlePointReasonChange}
                  label="Reason for Points"
                  inputProps={{ 'data-testid': 'point-reason-select' }}
                >
                  <MenuItem value="">
                    <em>Select a reason</em>
                  </MenuItem>
                  
                  {pointReasons.map((reason) => (
                    <MenuItem key={reason.id} value={reason.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getIconComponent(reason.icon)}
                        <Typography variant="body1">{reason.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {pointReason === 'custom' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Custom Reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  multiline
                  rows={2}
                  data-testid="custom-reason-input"
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Points to Award"
                type="number"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Star size={16} color="#FFC107" />
                    </InputAdornment>
                  ),
                }}
                value={pointsToAward}
                onChange={(e) => setPointsToAward(parseInt(e.target.value) || 0)}
                data-testid="points-input"
              />
            </Grid>
            
            {pointReason && pointReason !== 'custom' && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
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
          color="primary"
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