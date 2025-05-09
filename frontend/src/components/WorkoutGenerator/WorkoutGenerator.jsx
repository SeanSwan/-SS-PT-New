/**
 * Workout Generator Component
 * 
 * A comprehensive interface for trainers to generate personalized workouts:
 * - Uses AI-powered MCP server to create customized plans
 * - Allows selection of focus areas, equipment, and workout types
 * - Integrates with client history and postural assessments
 * - Supports the trainer in creating high-quality, individualized programs
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, FormControlLabel, Checkbox, Paper, Divider, CircularProgress, 
  Card, CardContent, Grid, IconButton, Tooltip, Accordion, AccordionSummary,
  AccordionDetails, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  FitnessCenter, ExpandMore, Send, Save, Refresh,
  ContentCopy, Download, Share, Print, Edit, FilterList, Close,
  Check, Delete, Add, PlaylistAdd, RestartAlt
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import MCPService from './MCPService';

// Styled components
const GeneratorContainer = styled(Box)`
  background: rgba(30, 30, 60, 0.7);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  width: 100%;
  min-height: 600px;
  overflow: hidden;
  
  /* Glass morphism effect */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.6;
    z-index: -1;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const GeneratorTitle = styled(Typography)`
  font-size: 1.8rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  background: linear-gradient(
    to right,
    #a9f8fb,
    #46cdcf,
    #7b2cbf,
    #c8b6ff
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const ParameterSection = styled(Box)`
  margin-bottom: 2rem;
`;

const SectionTitle = styled(Typography)`
  font-size: 1.2rem;
  color: #00ffff;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    font-size: 1.4rem;
  }
`;

const StyledFormControl = styled(FormControl)`
  && {
    margin-bottom: 1rem;
    width: 100%;
    
    .MuiInputLabel-root {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .MuiOutlinedInput-root {
      background: rgba(20, 20, 40, 0.5);
      
      fieldset {
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover fieldset {
        border-color: rgba(0, 255, 255, 0.5);
      }
      
      &.Mui-focused fieldset {
        border-color: #00ffff;
      }
    }
    
    .MuiOutlinedInput-input {
      color: white;
    }
    
    .MuiSelect-icon {
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

const StyledTextField = styled(TextField)`
  && {
    margin-bottom: 1rem;
    width: 100%;
    
    .MuiInputLabel-root {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .MuiOutlinedInput-root {
      background: rgba(20, 20, 40, 0.5);
      
      fieldset {
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover fieldset {
        border-color: rgba(0, 255, 255, 0.5);
      }
      
      &.Mui-focused fieldset {
        border-color: #00ffff;
      }
    }
    
    .MuiOutlinedInput-input {
      color: white;
    }
  }
`;

const ChipContainer = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const StyledChip = styled(Chip)`
  && {
    background: ${props => props.selected ? 'rgba(0, 255, 255, 0.3)' : 'rgba(30, 30, 60, 0.5)'};
    color: white;
    border: 1px solid ${props => props.selected ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)'};
    
    &:hover {
      background: ${props => props.selected ? 'rgba(0, 255, 255, 0.4)' : 'rgba(30, 30, 60, 0.7)'};
    }
  }
`;

const ActionButton = styled(Button)`
  && {
    background: linear-gradient(90deg, #00ffff, #7851a9);
    color: white;
    border-radius: 8px;
    text-transform: none;
    padding: 0.5rem 1.5rem;
    margin-right: 1rem;
    
    &:hover {
      background: linear-gradient(90deg, #7851a9, #00ffff);
    }
    
    &:disabled {
      background: rgba(128, 128, 128, 0.3);
      color: rgba(255, 255, 255, 0.3);
    }
  }
`;

const SecondaryButton = styled(Button)`
  && {
    background: rgba(30, 30, 60, 0.7);
    color: white;
    border-radius: 8px;
    text-transform: none;
    padding: 0.5rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &:hover {
      background: rgba(50, 50, 80, 0.7);
    }
  }
`;

const ResultCard = styled(Card)`
  && {
    background: rgba(20, 20, 40, 0.7);
    color: white;
    border-radius: 8px;
    margin-top: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const ResultHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ResultContent = styled(Box)`
  padding: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  max-height: 600px;
  overflow-y: auto;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.3);
    border-radius: 4px;
  }
  
  h1, h2, h3, h4, h5, h6 {
    color: #00ffff;
  }
  
  strong {
    color: #a9f8fb;
  }
  
  ul, ol {
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  
  th, td {
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  th {
    background: rgba(0, 255, 255, 0.1);
  }
`;

const ResultActions = styled(Box)`
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  gap: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const LoadingOverlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(20, 20, 40, 0.8);
  z-index: 10;
  border-radius: 16px;
  backdrop-filter: blur(5px);
`;

// Available equipment options
const EQUIPMENT_OPTIONS = [
  'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands', 
  'TRX/Suspension Trainer', 'Pull-up Bar', 'Bench', 'Medicine Ball',
  'Stability Ball', 'Foam Roller', 'Battle Ropes', 'Cable Machine',
  'Smith Machine', 'Leg Press', 'Hack Squat', 'Leg Extension',
  'Lat Pulldown', 'Rowing Machine', 'Treadmill', 'Stationary Bike',
  'Elliptical', 'Stair Climber', 'None/Bodyweight'
];

// Focus area options
const FOCUS_AREAS = [
  'Upper Body', 'Lower Body', 'Core', 'Back', 'Chest', 'Shoulders',
  'Arms', 'Legs', 'Glutes', 'Full Body', 'Mobility', 'Flexibility',
  'Balance', 'Posture', 'Cardio', 'HIIT', 'Strength', 'Hypertrophy',
  'Endurance', 'Power', 'Weight Loss', 'Muscle Gain', 'Recovery'
];

// Workout types
const WORKOUT_TYPES = [
  'Full Body', 'Upper-Lower Split', 'Push-Pull-Legs', 'Body Part Split',
  'Circuit Training', 'HIIT', 'Tabata', 'Endurance', 'Strength Training',
  'Hypertrophy', 'Power', 'Olympic Lifting', 'Functional Training',
  'Calisthenics', 'Mobility Work', 'Recovery/Active Rest', 'Sport Specific'
];

// Time frames
const TIME_FRAMES = [
  'Single Session', 'Daily', 'Weekly', 'Bi-Weekly', 'Monthly'
];

// Intensity levels
const INTENSITY_LEVELS = [
  'Light', 'Moderate', 'Challenging', 'Intense', 'Very Intense'
];

// Mock client data (for testing)
const MOCK_CLIENT = {
  id: '12345',
  firstName: 'John',
  lastName: 'Doe',
  age: 32,
  height: 180, // cm
  weight: 85, // kg
  gender: 'male',
  goals: ['Muscle Gain', 'Strength', 'Improved Posture'],
  experienceLevel: 'Intermediate',
  medicalHistory: ['Previous shoulder injury (fully recovered)'],
  dietaryPreferences: ['High protein', 'Low processed foods', 'No GMO'],
  availableEquipment: ['Dumbbells', 'Barbell', 'Bench', 'Pull-up Bar'],
  workoutHistory: {
    frequencyPerWeek: 4,
    averageDuration: 60, // minutes
    preferredTimeOfDay: 'Morning',
    favoriteExercises: ['Deadlift', 'Pull-ups', 'Bench Press'],
    dislikedExercises: ['Burpees', 'Running']
  },
  posturalAssessment: {
    weakPoints: ['Anterior pelvic tilt', 'Rounded shoulders'],
    tightAreas: ['Hip flexors', 'Chest', 'Hamstrings'],
    recommendations: ['Core strengthening', 'Upper back exercises', 'Hip mobility work']
  },
  recentPerformance: {
    // Key exercise benchmarks
    benchmarks: {
      'Deadlift': '120kg x 5',
      'Bench Press': '90kg x 5',
      'Squat': '100kg x 5',
      'Pull-ups': 'BW x 8'
    },
    // Recent workout completions
    completedWorkouts: [
      { date: '2023-06-01', type: 'Upper Body', performance: 'Good' },
      { date: '2023-06-03', type: 'Lower Body', performance: 'Excellent' },
      { date: '2023-06-05', type: 'Full Body', performance: 'Average' },
      { date: '2023-06-07', type: 'Upper Body', performance: 'Good' }
    ]
  }
};

/**
 * AI-Powered Workout Generator Component
 * @param {Object} props - Component props
 * @param {Object} props.client - Client data (optional, will use mock data if not provided)
 * @param {function} props.onSave - Function to call when saving a generated workout
 * @param {function} props.onClose - Function to call when closing the generator
 */
const WorkoutGenerator = ({ client, onSave, onClose }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State for generator parameters
  const [focusAreas, setFocusAreas] = useState([]);
  const [workoutType, setWorkoutType] = useState('Full Body');
  const [timeFrame, setTimeFrame] = useState('Weekly');
  const [intensity, setIntensity] = useState('Moderate');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [includeEquipment, setIncludeEquipment] = useState([]);
  const [excludeEquipment, setExcludeEquipment] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // State for generation results
  const [generatedWorkout, setGeneratedWorkout] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [mcpAvailable, setMcpAvailable] = useState(false);
  
  // Check MCP server availability on mount
  useEffect(() => {
    const checkMcpServer = async () => {
      try {
        const isAvailable = await MCPService.checkServerStatus();
        setMcpAvailable(isAvailable);
        
        if (!isAvailable) {
          setError('MCP server is currently unavailable. Some features may be limited.');
        }
      } catch (err) {
        console.error('Error checking MCP server status:', err);
        setError('Could not connect to MCP server. Some features may be limited.');
        setMcpAvailable(false);
      }
    };
    
    checkMcpServer();
  }, []);
  
  // Initialize with client's equipment if available
  useEffect(() => {
    if (client?.availableEquipment && client.availableEquipment.length > 0) {
      setIncludeEquipment(client.availableEquipment);
    } else if (MOCK_CLIENT.availableEquipment && MOCK_CLIENT.availableEquipment.length > 0) {
      setIncludeEquipment(MOCK_CLIENT.availableEquipment);
    }
    
    // Initialize focus areas based on client's postural assessment if available
    if (client?.posturalAssessment?.recommendations) {
      const recommendedFocus = client.posturalAssessment.recommendations.filter(rec => 
        FOCUS_AREAS.includes(rec)
      );
      if (recommendedFocus.length > 0) {
        setFocusAreas(recommendedFocus);
      }
    } else if (MOCK_CLIENT.posturalAssessment?.recommendations) {
      const mockRecommendedFocus = MOCK_CLIENT.posturalAssessment.recommendations.filter(rec => 
        FOCUS_AREAS.some(area => rec.toLowerCase().includes(area.toLowerCase()))
      );
      if (mockRecommendedFocus.length > 0) {
        setFocusAreas(['Core', 'Back', 'Mobility']); // Based on mock data recommendations
      }
    }
  }, [client]);
  
  /**
   * Toggle a focus area selection
   * @param {string} area - Focus area to toggle
   */
  const toggleFocusArea = (area) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter(a => a !== area));
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };
  
  /**
   * Toggle an equipment item in the include list
   * @param {string} item - Equipment item to toggle
   */
  const toggleIncludeEquipment = (item) => {
    if (includeEquipment.includes(item)) {
      setIncludeEquipment(includeEquipment.filter(e => e !== item));
    } else {
      setIncludeEquipment([...includeEquipment, item]);
      // Remove from exclude list if present
      if (excludeEquipment.includes(item)) {
        setExcludeEquipment(excludeEquipment.filter(e => e !== item));
      }
    }
  };
  
  /**
   * Toggle an equipment item in the exclude list
   * @param {string} item - Equipment item to toggle
   */
  const toggleExcludeEquipment = (item) => {
    if (excludeEquipment.includes(item)) {
      setExcludeEquipment(excludeEquipment.filter(e => e !== item));
    } else {
      setExcludeEquipment([...excludeEquipment, item]);
      // Remove from include list if present
      if (includeEquipment.includes(item)) {
        setIncludeEquipment(includeEquipment.filter(e => e !== item));
      }
    }
  };
  
  /**
   * Reset all parameters to default values
   */
  const resetParameters = () => {
    setFocusAreas([]);
    setWorkoutType('Full Body');
    setTimeFrame('Weekly');
    setIntensity('Moderate');
    setSessionDuration(60);
    setIncludeEquipment(client?.availableEquipment || MOCK_CLIENT.availableEquipment || []);
    setExcludeEquipment([]);
    setAdditionalNotes('');
    setGeneratedWorkout('');
  };
  
  /**
   * Generate a workout based on current parameters
   */
  const generateWorkout = async () => {
    if (!mcpAvailable) {
      setError('MCP server is unavailable. Please try again later.');
      return;
    }
    
    if (focusAreas.length === 0) {
      setError('Please select at least one focus area');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      // Use actual client data if available, otherwise use mock data
      const clientData = client || MOCK_CLIENT;
      
      // Prepare generation options
      const options = {
        focusAreas,
        workoutType,
        timeFrame,
        intensity,
        sessionDuration,
        includeEquipment,
        excludeEquipment,
        additionalNotes: additionalNotes.trim(),
        temperature: 0.7, // Default creativity level
        maxTokens: 4000,
      };
      
      // Call MCP service to generate workout
      const result = await MCPService.generateWorkoutPlan(clientData, options);
      
      // Set the generated workout
      setGeneratedWorkout(result.workoutPlan);
      
      // Show success notification
      enqueueSnackbar('Workout plan generated successfully!', {
        variant: 'success',
        autoHideDuration: 3000
      });
    } catch (err) {
      console.error('Error generating workout plan:', err);
      
      if (err.mcpError) {
        setError(`MCP Error: ${err.mcpError.message}`);
      } else {
        setError('Failed to generate workout plan. Please try again later.');
      }
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Copy the generated workout to clipboard
   */
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedWorkout)
      .then(() => {
        enqueueSnackbar('Workout plan copied to clipboard', {
          variant: 'success',
          autoHideDuration: 2000
        });
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setError('Failed to copy to clipboard');
      });
  };
  
  /**
   * Save the generated workout
   */
  const handleSave = () => {
    if (onSave && generatedWorkout) {
      onSave(generatedWorkout, {
        focusAreas,
        workoutType,
        timeFrame,
        intensity,
        sessionDuration,
        includeEquipment,
        excludeEquipment,
        additionalNotes: additionalNotes.trim(),
        generatedAt: new Date().toISOString(),
        clientId: client?.id || MOCK_CLIENT.id
      });
      
      enqueueSnackbar('Workout plan saved successfully!', {
        variant: 'success',
        autoHideDuration: 3000
      });
    }
  };
  
  /**
   * Download the generated workout as a text file
   */
  const downloadWorkout = () => {
    if (!generatedWorkout) return;
    
    const element = document.createElement('a');
    const file = new Blob([generatedWorkout], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Workout_${workoutType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  return (
    <GeneratorContainer>
      <GeneratorTitle variant="h4">
        <FitnessCenter sx={{ mr: 1 }} />
        AI Workout Generator
      </GeneratorTitle>
      
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            background: 'rgba(211, 47, 47, 0.2)', 
            color: 'white',
            '& .MuiAlert-icon': { color: '#ff5252' }
          }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      {!generatedWorkout && (
        <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Focus Areas */}
          <ParameterSection>
            <SectionTitle variant="h6">
              <FitnessCenter fontSize="small" /> Focus Areas (Select 1-5)
            </SectionTitle>
            
            <ChipContainer>
              {FOCUS_AREAS.map((area) => (
                <StyledChip
                  key={area}
                  label={area}
                  clickable
                  selected={focusAreas.includes(area)}
                  onClick={() => toggleFocusArea(area)}
                />
              ))}
            </ChipContainer>
          </ParameterSection>
          
          {/* Basic Parameters */}
          <ParameterSection>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <StyledFormControl fullWidth>
                  <InputLabel>Workout Type</InputLabel>
                  <Select
                    value={workoutType}
                    onChange={(e) => setWorkoutType(e.target.value)}
                    label="Workout Type"
                  >
                    {WORKOUT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </StyledFormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StyledFormControl fullWidth>
                  <InputLabel>Time Frame</InputLabel>
                  <Select
                    value={timeFrame}
                    onChange={(e) => setTimeFrame(e.target.value)}
                    label="Time Frame"
                  >
                    {TIME_FRAMES.map((frame) => (
                      <MenuItem key={frame} value={frame}>{frame}</MenuItem>
                    ))}
                  </Select>
                </StyledFormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StyledFormControl fullWidth>
                  <InputLabel>Intensity</InputLabel>
                  <Select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    label="Intensity"
                  >
                    {INTENSITY_LEVELS.map((level) => (
                      <MenuItem key={level} value={level}>{level}</MenuItem>
                    ))}
                  </Select>
                </StyledFormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StyledTextField
                  label="Session Duration (minutes)"
                  type="number"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Math.max(15, Math.min(180, parseInt(e.target.value) || 60)))}
                  InputProps={{ inputProps: { min: 15, max: 180 } }}
                />
              </Grid>
            </Grid>
          </ParameterSection>
          
          {/* Equipment */}
          <ParameterSection>
            <Accordion 
              expanded={showAdvanced}
              onChange={() => setShowAdvanced(!showAdvanced)}
              sx={{ 
                background: 'rgba(30, 30, 60, 0.5)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                mb: 2,
                '&.Mui-expanded': {
                  borderRadius: '8px',
                },
                '&:before': {
                  display: 'none',
                }
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMore sx={{ color: 'white' }} />}
                sx={{ 
                  borderBottom: showAdvanced ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                }}
              >
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FilterList /> Advanced Options
                </Typography>
              </AccordionSummary>
              
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Include Equipment */}
                  <Grid item xs={12} md={6}>
                    <SectionTitle variant="subtitle1">Include Equipment</SectionTitle>
                    <ChipContainer>
                      {EQUIPMENT_OPTIONS.map((item) => (
                        <StyledChip
                          key={`include-${item}`}
                          label={item}
                          clickable
                          selected={includeEquipment.includes(item)}
                          onClick={() => toggleIncludeEquipment(item)}
                        />
                      ))}
                    </ChipContainer>
                  </Grid>
                  
                  {/* Exclude Equipment */}
                  <Grid item xs={12} md={6}>
                    <SectionTitle variant="subtitle1">Exclude Equipment</SectionTitle>
                    <ChipContainer>
                      {EQUIPMENT_OPTIONS.map((item) => (
                        <StyledChip
                          key={`exclude-${item}`}
                          label={item}
                          clickable
                          selected={excludeEquipment.includes(item)}
                          onClick={() => toggleExcludeEquipment(item)}
                        />
                      ))}
                    </ChipContainer>
                  </Grid>
                </Grid>
                
                {/* Additional Notes */}
                <StyledTextField
                  label="Additional Notes or Requirements"
                  multiline
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  fullWidth
                  placeholder="E.g., specific exercises to include/avoid, injury considerations, etc."
                />
              </AccordionDetails>
            </Accordion>
          </ParameterSection>
          
          {/* Generate Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <ActionButton
              startIcon={<Send />}
              onClick={generateWorkout}
              disabled={isGenerating || focusAreas.length === 0 || !mcpAvailable}
            >
              Generate Workout Plan
            </ActionButton>
            
            <SecondaryButton
              startIcon={<RestartAlt />}
              onClick={resetParameters}
              disabled={isGenerating}
            >
              Reset
            </SecondaryButton>
          </Box>
        </Box>
      )}
      
      {/* Generated Workout Result */}
      {generatedWorkout && (
        <ResultCard component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ResultHeader>
            <Typography variant="h6" sx={{ color: '#00ffff' }}>
              Generated Workout Plan: {workoutType} ({timeFrame})
            </Typography>
            
            <IconButton 
              onClick={() => setGeneratedWorkout('')}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <Close />
            </IconButton>
          </ResultHeader>
          
          <ResultContent>
            {/* Format the generated workout plan with markdown-like styling */}
            {generatedWorkout.split('\n').map((line, index) => {
              // Handle headers
              if (line.startsWith('# ')) {
                return <Typography key={index} variant="h4" sx={{ mt: 2, mb: 1 }}>{line.slice(2)}</Typography>;
              } else if (line.startsWith('## ')) {
                return <Typography key={index} variant="h5" sx={{ mt: 2, mb: 1 }}>{line.slice(3)}</Typography>;
              } else if (line.startsWith('### ')) {
                return <Typography key={index} variant="h6" sx={{ mt: 2, mb: 1 }}>{line.slice(4)}</Typography>;
              } 
              // Handle lists
              else if (line.startsWith('- ')) {
                return <Typography key={index} component="li" sx={{ ml: 2, mb: 0.5 }}>{line.slice(2)}</Typography>;
              } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                return <Typography key={index} component="li" sx={{ ml: 2, mb: 0.5 }}>{line.slice(3)}</Typography>;
              } 
              // Handle empty lines
              else if (line.trim() === '') {
                return <Box key={index} sx={{ height: '0.5rem' }} />;
              } 
              // Regular paragraphs
              else {
                return <Typography key={index} paragraph>{line}</Typography>;
              }
            })}
          </ResultContent>
          
          <ResultActions>
            <Tooltip title="Copy to Clipboard">
              <IconButton onClick={copyToClipboard} sx={{ color: '#00ffff' }}>
                <ContentCopy />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Download">
              <IconButton onClick={downloadWorkout} sx={{ color: '#00ffff' }}>
                <Download />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Print">
              <IconButton onClick={() => window.print()} sx={{ color: '#00ffff' }}>
                <Print />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Save">
              <IconButton onClick={handleSave} sx={{ color: '#00ffff' }}>
                <Save />
              </IconButton>
            </Tooltip>
            
            <ActionButton
              startIcon={<Send />}
              onClick={generateWorkout}
              disabled={isGenerating}
              sx={{ ml: 1 }}
            >
              Regenerate
            </ActionButton>
            
            <SecondaryButton
              startIcon={<Edit />}
              onClick={() => setGeneratedWorkout('')}
            >
              Edit Parameters
            </SecondaryButton>
          </ResultActions>
        </ResultCard>
      )}
      
      {/* Loading Overlay */}
      {isGenerating && (
        <LoadingOverlay>
          <CircularProgress sx={{ color: '#00ffff', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
            Generating Workout Plan
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Analyzing client data and creating personalized program...
          </Typography>
        </LoadingOverlay>
      )}
    </GeneratorContainer>
  );
};

export default WorkoutGenerator;
