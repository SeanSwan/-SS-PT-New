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
  Dumbbell, ChevronDown, Send, Save, RefreshCw,
  Copy, Download, Share2, Printer, Pencil, SlidersHorizontal, X,
  Check, Trash2, Plus, ListPlus, RotateCcw
} from 'lucide-react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import MCPService from './MCPService';

// ============================================================
// Styled Components - Galaxy-Swan Theme
// ============================================================

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const GeneratorContainer = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  width: 100%;
  min-height: 600px;
  overflow: hidden;

  /* Glass morphism effect */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(14, 165, 233, 0.2);
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

const GeneratorTitle = styled.h4`
  font-size: 1.8rem;
  font-weight: 300;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const ParameterSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h6`
  font-size: 1.2rem;
  font-weight: 500;
  color: #0ea5e9;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 1.2rem;
    height: 1.2rem;
  }
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const StyledChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: 20px;
  font-size: 0.875rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  background: ${props => props.$selected ? 'rgba(14, 165, 233, 0.3)' : 'rgba(15, 23, 42, 0.5)'};
  color: #e2e8f0;
  border: 1px solid ${props => props.$selected ? 'rgba(14, 165, 233, 0.8)' : 'rgba(14, 165, 233, 0.2)'};

  &:hover {
    background: ${props => props.$selected ? 'rgba(14, 165, 233, 0.4)' : 'rgba(15, 23, 42, 0.7)'};
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const EquipmentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
  width: 100%;
`;

const FormLabel = styled.label`
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.7);
  margin-bottom: 0.25rem;
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  background: rgba(15, 23, 42, 0.5);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  font-size: 0.9375rem;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(14, 165, 233, 0.5);
  }

  &:focus {
    border-color: #0ea5e9;
  }

  option {
    background: #0f172a;
    color: #e2e8f0;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  background: rgba(15, 23, 42, 0.5);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:hover {
    border-color: rgba(14, 165, 233, 0.5);
  }

  &:focus {
    border-color: #0ea5e9;
  }

  &::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.625rem 0.75rem;
  background: rgba(15, 23, 42, 0.5);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:hover {
    border-color: rgba(14, 165, 233, 0.5);
  }

  &:focus {
    border-color: #0ea5e9;
  }

  &::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.625rem 1.5rem;
  background: linear-gradient(90deg, #0ea5e9, #7851a9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  margin-right: 1rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(90deg, #7851a9, #0ea5e9);
  }

  &:disabled {
    background: rgba(128, 128, 128, 0.3);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.625rem 1.5rem;
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(30, 41, 59, 0.7);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem;
  background: transparent;
  color: ${props => props.$color || '#0ea5e9'};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;

  &:hover {
    background: rgba(14, 165, 233, 0.15);
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;

  &:hover > span {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }
`;

const TooltipText = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 0.375rem 0.75rem;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.75rem;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 50;
  border: 1px solid rgba(14, 165, 233, 0.2);
`;

const ResultCard = styled.div`
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  border-radius: 8px;
  margin-top: 1.5rem;
  border: 1px solid rgba(14, 165, 233, 0.2);
`;

const ResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
`;

const ResultHeaderTitle = styled.h6`
  font-size: 1.1rem;
  font-weight: 500;
  color: #0ea5e9;
  margin: 0;
`;

const ResultContent = styled.div`
  padding: 1.5rem;
  color: rgba(226, 232, 240, 0.9);
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
    background: rgba(14, 165, 233, 0.3);
    border-radius: 4px;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #0ea5e9;
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
    border: 1px solid rgba(14, 165, 233, 0.2);
  }

  th {
    background: rgba(14, 165, 233, 0.1);
  }
`;

const ResultActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 1rem;
  gap: 0.5rem;
  border-top: 1px solid rgba(14, 165, 233, 0.2);
  flex-wrap: wrap;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(15, 23, 42, 0.8);
  z-index: 10;
  border-radius: 16px;
  backdrop-filter: blur(5px);
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(14, 165, 233, 0.2);
  border-top-color: #0ea5e9;
  border-radius: 50%;
  animation: ${spinAnimation} 0.8s linear infinite;
  margin-bottom: 1rem;
`;

const LoadingTitle = styled.h6`
  font-size: 1.1rem;
  font-weight: 500;
  color: #e2e8f0;
  margin: 0 0 0.5rem 0;
`;

const LoadingSubtext = styled.p`
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.7);
  margin: 0;
`;

const AlertBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 0.9375rem;
`;

const AlertCloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #fca5a5;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: rgba(220, 38, 38, 0.2);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const AccordionWrapper = styled.div`
  background: rgba(15, 23, 42, 0.5);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const AccordionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 0.75rem 1rem;
  background: transparent;
  color: #e2e8f0;
  border: none;
  border-bottom: ${props => props.$expanded ? '1px solid rgba(14, 165, 233, 0.2)' : 'none'};
  cursor: pointer;
  font-size: 0.9375rem;
  font-family: inherit;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.05);
  }
`;

const AccordionHeaderContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }
`;

const AccordionChevron = styled.span`
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #e2e8f0;

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const AccordionBody = styled.div`
  padding: ${props => props.$expanded ? '1rem' : '0 1rem'};
  max-height: ${props => props.$expanded ? '2000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
`;

const ContentH4 = styled.h4`
  color: #0ea5e9;
  margin: 1rem 0 0.5rem 0;
  font-size: 1.4rem;
  font-weight: 600;
`;

const ContentH5 = styled.h5`
  color: #0ea5e9;
  margin: 1rem 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 500;
`;

const ContentH6 = styled.h6`
  color: #0ea5e9;
  margin: 1rem 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 500;
`;

const ContentLi = styled.li`
  margin-left: 1rem;
  margin-bottom: 0.375rem;
  color: rgba(226, 232, 240, 0.9);
`;

const ContentP = styled.p`
  margin: 0 0 0.75rem 0;
  color: rgba(226, 232, 240, 0.9);
  line-height: 1.6;
`;

const Spacer = styled.div`
  height: 0.5rem;
`;

// ============================================================
// Constants
// ============================================================

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
      <GeneratorTitle>
        <Dumbbell size={28} />
        AI Workout Generator
      </GeneratorTitle>

      {/* Error Alert */}
      {error && (
        <AlertBox>
          <span>{error}</span>
          <AlertCloseBtn onClick={() => setError('')} aria-label="Close alert">
            <X />
          </AlertCloseBtn>
        </AlertBox>
      )}

      {!generatedWorkout && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Focus Areas */}
          <ParameterSection>
            <SectionTitle>
              <Dumbbell /> Focus Areas (Select 1-5)
            </SectionTitle>

            <ChipContainer>
              {FOCUS_AREAS.map((area) => (
                <StyledChip
                  key={area}
                  $selected={focusAreas.includes(area)}
                  onClick={() => toggleFocusArea(area)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFocusArea(area); }}
                >
                  {area}
                </StyledChip>
              ))}
            </ChipContainer>
          </ParameterSection>

          {/* Basic Parameters */}
          <ParameterSection>
            <FormGrid>
              <FormGroup>
                <FormLabel htmlFor="workout-type">Workout Type</FormLabel>
                <StyledSelect
                  id="workout-type"
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                >
                  {WORKOUT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </StyledSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel htmlFor="time-frame">Time Frame</FormLabel>
                <StyledSelect
                  id="time-frame"
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value)}
                >
                  {TIME_FRAMES.map((frame) => (
                    <option key={frame} value={frame}>{frame}</option>
                  ))}
                </StyledSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel htmlFor="intensity">Intensity</FormLabel>
                <StyledSelect
                  id="intensity"
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value)}
                >
                  {INTENSITY_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </StyledSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel htmlFor="session-duration">Session Duration (minutes)</FormLabel>
                <StyledInput
                  id="session-duration"
                  type="number"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Math.max(15, Math.min(180, parseInt(e.target.value) || 60)))}
                  min={15}
                  max={180}
                />
              </FormGroup>
            </FormGrid>
          </ParameterSection>

          {/* Equipment - Accordion */}
          <ParameterSection>
            <AccordionWrapper>
              <AccordionHeader
                $expanded={showAdvanced}
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
              >
                <AccordionHeaderContent>
                  <SlidersHorizontal /> Advanced Options
                </AccordionHeaderContent>
                <AccordionChevron $expanded={showAdvanced}>
                  <ChevronDown />
                </AccordionChevron>
              </AccordionHeader>

              <AccordionBody $expanded={showAdvanced}>
                {showAdvanced && (
                  <>
                    <EquipmentGrid>
                      {/* Include Equipment */}
                      <div>
                        <SectionTitle>Include Equipment</SectionTitle>
                        <ChipContainer>
                          {EQUIPMENT_OPTIONS.map((item) => (
                            <StyledChip
                              key={`include-${item}`}
                              $selected={includeEquipment.includes(item)}
                              onClick={() => toggleIncludeEquipment(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleIncludeEquipment(item); }}
                            >
                              {item}
                            </StyledChip>
                          ))}
                        </ChipContainer>
                      </div>

                      {/* Exclude Equipment */}
                      <div>
                        <SectionTitle>Exclude Equipment</SectionTitle>
                        <ChipContainer>
                          {EQUIPMENT_OPTIONS.map((item) => (
                            <StyledChip
                              key={`exclude-${item}`}
                              $selected={excludeEquipment.includes(item)}
                              onClick={() => toggleExcludeEquipment(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExcludeEquipment(item); }}
                            >
                              {item}
                            </StyledChip>
                          ))}
                        </ChipContainer>
                      </div>
                    </EquipmentGrid>

                    {/* Additional Notes */}
                    <FormGroup>
                      <FormLabel htmlFor="additional-notes">Additional Notes or Requirements</FormLabel>
                      <StyledTextarea
                        id="additional-notes"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="E.g., specific exercises to include/avoid, injury considerations, etc."
                        rows={3}
                      />
                    </FormGroup>
                  </>
                )}
              </AccordionBody>
            </AccordionWrapper>
          </ParameterSection>

          {/* Generate Button */}
          <ButtonRow>
            <ActionButton
              onClick={generateWorkout}
              disabled={isGenerating || focusAreas.length === 0 || !mcpAvailable}
            >
              <Send size={16} />
              Generate Workout Plan
            </ActionButton>

            <SecondaryButton
              onClick={resetParameters}
              disabled={isGenerating}
            >
              <RotateCcw size={16} />
              Reset
            </SecondaryButton>
          </ButtonRow>
        </motion.div>
      )}

      {/* Generated Workout Result */}
      {generatedWorkout && (
        <ResultCard as={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ResultHeader>
            <ResultHeaderTitle>
              Generated Workout Plan: {workoutType} ({timeFrame})
            </ResultHeaderTitle>

            <IconBtn
              onClick={() => setGeneratedWorkout('')}
              $color="rgba(226, 232, 240, 0.7)"
              aria-label="Close results"
            >
              <X />
            </IconBtn>
          </ResultHeader>

          <ResultContent>
            {/* Format the generated workout plan with markdown-like styling */}
            {generatedWorkout.split('\n').map((line, index) => {
              // Handle headers
              if (line.startsWith('# ')) {
                return <ContentH4 key={index}>{line.slice(2)}</ContentH4>;
              } else if (line.startsWith('## ')) {
                return <ContentH5 key={index}>{line.slice(3)}</ContentH5>;
              } else if (line.startsWith('### ')) {
                return <ContentH6 key={index}>{line.slice(4)}</ContentH6>;
              }
              // Handle lists
              else if (line.startsWith('- ')) {
                return <ContentLi key={index}>{line.slice(2)}</ContentLi>;
              } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                return <ContentLi key={index}>{line.slice(3)}</ContentLi>;
              }
              // Handle empty lines
              else if (line.trim() === '') {
                return <Spacer key={index} />;
              }
              // Regular paragraphs
              else {
                return <ContentP key={index}>{line}</ContentP>;
              }
            })}
          </ResultContent>

          <ResultActions>
            <TooltipWrapper>
              <TooltipText>Copy to Clipboard</TooltipText>
              <IconBtn onClick={copyToClipboard} aria-label="Copy to Clipboard">
                <Copy />
              </IconBtn>
            </TooltipWrapper>

            <TooltipWrapper>
              <TooltipText>Download</TooltipText>
              <IconBtn onClick={downloadWorkout} aria-label="Download">
                <Download />
              </IconBtn>
            </TooltipWrapper>

            <TooltipWrapper>
              <TooltipText>Print</TooltipText>
              <IconBtn onClick={() => window.print()} aria-label="Print">
                <Printer />
              </IconBtn>
            </TooltipWrapper>

            <TooltipWrapper>
              <TooltipText>Save</TooltipText>
              <IconBtn onClick={handleSave} aria-label="Save">
                <Save />
              </IconBtn>
            </TooltipWrapper>

            <ActionButton
              onClick={generateWorkout}
              disabled={isGenerating}
              style={{ marginLeft: '0.5rem' }}
            >
              <Send size={16} />
              Regenerate
            </ActionButton>

            <SecondaryButton
              onClick={() => setGeneratedWorkout('')}
            >
              <Pencil size={16} />
              Edit Parameters
            </SecondaryButton>
          </ResultActions>
        </ResultCard>
      )}

      {/* Loading Overlay */}
      {isGenerating && (
        <LoadingOverlay>
          <Spinner />
          <LoadingTitle>
            Generating Workout Plan
          </LoadingTitle>
          <LoadingSubtext>
            Analyzing client data and creating personalized program...
          </LoadingSubtext>
        </LoadingOverlay>
      )}
    </GeneratorContainer>
  );
};

export default WorkoutGenerator;
