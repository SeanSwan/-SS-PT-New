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
  Tooltip,
  InputAdornment
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
  Search,
  Tag
} from 'lucide-react';

import {
  RewardGrid,
  RewardItem,
  RewardHeader,
  RewardIcon,
  RewardContent,
  RewardName,
  RewardDescription,
  RewardFooter,
  RewardPoints,
  RewardBadge
} from '../styled-gamification-system';

interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointCost: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  stock: number;
  isActive: boolean;
  redemptionCount: number;
  imageUrl?: string;
  expiresAt?: string;
}

interface RewardManagerProps {
  rewards: Reward[];
  onCreateReward: (reward: Omit<Reward, 'id' | 'redemptionCount'>) => void;
  onUpdateReward: (id: string, reward: Partial<Reward>) => void;
  onDeleteReward: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onUpdateStock: (id: string, stock: number) => void;
}

const icons = [
  { name: 'Gift', component: <Gift /> },
  { name: 'Trophy', component: <Trophy /> },
  { name: 'Star', component: <Star /> },
  { name: 'Heart', component: <Heart /> },
  { name: 'Calendar', component: <Calendar /> },
  { name: 'Tag', component: <Tag /> },
  { name: 'DollarSign', component: <DollarSign /> },
  { name: 'Award', component: <Award /> },
  { name: 'Medal', component: <Medal /> },
  { name: 'Clock', component: <Clock /> },
];

const tiers = [
  { value: 'bronze', label: 'Bronze', color: '#CD7F32' },
  { value: 'silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'gold', label: 'Gold', color: '#FFD700' },
  { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
];

/**
 * RewardManager Component
 * Admin interface for managing rewards in the gamification system
 */
const RewardManager: React.FC<RewardManagerProps> = ({
  rewards,
  onCreateReward,
  onUpdateReward,
  onDeleteReward,
  onToggleStatus,
  onUpdateStock
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [newReward, setNewReward] = useState<Omit<Reward, 'id' | 'redemptionCount'>>({
    name: '',
    description: '',
    icon: 'Gift',
    pointCost: 500,
    tier: 'bronze',
    stock: 10,
    isActive: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [newStockValue, setNewStockValue] = useState(0);

  // Get filtered rewards
  const filteredRewards = rewards.filter(r => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tier filter
    const matchesTier = filterTier === 'all' || r.tier === filterTier;
    
    // Active status filter
    const matchesStatus = showInactiveOnly ? !r.isActive : true;
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  // Handle opening the dialog for creating new reward
  const handleOpenCreateDialog = () => {
    setEditingReward(null);
    setNewReward({
      name: '',
      description: '',
      icon: 'Gift',
      pointCost: 500,
      tier: 'bronze',
      stock: 10,
      isActive: true
    });
    setDialogOpen(true);
  };

  // Handle opening the dialog for editing a reward
  const handleOpenEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setNewReward({
      name: reward.name,
      description: reward.description,
      icon: reward.icon,
      pointCost: reward.pointCost,
      tier: reward.tier,
      stock: reward.stock,
      isActive: reward.isActive,
      expiresAt: reward.expiresAt,
      imageUrl: reward.imageUrl
    });
    setDialogOpen(true);
  };

  // Handle opening stock update dialog
  const handleOpenStockDialog = (rewardId: string, currentStock: number) => {
    setSelectedRewardId(rewardId);
    setNewStockValue(currentStock);
    setStockDialogOpen(true);
  };

  // Handle saving reward (create or update)
  const handleSaveReward = () => {
    if (editingReward) {
      onUpdateReward(editingReward.id, newReward);
    } else {
      onCreateReward(newReward);
    }
    setDialogOpen(false);
  };

  // Handle updating stock
  const handleUpdateStock = () => {
    onUpdateStock(selectedRewardId, newStockValue);
    setStockDialogOpen(false);
  };

  // Helper function to get icon component
  const getIconComponent = (iconName: string) => {
    const icon = icons.find(i => i.name === iconName);
    return icon ? icon.component : <Gift />;
  };

  return (
    <Box>
      {/* Search and filter controls */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search rewards..."
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
          data-testid="create-reward-button"
        >
          New Reward
        </Button>
      </Box>

      {/* Display rewards in a grid */}
      <RewardGrid>
        {filteredRewards.map((reward) => (
          <RewardItem 
            key={reward.id}
            tier={reward.tier}
            whileHover={{ 
              y: -5,
              transition: { duration: 0.2 }
            }}
            style={{ opacity: reward.isActive ? 1 : 0.6 }}
          >
            <RewardBadge tier={reward.tier}>
              {reward.tier.toUpperCase()}
            </RewardBadge>

            <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
              <Tooltip title={reward.isActive ? "Active" : "Inactive"}>
                <IconButton
                  size="small"
                  color={reward.isActive ? "primary" : "default"}
                  onClick={() => onToggleStatus(reward.id, !reward.isActive)}
                >
                  {reward.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </IconButton>
              </Tooltip>
            </Box>

            <RewardHeader>
              <RewardIcon tier={reward.tier}>
                {getIconComponent(reward.icon)}
              </RewardIcon>
              
              <RewardContent>
                <RewardName>{reward.name}</RewardName>
                <RewardDescription>
                  {reward.description}
                </RewardDescription>
              </RewardContent>
            </RewardHeader>

            <Box sx={{ mt: 2 }}>
              <Chip 
                label={`Stock: ${reward.stock}`} 
                size="small"
                color={reward.stock <= 3 ? "error" : "default"}
                onClick={() => handleOpenStockDialog(reward.id, reward.stock)}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip 
                label={`Redeemed: ${reward.redemptionCount}`} 
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            </Box>
            
            <Box sx={{ mt: 'auto' }}></Box>
            
            <RewardFooter>
              <RewardPoints tier={reward.tier}>
                <Star size={16} /> {reward.pointCost} points
              </RewardPoints>
            </RewardFooter>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 2, 
              gap: 1,
              width: '100%'
            }}>
              <IconButton 
                size="small" 
                onClick={() => handleOpenEditDialog(reward)}
                color="primary"
              >
                <Edit size={16} />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => onDeleteReward(reward.id)}
                color="error"
              >
                <Trash2 size={16} />
              </IconButton>
            </Box>
          </RewardItem>
        ))}
      </RewardGrid>

      {/* Create/Edit Reward Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingReward ? 'Edit Reward' : 'Create New Reward'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Reward Name"
                fullWidth
                value={newReward.name}
                onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={newReward.description}
                onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Icon</InputLabel>
                <Select
                  value={newReward.icon}
                  label="Icon"
                  onChange={(e) => setNewReward({ ...newReward, icon: e.target.value })}
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
                  value={newReward.tier}
                  label="Tier"
                  onChange={(e) => setNewReward({ 
                    ...newReward, 
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
                label="Point Cost"
                type="number"
                fullWidth
                value={newReward.pointCost}
                onChange={(e) => setNewReward({ 
                  ...newReward, 
                  pointCost: parseInt(e.target.value) || 0 
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
              <TextField
                label="Stock"
                type="number"
                fullWidth
                value={newReward.stock}
                onChange={(e) => setNewReward({ 
                  ...newReward, 
                  stock: parseInt(e.target.value) || 0 
                })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={newReward.isActive}
                    onChange={(e) => setNewReward({ 
                      ...newReward, 
                      isActive: e.target.checked 
                    })}
                  />
                }
                label="Active"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiration Date (Optional)"
                type="date"
                fullWidth
                value={newReward.expiresAt ? new Date(newReward.expiresAt).toISOString().split('T')[0] : ''}
                onChange={(e) => setNewReward({ 
                  ...newReward, 
                  expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined
                })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Reward Image (Optional)
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<Image />}
                component="label"
              >
                Upload Reward Image
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
              {newReward.imageUrl && (
                <Box sx={{ mt: 2 }}>
                  <img 
                    src={newReward.imageUrl} 
                    alt="Reward" 
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
            onClick={handleSaveReward} 
            variant="contained" 
            color="primary"
            disabled={!newReward.name || !newReward.description}
          >
            {editingReward ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Stock Dialog */}
      <Dialog
        open={stockDialogOpen}
        onClose={() => setStockDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Update Stock</DialogTitle>
        <DialogContent>
          <TextField
            label="Stock Quantity"
            type="number"
            fullWidth
            value={newStockValue}
            onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
            margin="normal"
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateStock} 
            variant="contained" 
            color="primary"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RewardManager;