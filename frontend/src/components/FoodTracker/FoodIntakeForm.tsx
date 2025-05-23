/**
 * FoodIntakeForm Component
 * 
 * Allows users to log their food intake which is then sent to both MCP servers for processing.
 * This component supports the integration between nutrition tracking and gamification.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkMcpServersStatus } from '../../utils/mcp-utils';
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';

// UI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';

// Icons
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  LocalDining as LocalDiningIcon,
  FlashOn as FlashOnIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

// Types
interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quality: 'low' | 'medium' | 'high';
}

interface FoodIntakeEntry {
  id: string;
  timestamp: string;
  userId: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
}

interface FoodIntakeFormProps {
  onDataSent?: (success: boolean) => void;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }
];

const FOOD_QUALITY = [
  { value: 'low', label: 'Low Quality (Processed/Ultra-Processed)' },
  { value: 'medium', label: 'Medium Quality (Semi-Processed)' },
  { value: 'high', label: 'High Quality (Whole Foods)' }
];

const FoodIntakeForm: React.FC<FoodIntakeFormProps> = ({ onDataSent }) => {
  const { user } = useAuth();
  
  // Form state
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([
    {
      id: '1',
      name: '',
      portion: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      quality: 'medium'
    }
  ]);
  
  // Use the client dashboard MCP hook for integrated functionality
  const { mcpStatus, logFoodIntake } = useClientDashboardMcp({
    showToasts: false // We'll handle toast notifications ourselves
  });
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Check MCP server status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkMcpServersStatus();
        console.log('Food intake form MCP status:', status);
      } catch (error) {
        console.error('Error checking MCP status:', error);
      }
    };
    
    checkStatus();
  }, []);
  
  // Add a new food item
  const handleAddFoodItem = () => {
    setFoodItems([
      ...foodItems,
      {
        id: (foodItems.length + 1).toString(),
        name: '',
        portion: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        quality: 'medium'
      }
    ]);
  };
  
  // Remove a food item
  const handleRemoveFoodItem = (id: string) => {
    if (foodItems.length <= 1) {
      return; // Keep at least one food item
    }
    
    setFoodItems(foodItems.filter(item => item.id !== id));
  };
  
  // Update a food item
  const handleFoodItemChange = (id: string, field: keyof FoodItem, value: any) => {
    setFoodItems(foodItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: value
        };
      }
      return item;
    }));
  };
  
  // Calculate totals
  const calculateTotals = () => {
    return foodItems.reduce(
      (totals, item) => {
        return {
          calories: totals.calories + (item.calories || 0),
          protein: totals.protein + (item.protein || 0),
          carbs: totals.carbs + (item.carbs || 0),
          fat: totals.fat + (item.fat || 0)
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };
  
  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('User not found. Please log in again.');
      return;
    }
    
    // Validate form
    const hasEmptyFields = foodItems.some(item => !item.name.trim() || !item.portion.trim());
    if (hasEmptyFields) {
      setError('Please fill out all food items');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create the food intake entry
      const entry: FoodIntakeEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: user.id,
        meal: mealType,
        items: foodItems
      };
      
      // Use the integrated hook to handle food intake logging
      const success = await logFoodIntake(entry);
      
      if (success) {
        // Success feedback
        setSuccess(true);
        setShowSuccessMessage(true);
        resetForm();
        
        // Callback to parent
        if (onDataSent) {
          onDataSent(true);
        }
      } else {
        // Handle failure
        console.warn('Food intake logging failed');
        setError('Could not log food intake. Please try again later.');
        
        // Callback to parent
        if (onDataSent) {
          onDataSent(false);
        }
      }
    } catch (error: any) {
      console.error('Error submitting food intake:', error);
      setError(error.message || 'Error submitting food intake');
      
      // Callback to parent
      if (onDataSent) {
        onDataSent(false);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setMealType('breakfast');
    setFoodItems([
      {
        id: '1',
        name: '',
        portion: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        quality: 'medium'
      }
    ]);
  };
  
  // Handle close snackbar
  const handleCloseSuccessMessage = () => {
    setShowSuccessMessage(false);
  };
  
  // Calculate totals
  const totals = calculateTotals();
  
  return (
    <Box component={Paper} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>
        <LocalDiningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Food Intake Tracker
      </Typography>
      
      {/* MCP Status Indicators */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Chip 
          icon={<FlashOnIcon />} 
          label={`Workout MCP: ${mcpStatus.workout ? 'Online' : 'Offline'}`}
          color={mcpStatus.workout ? 'success' : 'default'}
          size="small"
        />
        <Chip 
          icon={<TimelineIcon />} 
          label={`Gamification MCP: ${mcpStatus.gamification ? 'Online' : 'Offline'}`}
          color={mcpStatus.gamification ? 'success' : 'default'}
          size="small"
        />
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Meal Type */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Meal Type
              </Typography>
              <Select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
                displayEmpty
                required
              >
                {MEAL_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Food Items */}
          {foodItems.map((item, index) => (
            <Grid item xs={12} key={item.id}>
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">
                        Food Item #{index + 1}
                      </Typography>
                      <IconButton 
                        onClick={() => handleRemoveFoodItem(item.id)}
                        disabled={foodItems.length <= 1}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                    
                    {/* Food Name */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Food Name"
                        value={item.name}
                        onChange={(e) => handleFoodItemChange(item.id, 'name', e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                    
                    {/* Portion */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Portion/Serving Size"
                        value={item.portion}
                        onChange={(e) => handleFoodItemChange(item.id, 'portion', e.target.value)}
                        fullWidth
                        required
                        placeholder="e.g., 1 cup, 100g"
                      />
                    </Grid>
                    
                    {/* Calories */}
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Calories"
                        type="number"
                        value={item.calories}
                        onChange={(e) => handleFoodItemChange(item.id, 'calories', Number(e.target.value))}
                        fullWidth
                        InputProps={{
                          inputProps: { min: 0 },
                          endAdornment: <InputAdornment position="end">kcal</InputAdornment>
                        }}
                      />
                    </Grid>
                    
                    {/* Protein */}
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Protein"
                        type="number"
                        value={item.protein}
                        onChange={(e) => handleFoodItemChange(item.id, 'protein', Number(e.target.value))}
                        fullWidth
                        InputProps={{
                          inputProps: { min: 0 },
                          endAdornment: <InputAdornment position="end">g</InputAdornment>
                        }}
                      />
                    </Grid>
                    
                    {/* Carbs */}
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Carbs"
                        type="number"
                        value={item.carbs}
                        onChange={(e) => handleFoodItemChange(item.id, 'carbs', Number(e.target.value))}
                        fullWidth
                        InputProps={{
                          inputProps: { min: 0 },
                          endAdornment: <InputAdornment position="end">g</InputAdornment>
                        }}
                      />
                    </Grid>
                    
                    {/* Fat */}
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Fat"
                        type="number"
                        value={item.fat}
                        onChange={(e) => handleFoodItemChange(item.id, 'fat', Number(e.target.value))}
                        fullWidth
                        InputProps={{
                          inputProps: { min: 0 },
                          endAdornment: <InputAdornment position="end">g</InputAdornment>
                        }}
                      />
                    </Grid>
                    
                    {/* Food Quality */}
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <Typography variant="subtitle2" gutterBottom>
                          Food Quality
                        </Typography>
                        <Select
                          value={item.quality}
                          onChange={(e) => handleFoodItemChange(item.id, 'quality', e.target.value)}
                          displayEmpty
                        >
                          {FOOD_QUALITY.map((quality) => (
                            <MenuItem key={quality.value} value={quality.value}>
                              {quality.label}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Higher quality foods earn more gamification points
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          {/* Add Food Item Button */}
          <Grid item xs={12}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddFoodItem}
              variant="outlined"
              color="primary"
              fullWidth
            >
              Add Another Food Item
            </Button>
          </Grid>
          
          {/* Nutrition Summary */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Nutrition Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2">Calories</Typography>
                  <Typography variant="h6">{totals.calories} kcal</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2">Protein</Typography>
                  <Typography variant="h6">{totals.protein} g</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2">Carbs</Typography>
                  <Typography variant="h6">{totals.carbs} g</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="subtitle2">Fat</Typography>
                  <Typography variant="h6">{totals.fat} g</Typography>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RestaurantIcon />}
            >
              {loading ? 'Submitting...' : 'Log Food Intake'}
            </Button>
          </Grid>
        </Grid>
      </form>
      
      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={5000}
        onClose={handleCloseSuccessMessage}
      >
        <Alert onClose={handleCloseSuccessMessage} severity="success">
          Food intake logged successfully!
          {mcpStatus.gamification && ' Gamification points awarded.'}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FoodIntakeForm;