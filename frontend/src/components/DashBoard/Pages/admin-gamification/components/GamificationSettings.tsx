import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Save,
  HelpCircle,
  Settings,
  TrendingUp,
  BarChart2,
  Award,
  Zap,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface PointValue {
  id: string;
  name: string;
  description: string;
  pointValue: number;
}

interface TierThreshold {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsRequired: number;
  levelRequired?: number;
}

interface LevelSettings {
  pointsPerLevel: number;
  levelCap: number;
  enableLevelCap: boolean;
}

interface SystemSettings {
  enableGamification: boolean;
  enableAchievements: boolean;
  enableRewards: boolean;
  enableLeaderboard: boolean;
  enableLevels: boolean;
  enableTiers: boolean;
  enableStreaks: boolean;
  notifyOnAchievement: boolean;
  notifyOnLevelUp: boolean;
  notifyOnReward: boolean;
  streakExpirationDays: number;
  pointsExpiration: {
    enabled: boolean;
    expirationDays: number;
  }
}

interface GamificationSettingsProps {
  pointValues: PointValue[];
  tierThresholds: TierThreshold[];
  levelSettings: LevelSettings;
  systemSettings: SystemSettings;
  onUpdatePointValues: (pointValues: PointValue[]) => void;
  onUpdateTierThresholds: (tierThresholds: TierThreshold[]) => void;
  onUpdateLevelSettings: (levelSettings: LevelSettings) => void;
  onUpdateSystemSettings: (systemSettings: SystemSettings) => void;
  onSaveSettings: () => void;
  onRestoreDefaults: () => void;
}

/**
 * GamificationSettings Component
 * Admin interface for managing gamification system settings
 */
const GamificationSettings: React.FC<GamificationSettingsProps> = ({
  pointValues,
  tierThresholds,
  levelSettings,
  systemSettings,
  onUpdatePointValues,
  onUpdateTierThresholds,
  onUpdateLevelSettings,
  onUpdateSystemSettings,
  onSaveSettings,
  onRestoreDefaults
}) => {
  // State for the settings
  const [editedPointValues, setEditedPointValues] = useState<PointValue[]>(pointValues);
  const [editedTierThresholds, setEditedTierThresholds] = useState<TierThreshold[]>(tierThresholds);
  const [editedLevelSettings, setEditedLevelSettings] = useState<LevelSettings>(levelSettings);
  const [editedSystemSettings, setEditedSystemSettings] = useState<SystemSettings>(systemSettings);
  const [isEdited, setIsEdited] = useState(false);
  
  // Handle point value changes
  const handlePointValueChange = (id: string, value: number) => {
    const updated = editedPointValues.map(pv => 
      pv.id === id ? { ...pv, pointValue: value } : pv
    );
    setEditedPointValues(updated);
    setIsEdited(true);
  };
  
  // Handle tier threshold changes
  const handleTierThresholdChange = (tier: 'bronze' | 'silver' | 'gold' | 'platinum', value: number) => {
    const updated = editedTierThresholds.map(tt => 
      tt.tier === tier ? { ...tt, pointsRequired: value } : tt
    );
    setEditedTierThresholds(updated);
    setIsEdited(true);
  };
  
  // Handle level settings changes
  const handleLevelSettingChange = (key: keyof LevelSettings, value: number | boolean) => {
    setEditedLevelSettings({
      ...editedLevelSettings,
      [key]: value
    });
    setIsEdited(true);
  };
  
  // Handle system setting changes
  const handleSystemSettingChange = (key: keyof SystemSettings, value: boolean | number | { enabled: boolean, expirationDays: number }) => {
    setEditedSystemSettings({
      ...editedSystemSettings,
      [key]: value
    });
    setIsEdited(true);
  };
  
  // Handle save button click
  const handleSave = () => {
    onUpdatePointValues(editedPointValues);
    onUpdateTierThresholds(editedTierThresholds);
    onUpdateLevelSettings(editedLevelSettings);
    onUpdateSystemSettings(editedSystemSettings);
    onSaveSettings();
    setIsEdited(false);
  };
  
  // Handle restore defaults
  const handleRestoreDefaults = () => {
    // Show confirmation dialog in real implementation
    onRestoreDefaults();
    setIsEdited(false);
  };
  
  return (
    <Box>
      {isEdited && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleSave}>
              Save Changes
            </Button>
          }
        >
          You have unsaved changes to the gamification settings.
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h5" component="h2">
          Gamification System Settings
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshCw size={16} />}
            onClick={handleRestoreDefaults}
            sx={{ mr: 2 }}
          >
            Restore Defaults
          </Button>
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<Save size={16} />}
            onClick={handleSave}
            disabled={!isEdited}
          >
            Save Settings
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* System Settings */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Settings size={20} style={{ marginRight: 8 }} />
              <Typography variant="h6">System Settings</Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.enableGamification}
                      onChange={(e) => handleSystemSettingChange('enableGamification', e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography>Enable Gamification</Typography>
                      <Tooltip title="Master switch for the entire gamification system">
                        <IconButton size="small">
                          <HelpCircle size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.enableAchievements}
                      onChange={(e) => handleSystemSettingChange('enableAchievements', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification}
                    />
                  }
                  label="Enable Achievements"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.enableRewards}
                      onChange={(e) => handleSystemSettingChange('enableRewards', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification}
                    />
                  }
                  label="Enable Rewards"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.enableLeaderboard}
                      onChange={(e) => handleSystemSettingChange('enableLeaderboard', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification}
                    />
                  }
                  label="Enable Leaderboard"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.enableLevels}
                      onChange={(e) => handleSystemSettingChange('enableLevels', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification}
                    />
                  }
                  label="Enable Levels"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.enableTiers}
                      onChange={(e) => handleSystemSettingChange('enableTiers', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification}
                    />
                  }
                  label="Enable Tiers"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.enableStreaks}
                      onChange={(e) => handleSystemSettingChange('enableStreaks', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification}
                    />
                  }
                  label="Enable Streaks"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.notifyOnAchievement}
                      onChange={(e) => handleSystemSettingChange('notifyOnAchievement', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableAchievements}
                    />
                  }
                  label="Notify on Achievement"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.notifyOnLevelUp}
                      onChange={(e) => handleSystemSettingChange('notifyOnLevelUp', e.target.checked)}
                      disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels}
                    />
                  }
                  label="Notify on Level Up"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Streak Expiration (Days)"
                  type="number"
                  value={editedSystemSettings.streakExpirationDays}
                  onChange={(e) => handleSystemSettingChange('streakExpirationDays', parseInt(e.target.value) || 0)}
                  disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableStreaks}
                  fullWidth
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={editedSystemSettings.pointsExpiration.enabled}
                      onChange={(e) => handleSystemSettingChange('pointsExpiration', {
                        ...editedSystemSettings.pointsExpiration,
                        enabled: e.target.checked
                      })}
                      disabled={!editedSystemSettings.enableGamification}
                    />
                  }
                  label="Enable Points Expiration"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Points Expiration (Days)"
                  type="number"
                  value={editedSystemSettings.pointsExpiration.expirationDays}
                  onChange={(e) => handleSystemSettingChange('pointsExpiration', {
                    ...editedSystemSettings.pointsExpiration,
                    expirationDays: parseInt(e.target.value) || 0
                  })}
                  disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.pointsExpiration.enabled}
                  fullWidth
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Level Settings */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp size={20} style={{ marginRight: 8 }} />
              <Typography variant="h6">Level Settings</Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Points Per Level"
                type="number"
                value={editedLevelSettings.pointsPerLevel}
                onChange={(e) => handleLevelSettingChange('pointsPerLevel', parseInt(e.target.value) || 0)}
                disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 1 } }}
                helperText="Points required to advance one level"
              />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={editedLevelSettings.enableLevelCap}
                    onChange={(e) => handleLevelSettingChange('enableLevelCap', e.target.checked)}
                    disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels}
                  />
                }
                label="Enable Level Cap"
                sx={{ mt: 2 }}
              />
              
              <TextField
                label="Level Cap"
                type="number"
                value={editedLevelSettings.levelCap}
                onChange={(e) => handleLevelSettingChange('levelCap', parseInt(e.target.value) || 0)}
                disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels || !editedLevelSettings.enableLevelCap}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 1 } }}
                helperText="Maximum level a user can reach"
              />
            </Box>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Level Calculation Formula:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.04)' }}>
                <Typography fontFamily="monospace">
                  Level = Math.floor(totalPoints / pointsPerLevel) + 1
                </Typography>
              </Paper>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Users start at Level 1. For example, with {editedLevelSettings.pointsPerLevel} points per level, a user with 4500 points would be at Level {Math.floor(4500 / editedLevelSettings.pointsPerLevel) + 1}.
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Tier Thresholds */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Award size={20} style={{ marginRight: 8 }} />
              <Typography variant="h6">Tier Thresholds</Typography>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tier</TableCell>
                    <TableCell>Points Required</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editedTierThresholds.map((tier) => (
                    <TableRow key={tier.tier}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ 
                            width: 16, 
                            height: 16, 
                            borderRadius: '50%',
                            bgcolor: 
                              tier.tier === 'bronze' ? '#CD7F32' :
                              tier.tier === 'silver' ? '#C0C0C0' :
                              tier.tier === 'gold' ? '#FFD700' :
                              '#E5E4E2',
                            mr: 1
                          }} />
                          {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={tier.pointsRequired}
                          onChange={(e) => handleTierThresholdChange(tier.tier, parseInt(e.target.value) || 0)}
                          disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableTiers}
                          size="small"
                          InputProps={{ 
                            inputProps: { min: 0 },
                            endAdornment: <Box component="span" sx={{ ml: 1, fontSize: '0.75rem' }}>points</Box>
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Set the point thresholds required for users to reach each tier. Users start with no tier and must earn the specified points to progress.
            </Typography>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              Make sure tier thresholds are properly spaced to create achievable progression. Bronze should be attainable fairly easily, while Platinum should represent significant achievement.
            </Alert>
          </Paper>
        </Grid>
        
        {/* Point Values */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BarChart2 size={20} style={{ marginRight: 8 }} />
              <Typography variant="h6">Point Values</Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Configure the point values awarded for different activities in the system.
            </Typography>
            
            <TableContainer sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Activity</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editedPointValues.map((pv) => (
                    <TableRow key={pv.id}>
                      <TableCell>{pv.name}</TableCell>
                      <TableCell>{pv.description}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={pv.pointValue}
                          onChange={(e) => handlePointValueChange(pv.id, parseInt(e.target.value) || 0)}
                          size="small"
                          InputProps={{ 
                            inputProps: { min: 0, style: { textAlign: 'right' } }
                          }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GamificationSettings;