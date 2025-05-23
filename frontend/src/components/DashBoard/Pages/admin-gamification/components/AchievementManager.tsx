import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  IconButton,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import { 
  Award, 
  Edit, 
  Trash2, 
  Plus, 
  Star, 
  Gift, 
  TrendingUp, 
  Trophy, 
  Heart, 
  Target, 
  Zap, 
  Calendar, 
  Clock, 
  Dumbbell, 
  Medal,
  Eye,
  EyeOff,
  DollarSign,
  Image,
  Search
} from 'lucide-react';

import {
  AchievementGrid,
  AchievementItem,
  AchievementIcon,
  AchievementName,
  AchievementDescription,
  AchievementReward,
  AchievementBadge
} from '../styled-gamification-system';

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
  badgeImageUrl?: string;
}

interface AchievementManagerProps {
  achievements: Achievement[];
  onCreateAchievement: (achievement: Omit<Achievement, 'id'>) => void;
  onUpdateAchievement: (id: string, achievement: Partial<Achievement>) => void;
  onDeleteAchievement: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

const icons = [
  { name: 'Award', component: <Award /> },
  { name: 'Trophy', component: <Trophy /> },
  { name: 'Medal', component: <Medal /> },
  { name: 'Star', component: <Star /> },
  { name: 'Dumbbell', component: <Dumbbell /> },
  { name: 'Heart', component: <Heart /> },
  { name: 'Target', component: <Target /> },
  { name: 'Zap', component: <Zap /> },
  { name: 'Calendar', component: <Calendar /> },
  { name: 'Clock', component: <Clock /> },
  { name: 'TrendingUp', component: <TrendingUp /> },
  { name: 'Gift', component: <Gift /> },
];

const requirementTypes = [
  { value: 'session_count', label: 'Session Count' },
  { value: 'exercise_count', label: 'Exercise Count' },
  { value: 'specific_exercise', label: 'Specific Exercise' },
  { value: 'level_reached', label: 'Level Reached' },
  { value: 'streak_days', label: 'Streak Days' },
  { value: 'specific_goal', label: 'Specific Goal' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'custom', label: 'Custom Achievement' },
];

const tiers = [
  { value: 'bronze', label: 'Bronze', color: '#CD7F32' },
  { value: 'silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'gold', label: 'Gold', color: '#FFD700' },
  { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
];

/**
 * AchievementManager Component
 * Admin interface for managing achievements in the gamification system
 */
const AchievementManager: React.FC<AchievementManagerProps> = ({
  achievements,
  onCreateAchievement,
  onUpdateAchievement,
  onDeleteAchievement,
  onToggleStatus
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [newAchievement, setNewAchievement] = useState<Omit<Achievement, 'id'>>({
    name: '',
    description: '',
    icon: 'Trophy',
    pointValue: 100,
    requirementType: 'session_count',
    requirementValue: 5,
    tier: 'bronze',
    isActive: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  // Get filtered achievements
  const filteredAchievements = achievements.filter(a => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tier filter
    const matchesTier = filterTier === 'all' || a.tier === filterTier;
    
    // Active status filter
    const matchesStatus = showInactiveOnly ? !a.isActive : true;
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  // Handle opening the dialog for creating new achievement
  const handleOpenCreateDialog = () => {
    setEditingAchievement(null);
    setNewAchievement({
      name: '',
      description: '',
      icon: 'Trophy',
      pointValue: 100,
      requirementType: 'session_count',
      requirementValue: 5,
      tier: 'bronze',
      isActive: true
    });
    setDialogOpen(true);
  };

  // Handle opening the dialog for editing an achievement
  const handleOpenEditDialog = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setNewAchievement({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      pointValue: achievement.pointValue,
      requirementType: achievement.requirementType,
      requirementValue: achievement.requirementValue,
      tier: achievement.tier,
      isActive: achievement.isActive,
      badgeImageUrl: achievement.badgeImageUrl
    });
    setDialogOpen(true);
  };

  // Handle saving achievement (create or update)
  const handleSaveAchievement = () => {
    if (editingAchievement) {
      onUpdateAchievement(editingAchievement.id, newAchievement);
    } else {
      onCreateAchievement(newAchievement);
    }
    setDialogOpen(false);
  };

  // Helper function to get icon component
  const getIconComponent = (iconName: string) => {
    const icon = icons.find(i => i.name === iconName);
    return icon ? icon.component : <Award />;
  };

  return (
    <Box>
      {/* Search and filter controls */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search achievements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200, maxWidth: 300 }}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                <Search size={18} />
              </Box>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="tier-filter-label">Tier</InputLabel>
          <Select
            labelId="tier-filter-label"
            value={filterTier}
            label="Tier"
            onChange={(e) => setFilterTier(e.target.value)}
          >
            <MenuItem value="all">All Tiers</MenuItem>
            {tiers.map(tier => (
              <MenuItem key={tier.value} value={tier.value}>
                {tier.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch 
              checked={showInactiveOnly}
              onChange={(e) => setShowInactiveOnly(e.target.checked)}
              size="small"
            />
          }
          label="Inactive Only"
        />

        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus />}
          onClick={handleOpenCreateDialog}
          data-testid="create-achievement-button"
        >
          New Achievement
        </Button>
      </Box>

      {/* Display achievements in a grid */}
      <AchievementGrid>
        {filteredAchievements.map((achievement) => (
          <AchievementItem 
            key={achievement.id}
            tier={achievement.tier}
            whileHover={{ 
              y: -5,
              transition: { duration: 0.2 }
            }}
            style={{ opacity: achievement.isActive ? 1 : 0.6 }}
          >
            <AchievementBadge tier={achievement.tier}>
              {achievement.tier.toUpperCase()}
            </AchievementBadge>

            <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
              <Tooltip title={achievement.isActive ? "Active" : "Inactive"}>
                <IconButton
                  size="small"
                  color={achievement.isActive ? "primary" : "default"}
                  onClick={() => onToggleStatus(achievement.id, !achievement.isActive)}
                >
                  {achievement.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </IconButton>
              </Tooltip>
            </Box>

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

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 2, 
              gap: 1,
              width: '100%'
            }}>
              <IconButton 
                size="small" 
                onClick={() => handleOpenEditDialog(achievement)}
                color="primary"
              >
                <Edit size={16} />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => onDeleteAchievement(achievement.id)}
                color="error"
              >
                <Trash2 size={16} />
              </IconButton>
            </Box>
          </AchievementItem>
        ))}
      </AchievementGrid>

      {/* Create/Edit Achievement Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAchievement ? 'Edit Achievement' : 'Create New Achievement'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Achievement Name"
                fullWidth
                value={newAchievement.name}
                onChange={(e) => setNewAchievement({ ...newAchievement, name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={newAchievement.description}
                onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Icon</InputLabel>
                <Select
                  value={newAchievement.icon}
                  label="Icon"
                  onChange={(e) => setNewAchievement({ ...newAchievement, icon: e.target.value })}
                >
                  {icons.map(icon => (
                    <MenuItem key={icon.name} value={icon.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {icon.component}
                        <span>{icon.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tier</InputLabel>
                <Select
                  value={newAchievement.tier}
                  label="Tier"
                  onChange={(e) => setNewAchievement({ 
                    ...newAchievement, 
                    tier: e.target.value as 'bronze' | 'silver' | 'gold' | 'platinum' 
                  })}
                >
                  {tiers.map(tier => (
                    <MenuItem key={tier.value} value={tier.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%',
                          bgcolor: tier.color
                        }} />
                        <span>{tier.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Point Value"
                type="number"
                fullWidth
                value={newAchievement.pointValue}
                onChange={(e) => setNewAchievement({ 
                  ...newAchievement, 
                  pointValue: parseInt(e.target.value) || 0 
                })}
                required
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                      <Star size={16} color="#FFC107" />
                    </Box>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={newAchievement.isActive}
                    onChange={(e) => setNewAchievement({ 
                      ...newAchievement, 
                      isActive: e.target.checked 
                    })}
                  />
                }
                label="Active"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Achievement Requirements
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Requirement Type</InputLabel>
                <Select
                  value={newAchievement.requirementType}
                  label="Requirement Type"
                  onChange={(e) => setNewAchievement({ 
                    ...newAchievement, 
                    requirementType: e.target.value 
                  })}
                >
                  {requirementTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Requirement Value"
                type="number"
                fullWidth
                value={newAchievement.requirementValue}
                onChange={(e) => setNewAchievement({ 
                  ...newAchievement, 
                  requirementValue: parseInt(e.target.value) || 0
                })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Badge Image (Optional)
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<Image />}
                component="label"
              >
                Upload Badge Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    // File upload would be implemented in a real application
                    // This is just a placeholder for the UI
                    console.log("File selected:", e.target.files?.[0]);
                  }}
                />
              </Button>
              {newAchievement.badgeImageUrl && (
                <Box sx={{ mt: 2 }}>
                  <img 
                    src={newAchievement.badgeImageUrl} 
                    alt="Badge" 
                    style={{ maxWidth: '100%', maxHeight: 200 }} 
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAchievement} 
            variant="contained" 
            color="primary"
            disabled={!newAchievement.name || !newAchievement.description}
          >
            {editingAchievement ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AchievementManager;