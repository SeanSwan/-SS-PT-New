/**
 * Exercise Alternatives Component
 * Find optimal exercise substitutions based on equipment and limitations
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, TextField, FormControl,
  InputLabel, Select, MenuItem, Checkbox, FormControlLabel,
  FormGroup, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, IconButton, Tooltip,
  Paper, Avatar, Divider
} from '@mui/material';
import {
  SwapHoriz, Search, ExpandMore, FitnessCenter,
  Accessibility, Build, Timer, TrendingUp,
  CheckCircle, Info, Close, PlayArrow,
  Star, StarBorder, FilterList
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// Styled Components
const AlternativesContainer = styled(Box)`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const SearchCard = styled(Card)`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 2rem;
`;

const ExerciseCard = styled(Card)`
  background: rgba(40, 40, 70, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  height: 100%;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.2);
    border-color: rgba(76, 175, 80, 0.4);
  }
`;

const AlternativeCard = styled(Card)`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 1rem;
`;

const DifficultyChip = styled(Chip)`
  && {
    background: ${props => 
      props.level === 'beginner' ? 'rgba(76, 175, 80, 0.2)' :
      props.level === 'intermediate' ? 'rgba(255, 152, 0, 0.2)' :
      'rgba(244, 67, 54, 0.2)'};
    color: ${props => 
      props.level === 'beginner' ? '#4caf50' :
      props.level === 'intermediate' ? '#ff9800' :
      '#f44336'};
    border: 1px solid ${props => 
      props.level === 'beginner' ? '#4caf50' :
      props.level === 'intermediate' ? '#ff9800' :
      '#f44336'};
  }
`;

const EquipmentChip = styled(Chip)`
  && {
    background: rgba(33, 150, 243, 0.2);
    color: #2196f3;
    border: 1px solid #2196f3;
    margin: 0.25rem;
  }
`;

const ExerciseAlternatives = ({ onClose }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [limitations, setLimitations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [difficulty, setDifficulty] = useState('');
  const [alternatives, setAlternatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedAlternatives, setSavedAlternatives] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Available limitations
  const availableLimitations = [
    'Lower back injury',
    'Knee problems',
    'Shoulder issues',
    'Wrist pain',
    'Hip limitations',
    'Neck problems',
    'Ankle issues',
    'Limited mobility',
    'Previous surgery',
    'Chronic pain'
  ];
  
  // Available equipment
  const availableEquipment = [
    'Bodyweight',
    'Dumbbells',
    'Resistance bands',
    'Kettlebells',
    'Medicine ball',
    'Pull-up bar',
    'Suspension trainer',
    'Gym machines',
    'Barbells',
    'Cables'
  ];
  
  // Sample exercises for search
  const sampleExercises = [
    {
      id: 1,
      name: 'Barbell Squat',
      targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
      equipment: ['Barbell', 'Squat rack'],
      difficulty: 'intermediate',
      description: 'Compound lower body exercise targeting legs and glutes'
    },
    {
      id: 2,
      name: 'Push-ups',
      targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
      equipment: ['Bodyweight'],
      difficulty: 'beginner',
      description: 'Classic upper body bodyweight exercise'
    },
    {
      id: 3,
      name: 'Deadlift',
      targetMuscles: ['Hamstrings', 'Glutes', 'Back', 'Traps'],
      equipment: ['Barbell'],
      difficulty: 'advanced',
      description: 'Compound exercise targeting posterior chain'
    },
    {
      id: 4,
      name: 'Bench Press',
      targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
      equipment: ['Barbell', 'Bench'],
      difficulty: 'intermediate',
      description: 'Primary chest development exercise'
    },
    {
      id: 5,
      name: 'Pull-ups',
      targetMuscles: ['Lats', 'Rhomboids', 'Biceps'],
      equipment: ['Pull-up bar'],
      difficulty: 'intermediate',
      description: 'Vertical pulling exercise for back development'
    }
  ];
  
  /**
   * Search for exercise alternatives
   */
  const searchAlternatives = async () => {
    if (!selectedExercise) {
      enqueueSnackbar('Please select an exercise first', { variant: 'warning' });
      return;
    }
    
    // Short-circuit when MCP is disabled
    if (import.meta.env.VITE_ENABLE_MCP_SERVICES !== 'true') {
      enqueueSnackbar('AI exercise alternatives are currently disabled', { variant: 'info' });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare context for AI
      const mcpContext = {
        exercise: selectedExercise,
        limitations,
        availableEquipment: equipment,
        difficulty,
        targetMuscles: selectedExercise.targetMuscles,
        preferences: {
          maintainSimilarMovement: true,
          considerProgressions: true,
          includeRegressions: true
        }
      };

      // Call MCP backend for alternatives
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mcp/alternatives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.5,
          maxTokens: 2000,
          systemPrompt: `You are an expert fitness coach specializing in exercise modifications and alternatives.
                        Provide safe, effective alternatives that target similar muscle groups.
                        Consider equipment limitations, injuries, and skill level.
                        Format response as structured JSON with exercise details.`,
          humanMessage: `Find exercise alternatives for "${selectedExercise.name}".
                        Limitations: ${limitations.join(', ') || 'None'}
                        Available equipment: ${equipment.join(', ') || 'Any'}
                        Preferred difficulty: ${difficulty || 'Any'}`,
          mcpContext
        })
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Parse AI response
      let parsedAlternatives;
      try {
        parsedAlternatives = JSON.parse(result.content);
      } catch (parseError) {
        // If JSON parsing fails, generate alternatives based on exercise
        parsedAlternatives = generateAlternatives(selectedExercise);
      }
      
      setAlternatives(parsedAlternatives.alternatives || parsedAlternatives);
      enqueueSnackbar('Alternatives found successfully', { variant: 'success' });
    } catch (error) {
      console.error('Search error:', error);
      enqueueSnackbar('Search failed: ' + error.message, { variant: 'error' });
      // Show mock alternatives on error
      setAlternatives(generateAlternatives(selectedExercise));
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Generate mock alternatives based on selected exercise
   */
  const generateAlternatives = (exercise) => {
    // Mock alternatives based on exercise type
    const baseAlternatives = {
      'Barbell Squat': [
        {
          name: 'Goblet Squat',
          targetMuscles: ['Quadriceps', 'Glutes', 'Core'],
          equipment: ['Dumbbell', 'Kettlebell'],
          difficulty: 'beginner',
          similarity: 85,
          description: 'Front-loaded squat variation easier on the back',
          notes: 'Great for beginners and those with back issues',
          progressions: ['Add weight', 'Pulse squats', 'Jump squats']
        },
        {
          name: 'Wall Sit',
          targetMuscles: ['Quadriceps', 'Glutes'],
          equipment: ['Wall'],
          difficulty: 'beginner',
          similarity: 70,
          description: 'Isometric squat hold against wall',
          notes: 'Perfect for knee rehabilitation',
          progressions: ['Increase hold time', 'Single leg', 'Add weight']
        },
        {
          name: 'Split Squat',
          targetMuscles: ['Quadriceps', 'Glutes', 'Stabilizers'],
          equipment: ['Bodyweight'],
          difficulty: 'intermediate',
          similarity: 80,
          description: 'Unilateral squat variation',
          notes: 'Addresses imbalances and improves stability',
          progressions: ['Elevated rear foot', 'Add weight', 'Jump split squats']
        }
      ],
      'Push-ups': [
        {
          name: 'Incline Push-ups',
          targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
          equipment: ['Bench', 'Chair'],
          difficulty: 'beginner',
          similarity: 90,
          description: 'Push-ups with hands elevated',
          notes: 'Reduces body weight load, easier progression',
          progressions: ['Lower incline', 'Standard push-ups', 'Decline push-ups']
        },
        {
          name: 'Knee Push-ups',
          targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
          equipment: ['Floor mat'],
          difficulty: 'beginner',
          similarity: 85,
          description: 'Push-ups performed on knees',
          notes: 'Modified version for building strength',
          progressions: ['Increase reps', 'Standard push-ups', 'Negative push-ups']
        },
        {
          name: 'Resistance Band Chest Press',
          targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
          equipment: ['Resistance band'],
          difficulty: 'beginner',
          similarity: 75,
          description: 'Chest press movement with resistance band',
          notes: 'Joint-friendly alternative with variable resistance',
          progressions: ['Stronger band', 'Single arm', 'Explosive movements']
        }
      ]
    };
    
    return baseAlternatives[exercise.name] || [
      {
        name: 'Alternative Exercise 1',
        targetMuscles: exercise.targetMuscles,
        equipment: ['Bodyweight'],
        difficulty: 'beginner',
        similarity: 80,
        description: 'Modified version of the original exercise',
        notes: 'Safe alternative for all fitness levels',
        progressions: ['Basic progression', 'Intermediate variation', 'Advanced version']
      }
    ];
  };
  
  /**
   * Toggle limitation selection
   */
  const toggleLimitation = (limitation) => {
    setLimitations(prev => 
      prev.includes(limitation)
        ? prev.filter(l => l !== limitation)
        : [...prev, limitation]
    );
  };
  
  /**
   * Toggle equipment selection
   */
  const toggleEquipment = (item) => {
    setEquipment(prev => 
      prev.includes(item)
        ? prev.filter(e => e !== item)
        : [...prev, item]
    );
  };
  
  /**
   * Save alternative to user's list
   */
  const saveAlternative = (alternative) => {
    setSavedAlternatives(prev => [...prev, { ...alternative, savedAt: new Date() }]);
    enqueueSnackbar('Alternative saved successfully', { variant: 'success' });
  };
  
  /**
   * Filter exercises based on search term
   */
  const filteredExercises = sampleExercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.targetMuscles.some(muscle => 
      muscle.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  
  return (
    <AlternativesContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHoriz />
          Exercise Alternatives
        </Typography>
        <Button
          onClick={onClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          startIcon={<Close />}
        >
          Close
        </Button>
      </Box>
      
      {/* Search Interface */}
      <SearchCard>
        <CardContent>
          <Grid container spacing={3}>
            {/* Exercise Search */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search Exercise"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ color: 'rgba(255, 255, 255, 0.5)', mr: 1 }} />
                }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiInputBase-input': { color: 'white' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' }
                }}
              />
              
              {/* Exercise Selection */}
              {searchTerm && (
                <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                  {filteredExercises.map(exercise => (
                    <Card
                      key={exercise.id}
                      sx={{
                        backgroundColor: selectedExercise?.id === exercise.id 
                          ? 'rgba(76, 175, 80, 0.1)' 
                          : 'rgba(50, 50, 80, 0.5)',
                        border: selectedExercise?.id === exercise.id 
                          ? '1px solid #4caf50' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        mb: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                          {exercise.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {exercise.targetMuscles.join(', ')}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <DifficultyChip level={exercise.difficulty} label={exercise.difficulty} size="small" />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Grid>
            
            {/* Filters */}
            <Grid item xs={12} md={6}>
              <Button
                onClick={() => setFilterOpen(!filterOpen)}
                startIcon={<FilterList />}
                sx={{ color: '#4caf50', mb: 2 }}
              >
                Advanced Filters
              </Button>
              
              <Accordion expanded={filterOpen} sx={{ backgroundColor: 'rgba(50, 50, 80, 0.5)' }}>
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                  <Typography sx={{ color: 'white' }}>Limitations & Equipment</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Limitations */}
                  <Typography variant="body1" sx={{ color: 'white', mb: 1 }}>
                    Physical Limitations
                  </Typography>
                  <FormGroup sx={{ mb: 2 }}>
                    {availableLimitations.map(limitation => (
                      <FormControlLabel
                        key={limitation}
                        control={
                          <Checkbox
                            checked={limitations.includes(limitation)}
                            onChange={() => toggleLimitation(limitation)}
                            sx={{ color: '#4caf50' }}
                          />
                        }
                        label={limitation}
                        sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                      />
                    ))}
                  </FormGroup>
                  
                  {/* Equipment */}
                  <Typography variant="body1" sx={{ color: 'white', mb: 1 }}>
                    Available Equipment
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {availableEquipment.map(item => (
                      <EquipmentChip
                        key={item}
                        label={item}
                        onClick={() => toggleEquipment(item)}
                        variant={equipment.includes(item) ? 'filled' : 'outlined'}
                        sx={{
                          backgroundColor: equipment.includes(item) 
                            ? 'rgba(33, 150, 243, 0.3)' 
                            : 'transparent'
                        }}
                      />
                    ))}
                  </Box>
                  
                  {/* Difficulty Preference */}
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Preferred Difficulty
                    </InputLabel>
                    <Select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                        '& .MuiSvgIcon-root': { color: 'white' }
                      }}
                    >
                      <MenuItem value="">Any</MenuItem>
                      <MenuItem value="beginner">Beginner</MenuItem>
                      <MenuItem value="intermediate">Intermediate</MenuItem>
                      <MenuItem value="advanced">Advanced</MenuItem>
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            {/* Search Button */}
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                onClick={searchAlternatives}
                disabled={isLoading || !selectedExercise}
                sx={{
                  height: '56px',
                  background: 'linear-gradient(90deg, #4caf50, #66bb6a)',
                  '&:hover': { background: 'linear-gradient(90deg, #66bb6a, #4caf50)' },
                  fontSize: '1.1rem'
                }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Find Alternatives'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </SearchCard>
      
      {/* Selected Exercise Display */}
      {selectedExercise && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <ExerciseCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#4caf50', mb: 1 }}>
                      Selected Exercise: {selectedExercise.name}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                      {selectedExercise.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`Target: ${selectedExercise.targetMuscles.join(', ')}`}
                        sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}
                      />
                      <DifficultyChip level={selectedExercise.difficulty} label={selectedExercise.difficulty} />
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: '#4caf50', width: 56, height: 56 }}>
                    <FitnessCenter />
                  </Avatar>
                </Box>
              </CardContent>
            </ExerciseCard>
          </Grid>
        </Grid>
      )}
      
      {/* Alternatives Results */}
      {alternatives.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h6" sx={{ color: '#4caf50', mb: 2 }}>
            Alternative Exercises ({alternatives.length})
          </Typography>
          
          <Grid container spacing={2}>
            {alternatives.map((alternative, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <AlternativeCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#4caf50' }}>
                        {alternative.name}
                      </Typography>
                      <Tooltip title={`${alternative.similarity}% similar`}>
                        <Chip
                          label={`${alternative.similarity}%`}
                          size="small"
                          sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}
                        />
                      </Tooltip>
                    </Box>
                    
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                      {alternative.description}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Target Muscles:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        {alternative.targetMuscles.join(', ')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Equipment:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        {alternative.equipment.map(eq => (
                          <Chip
                            key={eq}
                            label={eq}
                            size="small"
                            sx={{ backgroundColor: 'rgba(33, 150, 243, 0.2)', color: '#2196f3' }}
                          />
                        ))}
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <DifficultyChip level={alternative.difficulty} label={alternative.difficulty} size="small" />
                    </Box>
                    
                    {alternative.notes && (
                      <Alert 
                        icon={<Info />}
                        severity="info" 
                        sx={{ 
                          mb: 2,
                          backgroundColor: 'rgba(33, 150, 243, 0.1)',
                          color: '#2196f3',
                          border: '1px solid rgba(33, 150, 243, 0.3)',
                          '& .MuiAlert-icon': { color: '#2196f3' }
                        }}
                      >
                        {alternative.notes}
                      </Alert>
                    )}
                    
                    {/* Progressions */}
                    <Accordion sx={{ backgroundColor: 'rgba(50, 50, 80, 0.3)' }}>
                      <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                        <Typography sx={{ color: 'white' }}>
                          <TrendingUp sx={{ mr: 1, fontSize: '1rem' }} />
                          Progressions
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {alternative.progressions.map((progression, progIndex) => (
                            <ListItem key={progIndex}>
                              <ListItemText
                                primary={progression}
                                sx={{ '& .MuiListItemText-primary': { color: 'rgba(255, 255, 255, 0.9)' } }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                    
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => saveAlternative(alternative)}
                        sx={{ borderColor: '#4caf50', color: '#4caf50' }}
                        startIcon={<Star />}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }}
                        startIcon={<PlayArrow />}
                      >
                        Demo
                      </Button>
                    </Box>
                  </CardContent>
                </AlternativeCard>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      )}
      
      {/* Empty State */}
      {!alternatives.length && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SwapHoriz sx={{ fontSize: '4rem', color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
            Search for exercise alternatives
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Find safe and effective exercise substitutions based on your needs
          </Typography>
        </Box>
      )}
    </AlternativesContainer>
  );
};

export default ExerciseAlternatives;