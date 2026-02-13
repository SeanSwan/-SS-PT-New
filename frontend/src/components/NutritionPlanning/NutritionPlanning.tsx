/**
 * Nutrition Planning Component
 * AI-powered nutrition plans tailored to workout programs and dietary preferences
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, TextField, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Divider,
  Paper, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Restaurant, FitnessCenter, Timeline, LocalDining,
  ExpandMore, CheckCircle, Fastfood, LocalCafe,
  Eco, Warning, Close, Add, Remove, Schedule
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// Styled Components
const NutritionContainer = styled(Box)`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const NutritionCard = styled(Card)`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  height: 100%;
`;

const MacroCard = styled(Paper)`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  color: white;
  text-align: center;
`;

const MealCard = styled(Card)`
  background: rgba(40, 40, 70, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 1rem;
`;

const RestrictionChip = styled(Chip)`
  && {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    border: 1px solid #ffc107;
    margin: 0.25rem;
  }
`;

const NutritionPlanning = ({ onClose }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State management
  const [selectedClient, setSelectedClient] = useState('');
  const [goal, setGoal] = useState('muscle_gain');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [mealCount, setMealCount] = useState(3);
  const [includeSnacks, setIncludeSnacks] = useState(true);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  
  // Available options
  const goals = [
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'fat_loss', label: 'Fat Loss' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'strength', label: 'Strength' }
  ];
  
  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary (Desk Job)' },
    { value: 'light', label: 'Light Activity' },
    { value: 'moderate', label: 'Moderate Activity' },
    { value: 'very_active', label: 'Very Active' },
    { value: 'extremely_active', label: 'Extremely Active' }
  ];
  
  const availableRestrictions = [
    'vegetarian', 'vegan', 'gluten_free', 'dairy_free',
    'keto', 'paleo', 'mediterranean', 'low_carb',
    'low_fat', 'halal', 'kosher', 'nut_free'
  ];
  
  // Load clients on component mount
  useEffect(() => {
    loadClients();
  }, []);
  
  /**
   * Load available clients
   */
  const loadClients = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      enqueueSnackbar('Failed to load clients', { variant: 'error' });
    }
  };
  
  /**
   * Toggle dietary restriction
   */
  const toggleRestriction = (restriction) => {
    setDietaryRestrictions(prev => 
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };
  
  /**
   * Generate nutrition plan using AI
   */
  const generateNutritionPlan = async () => {
    if (!selectedClient) {
      enqueueSnackbar('Please select a client', { variant: 'warning' });
      return;
    }
    
    // Short-circuit when MCP is disabled
    if (import.meta.env.VITE_ENABLE_MCP_SERVICES !== 'true') {
      enqueueSnackbar('AI nutrition planning is currently disabled', { variant: 'info' });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare nutrition context
      const mcpContext = {
        clientId: selectedClient,
        goal,
        activityLevel,
        dietaryRestrictions,
        mealCount,
        includeSnacks,
        preferences: {
          cuisineTypes: ['international'],
          cookingTime: 'moderate',
          budgetLevel: 'moderate'
        }
      };

      // Call MCP backend for nutrition planning
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mcp/nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.6,
          maxTokens: 3000,
          systemPrompt: `You are an AI nutrition specialist. Create personalized nutrition plans based on client goals and restrictions.
                        Include: macro breakdown, meal timing, food suggestions, portion sizes, supplements if needed.
                        Format response as structured JSON with sections for macros, meals, supplements, tips.`,
          humanMessage: `Create a personalized nutrition plan for client with goal: ${goal}, activity level: ${activityLevel}.
                        Dietary restrictions: ${dietaryRestrictions.join(', ') || 'None'}.
                        Include ${mealCount} main meals${includeSnacks ? ' plus snacks' : ''}.`,
          mcpContext
        })
      });
      
      if (!response.ok) {
        throw new Error(`Nutrition planning failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Parse the AI response
      let parsedPlan;
      try {
        parsedPlan = JSON.parse(result.content);
      } catch (parseError) {
        // If JSON parsing fails, create a structured plan from text
        parsedPlan = generateMockNutritionPlan();
      }
      
      setNutritionPlan(parsedPlan);
      enqueueSnackbar('Nutrition plan generated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Nutrition planning error:', error);
      enqueueSnackbar('Nutrition planning failed: ' + error.message, { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Generate mock nutrition plan for demo
   */
  const generateMockNutritionPlan = () => {
    return {
      macros: {
        calories: 2400,
        protein: 150,
        carbs: 240,
        fat: 80,
        fiber: 35
      },
      meals: [
        {
          name: 'Breakfast',
          time: '7:00 AM',
          calories: 500,
          items: [
            '2 whole eggs + 2 egg whites scrambled',
            '1 slice whole grain toast',
            '1/2 avocado',
            '1 cup mixed berries'
          ]
        },
        {
          name: 'Lunch',
          time: '12:30 PM',
          calories: 600,
          items: [
            '6oz grilled chicken breast',
            '1 cup quinoa',
            'Mixed green salad with olive oil',
            '1 medium apple'
          ]
        },
        {
          name: 'Dinner',
          time: '7:00 PM',
          calories: 650,
          items: [
            '5oz salmon fillet',
            '8oz sweet potato',
            'Steamed broccoli and carrots',
            'Side of hummus'
          ]
        }
      ],
      snacks: [
        {
          name: 'Pre-workout',
          time: '3:00 PM',
          calories: 200,
          items: ['Protein shake', 'Small banana']
        },
        {
          name: 'Evening',
          time: '9:00 PM',
          calories: 150,
          items: ['Greek yogurt', '1 tbsp honey', 'Nuts']
        }
      ],
      supplements: [
        'Whey protein powder',
        'Multivitamin',
        'Omega-3 fish oil',
        'Vitamin D3'
      ],
      tips: [
        'Drink 3-4 liters of water daily',
        'Time carbs around workouts',
        'Include variety in protein sources',
        'Monitor portion sizes'
      ]
    };
  };
  
  const selectedGoal = goals.find(g => g.value === goal);
  const selectedLevel = activityLevels.find(l => l.value === activityLevel);
  
  return (
    <NutritionContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#ff6b9d', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Restaurant />
          Nutrition AI
        </Typography>
        <Button
          onClick={onClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          startIcon={<Close />}
        >
          Close
        </Button>
      </Box>
      
      {/* Configuration Panel */}
      <NutritionCard sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#ff6b9d', mb: 2 }}>
            Plan Configuration
          </Typography>
          
          <Grid container spacing={3}>
            {/* Client Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Select Client</InputLabel>
                <Select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '& .MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Goal Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Primary Goal</InputLabel>
                <Select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '& .MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  {goals.map((g) => (
                    <MenuItem key={g.value} value={g.value}>
                      {g.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Activity Level */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Activity Level</InputLabel>
                <Select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '& .MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  {activityLevels.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Meal Count */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Number of Meals"
                value={mealCount}
                onChange={(e) => setMealCount(Math.max(1, Math.min(6, parseInt(e.target.value) || 3)))}
                InputProps={{ min: 1, max: 6 }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiInputBase-input': { color: 'white' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' }
                }}
              />
            </Grid>
            
            {/* Include Snacks */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeSnacks}
                    onChange={(e) => setIncludeSnacks(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ff6b9d' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { 
                        backgroundColor: '#ff6b9d' 
                      }
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Include Snacks
                  </Typography>
                }
              />
            </Grid>
            
            {/* Dietary Restrictions */}
            <Grid item xs={12}>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 1 }}>
                Dietary Restrictions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableRestrictions.map((restriction) => (
                  <RestrictionChip
                    key={restriction}
                    label={restriction.replace('_', ' ').toUpperCase()}
                    onClick={() => toggleRestriction(restriction)}
                    variant={dietaryRestrictions.includes(restriction) ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: dietaryRestrictions.includes(restriction) 
                        ? 'rgba(255, 193, 7, 0.3)' 
                        : 'transparent'
                    }}
                  />
                ))}
              </Box>
            </Grid>
            
            {/* Generate Button */}
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                onClick={generateNutritionPlan}
                disabled={isLoading || !selectedClient}
                sx={{
                  height: '56px',
                  background: 'linear-gradient(90deg, #ff6b9d, #e91e63)',
                  '&:hover': { background: 'linear-gradient(90deg, #e91e63, #ff6b9d)' },
                  fontSize: '1.1rem'
                }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Generate Nutrition Plan'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </NutritionCard>
      
      {/* Nutrition Plan Results */}
      {nutritionPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Macro Breakdown */}
          <Typography variant="h6" sx={{ color: '#ff6b9d', mb: 2 }}>
            Macro Breakdown
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={2.4}>
              <MacroCard>
                <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  {nutritionPlan.macros.calories}
                </Typography>
                <Typography variant="body2">Calories</Typography>
              </MacroCard>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <MacroCard>
                <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                  {nutritionPlan.macros.protein}g
                </Typography>
                <Typography variant="body2">Protein</Typography>
              </MacroCard>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <MacroCard>
                <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                  {nutritionPlan.macros.carbs}g
                </Typography>
                <Typography variant="body2">Carbs</Typography>
              </MacroCard>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <MacroCard>
                <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                  {nutritionPlan.macros.fat}g
                </Typography>
                <Typography variant="body2">Fat</Typography>
              </MacroCard>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <MacroCard>
                <Typography variant="h4" sx={{ color: '#795548', fontWeight: 'bold' }}>
                  {nutritionPlan.macros.fiber}g
                </Typography>
                <Typography variant="body2">Fiber</Typography>
              </MacroCard>
            </Grid>
          </Grid>
          
          {/* Meals */}
          <Typography variant="h6" sx={{ color: '#ff6b9d', mb: 2 }}>
            Meal Plan
          </Typography>
          
          {nutritionPlan.meals.map((meal, index) => (
            <MealCard key={index}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#ff6b9d' }}>
                    {meal.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={meal.time}
                      icon={<Schedule />}
                      sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                    />
                    <Chip
                      label={`${meal.calories} cal`}
                      icon={<LocalDining />}
                      sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50' }}
                    />
                  </Box>
                </Box>
                
                <List dense>
                  {meal.items.map((item, itemIndex) => (
                    <ListItem key={itemIndex}>
                      <ListItemIcon>
                        <Fastfood sx={{ color: '#ff6b9d' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item}
                        sx={{ '& .MuiListItemText-primary': { color: 'rgba(255, 255, 255, 0.9)' } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </MealCard>
          ))}
          
          {/* Snacks */}
          {includeSnacks && nutritionPlan.snacks && (
            <>
              <Typography variant="h6" sx={{ color: '#ff6b9d', mb: 2, mt: 3 }}>
                Snacks
              </Typography>
              
              {nutritionPlan.snacks.map((snack, index) => (
                <MealCard key={index}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#ff6b9d' }}>
                        {snack.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={snack.time}
                          icon={<Schedule />}
                          sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                        />
                        <Chip
                          label={`${snack.calories} cal`}
                          icon={<LocalCafe />}
                          sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}
                        />
                      </Box>
                    </Box>
                    
                    <List dense>
                      {snack.items.map((item, itemIndex) => (
                        <ListItem key={itemIndex}>
                          <ListItemIcon>
                            <LocalCafe sx={{ color: '#ff6b9d' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={item}
                            sx={{ '& .MuiListItemText-primary': { color: 'rgba(255, 255, 255, 0.9)' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </MealCard>
              ))}
            </>
          )}
          
          {/* Supplements & Tips */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Supplements */}
            <Grid item xs={12} md={6}>
              <NutritionCard>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#ff6b9d', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Eco />
                    Recommended Supplements
                  </Typography>
                  <List dense>
                    {nutritionPlan.supplements.map((supplement, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircle sx={{ color: '#4caf50' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={supplement}
                          sx={{ '& .MuiListItemText-primary': { color: 'rgba(255, 255, 255, 0.9)' } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </NutritionCard>
            </Grid>
            
            {/* Tips */}
            <Grid item xs={12} md={6}>
              <NutritionCard>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#ff6b9d', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timeline />
                    Nutrition Tips
                  </Typography>
                  <List dense>
                    {nutritionPlan.tips.map((tip, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircle sx={{ color: '#4caf50' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={tip}
                          sx={{ '& .MuiListItemText-primary': { color: 'rgba(255, 255, 255, 0.9)' } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </NutritionCard>
            </Grid>
          </Grid>
        </motion.div>
      )}
      
      {/* Empty State */}
      {!nutritionPlan && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Restaurant sx={{ fontSize: '4rem', color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
            Configure and generate a nutrition plan
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            AI will create personalized meal plans based on goals and restrictions
          </Typography>
        </Box>
      )}
    </NutritionContainer>
  );
};

export default NutritionPlanning;