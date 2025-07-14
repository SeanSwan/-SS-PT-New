/**
 * WorkoutLogger Component
 * ======================
 * 
 * Revolutionary NASM Workout Logging Interface for Trainers
 * The core trainer interface for comprehensive workout form submission
 * with real-time session deduction and MCP gamification integration.
 * 
 * Core Features:
 * - NASM-compliant workout form with comprehensive exercise tracking
 * - Real-time exercise library search and selection
 * - Advanced set logging with RPE, form quality, and performance notes
 * - Automatic session deduction with confirmation
 * - MCP integration for points and progress tracking
 * - Mobile-optimized for tablet use in gym environments
 * - WCAG AA accessibility compliance
 * 
 * Part of the NASM Workout Tracking System - Phase 2.3: Core Components
 * Designed for SwanStudios Platform - Production Ready
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { 
  Plus, Minus, Search, Save, X, AlertTriangle, CheckCircle, 
  Activity, Dumbbell, Clock, Target, Star, BarChart3,
  User, Calendar, MessageSquare, Zap, Timer, Weight,
  RotateCcw, ArrowLeft, ArrowRight, Info, HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { 
  dailyWorkoutFormService, 
  ExerciseEntry, 
  ExerciseSet,
  DailyWorkoutForm 
} from '../../services/nasmApiService';
import { ApiService } from '../../services/api.service';

// ==================== INTERFACES ====================

interface WorkoutLoggerProps {
  clientId: number;
  onComplete: (formData: DailyWorkoutForm) => void;
  onCancel: () => void;
  initialData?: Partial<ExerciseEntry[]>;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  exerciseType: string;
  difficulty: number;
  muscleGroups: string[];
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  phone?: string;
}

// ==================== STYLED COMPONENTS ====================

const stellarGlow = keyframes`
  0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
  100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
`;

const workoutTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    cardBg: '#334155',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#475569',
    inputBg: '#475569',
    buttonPrimary: '#3b82f6',
    buttonSecondary: '#64748b'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

const WorkoutLoggerContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(135deg, ${workoutTheme.colors.background} 0%, #1a202c 100%);
  padding: ${workoutTheme.spacing.lg};
  color: ${workoutTheme.colors.text};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    padding: ${workoutTheme.spacing.md};
  }
`;

const Header = styled.div`
  background: ${workoutTheme.colors.surface};
  border-radius: ${workoutTheme.borderRadius.lg};
  padding: ${workoutTheme.spacing.xl};
  margin-bottom: ${workoutTheme.spacing.xl};
  border: 1px solid ${workoutTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${workoutTheme.colors.primary}, ${workoutTheme.colors.accent});
  }
`;

const ClientInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${workoutTheme.spacing.sm};

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: ${workoutTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${workoutTheme.spacing.sm};
  }
`;

const SessionInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${workoutTheme.spacing.lg};
  margin-top: ${workoutTheme.spacing.md};
  font-size: 0.9rem;
  color: ${workoutTheme.colors.textSecondary};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${workoutTheme.spacing.sm};
  }
`;

const InfoBadge = styled.div<{ type: 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: center;
  gap: ${workoutTheme.spacing.xs};
  padding: ${workoutTheme.spacing.xs} ${workoutTheme.spacing.sm};
  border-radius: ${workoutTheme.borderRadius.md};
  font-weight: 500;
  background: ${props => 
    props.type === 'warning' ? `${workoutTheme.colors.warning}20` :
    props.type === 'success' ? `${workoutTheme.colors.success}20` :
    `${workoutTheme.colors.primary}20`
  };
  border: 1px solid ${props => 
    props.type === 'warning' ? workoutTheme.colors.warning :
    props.type === 'success' ? workoutTheme.colors.success :
    workoutTheme.colors.primary
  };
  color: ${props => 
    props.type === 'warning' ? workoutTheme.colors.warning :
    props.type === 'success' ? workoutTheme.colors.success :
    workoutTheme.colors.primary
  };
`;

const ExerciseSection = styled.div`
  margin-bottom: ${workoutTheme.spacing.xl};
`;

const ExerciseSearchBar = styled.div`
  position: relative;
  margin-bottom: ${workoutTheme.spacing.xl};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${workoutTheme.spacing.md} ${workoutTheme.spacing.md} ${workoutTheme.spacing.md} 3rem;
  background: ${workoutTheme.colors.inputBg};
  border: 2px solid ${workoutTheme.colors.border};
  border-radius: ${workoutTheme.borderRadius.lg};
  color: ${workoutTheme.colors.text};
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${workoutTheme.colors.primary};
    box-shadow: 0 0 0 3px ${workoutTheme.colors.primary}20;
  }

  &::placeholder {
    color: ${workoutTheme.colors.textSecondary};
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: ${workoutTheme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${workoutTheme.colors.textSecondary};
  pointer-events: none;
`;

const ExerciseCard = styled(motion.div)`
  background: ${workoutTheme.colors.cardBg};
  border-radius: ${workoutTheme.borderRadius.lg};
  padding: ${workoutTheme.spacing.xl};
  margin-bottom: ${workoutTheme.spacing.lg};
  border: 1px solid ${workoutTheme.colors.border};
  position: relative;

  &:hover {
    border-color: ${workoutTheme.colors.primary};
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: ${workoutTheme.spacing.lg};
  gap: ${workoutTheme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ExerciseTitle = styled.div`
  flex: 1;
  
  h3 {
    margin: 0 0 ${workoutTheme.spacing.xs} 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: ${workoutTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${workoutTheme.spacing.sm};
  }

  p {
    margin: 0;
    color: ${workoutTheme.colors.textSecondary};
    font-size: 0.9rem;
  }
`;

const ExerciseRatings = styled.div`
  display: flex;
  gap: ${workoutTheme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${workoutTheme.spacing.md};
  }
`;

const RatingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${workoutTheme.spacing.xs};
  min-width: 120px;

  label {
    font-size: 0.85rem;
    font-weight: 500;
    color: ${workoutTheme.colors.textSecondary};
  }
`;

const SetsTable = styled.div`
  background: ${workoutTheme.colors.surface};
  border-radius: ${workoutTheme.borderRadius.md};
  overflow: hidden;
  margin-bottom: ${workoutTheme.spacing.lg};
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 60px 100px 80px 80px 100px 100px 1fr 50px;
  gap: ${workoutTheme.spacing.sm};
  padding: ${workoutTheme.spacing.md};
  background: ${workoutTheme.colors.background};
  font-weight: 600;
  font-size: 0.85rem;
  color: ${workoutTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${workoutTheme.spacing.xs};
  }
`;

const SetRow = styled.div`
  display: grid;
  grid-template-columns: 60px 100px 80px 80px 100px 100px 1fr 50px;
  gap: ${workoutTheme.spacing.sm};
  padding: ${workoutTheme.spacing.md};
  border-bottom: 1px solid ${workoutTheme.colors.border};
  align-items: center;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${workoutTheme.colors.border}30;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${workoutTheme.spacing.sm};
  }
`;

const SetNumber = styled.div`
  font-weight: 600;
  color: ${workoutTheme.colors.primary};
  font-size: 1.1rem;
  text-align: center;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: ${workoutTheme.spacing.sm};
  background: ${workoutTheme.colors.inputBg};
  border: 1px solid ${workoutTheme.colors.border};
  border-radius: ${workoutTheme.borderRadius.sm};
  color: ${workoutTheme.colors.text};
  text-align: center;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${workoutTheme.colors.primary};
  }

  /* Remove number input arrows */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const TextInput = styled.input`
  width: 100%;
  padding: ${workoutTheme.spacing.sm};
  background: ${workoutTheme.colors.inputBg};
  border: 1px solid ${workoutTheme.colors.border};
  border-radius: ${workoutTheme.borderRadius.sm};
  color: ${workoutTheme.colors.text};
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${workoutTheme.colors.primary};
  }

  &::placeholder {
    color: ${workoutTheme.colors.textSecondary};
  }
`;

const StarRating = styled.div<{ value: number }>`
  display: flex;
  gap: 2px;
`;

const StarButton = styled.button<{ filled: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  transition: all 0.2s ease;
  
  svg {
    width: 16px;
    height: 16px;
    fill: ${props => props.filled ? workoutTheme.colors.warning : 'none'};
    stroke: ${workoutTheme.colors.warning};
  }

  &:hover svg {
    fill: ${workoutTheme.colors.warning};
    transform: scale(1.1);
  }
`;

const SliderInput = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${workoutTheme.colors.border};
  outline: none;
  appearance: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${workoutTheme.colors.primary};
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${workoutTheme.colors.primary};
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
`;

const SliderValue = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${workoutTheme.colors.primary};
`;

const AddSetButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${workoutTheme.spacing.sm};
  padding: ${workoutTheme.spacing.md} ${workoutTheme.spacing.lg};
  background: ${workoutTheme.colors.primary}20;
  border: 2px dashed ${workoutTheme.colors.primary};
  border-radius: ${workoutTheme.borderRadius.md};
  color: ${workoutTheme.colors.primary};
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    background: ${workoutTheme.colors.primary}30;
    border-style: solid;
    transform: translateY(-2px);
  }
`;

const RemoveSetButton = styled.button`
  background: ${workoutTheme.colors.error}20;
  border: 1px solid ${workoutTheme.colors.error};
  border-radius: ${workoutTheme.borderRadius.sm};
  color: ${workoutTheme.colors.error};
  cursor: pointer;
  padding: ${workoutTheme.spacing.xs};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${workoutTheme.colors.error}40;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const SessionSummary = styled.div`
  background: ${workoutTheme.colors.surface};
  border-radius: ${workoutTheme.borderRadius.lg};
  padding: ${workoutTheme.spacing.xl};
  margin-bottom: ${workoutTheme.spacing.xl};
  border: 1px solid ${workoutTheme.colors.border};
`;

const SummaryTitle = styled.h3`
  margin: 0 0 ${workoutTheme.spacing.lg} 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${workoutTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${workoutTheme.spacing.sm};
`;

const SummaryField = styled.div`
  margin-bottom: ${workoutTheme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    font-weight: 500;
    color: ${workoutTheme.colors.textSecondary};
    margin-bottom: ${workoutTheme.spacing.sm};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: ${workoutTheme.spacing.md};
  background: ${workoutTheme.colors.inputBg};
  border: 1px solid ${workoutTheme.colors.border};
  border-radius: ${workoutTheme.borderRadius.md};
  color: ${workoutTheme.colors.text};
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${workoutTheme.colors.primary};
  }

  &::placeholder {
    color: ${workoutTheme.colors.textSecondary};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${workoutTheme.spacing.md};
  justify-content: flex-end;
  margin-top: ${workoutTheme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: ${workoutTheme.spacing.md} ${workoutTheme.spacing.xl};
  border-radius: ${workoutTheme.borderRadius.md};
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: ${workoutTheme.spacing.sm};
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: center;

  background: ${props => 
    props.variant === 'primary' ? workoutTheme.colors.primary :
    props.variant === 'danger' ? workoutTheme.colors.error :
    workoutTheme.colors.buttonSecondary
  };
  
  color: ${workoutTheme.colors.text};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => 
      props.variant === 'primary' ? `${workoutTheme.colors.primary}40` :
      props.variant === 'danger' ? `${workoutTheme.colors.error}40` :
      `${workoutTheme.colors.buttonSecondary}40`
    };
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${workoutTheme.colors.border};
  border-radius: 50%;
  border-top-color: ${workoutTheme.colors.text};
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const AddExerciseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${workoutTheme.spacing.sm};
  padding: ${workoutTheme.spacing.lg} ${workoutTheme.spacing.xl};
  background: linear-gradient(135deg, ${workoutTheme.colors.primary}, ${workoutTheme.colors.accent});
  border: none;
  border-radius: ${workoutTheme.borderRadius.lg};
  color: ${workoutTheme.colors.text};
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  margin-bottom: ${workoutTheme.spacing.xl};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px ${workoutTheme.colors.primary}40;
  }
`;

// ==================== MAIN COMPONENT ====================

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ 
  clientId, 
  onComplete, 
  onCancel,
  initialData = []
}) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [overallIntensity, setOverallIntensity] = useState(5);
  const [client, setClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [popularExercises, setPopularExercises] = useState<Exercise[]>([]);

  // Load exercises from API based on search
  const loadExercises = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setAvailableExercises(popularExercises); // Show popular exercises when no search
      return;
    }

    setIsLoadingExercises(true);
    try {
      const api = new ApiService();
      const response = await api.get(`/exercises/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      
      if (response.success && response.exercises) {
        setAvailableExercises(response.exercises);
      } else {
        setAvailableExercises([]);
      }
    } catch (error) {
      console.error('Failed to search exercises:', error);
      setAvailableExercises([]);
      toast.error('Failed to search exercises. Please try again.');
    } finally {
      setIsLoadingExercises(false);
    }
  }, [popularExercises]);

  // Load popular exercises for initial display
  const loadPopularExercises = useCallback(async () => {
    try {
      const api = new ApiService();
      // Load some basic/popular exercises
      const response = await api.get('/exercises/search?q=squat&limit=5');
      
      if (response.success && response.exercises) {
        setPopularExercises(response.exercises);
        setAvailableExercises(response.exercises);
      }
    } catch (error) {
      console.error('Failed to load popular exercises:', error);
      // Fallback to empty array, not critical
    }
  }, []);

  // Load client data and popular exercises on mount
  useEffect(() => {
    loadClientData();
    loadPopularExercises();
  }, [clientId, loadPopularExercises]);

  // Load exercises based on search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadExercises(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, loadExercises]);

  const loadClientData = async () => {
    try {
      const api = new ApiService();
      const response = await api.get(`/workout-forms/client/${clientId}/info`);
      
      if (response.success && response.client) {
        setClient({
          id: response.client.id,
          firstName: response.client.firstName,
          lastName: response.client.lastName,
          email: response.client.email,
          availableSessions: response.client.availableSessions,
          phone: response.client.phone
        });
        
        // Show warning if client already has a workout today
        if (response.client.hasWorkoutToday) {
          toast.warning(`${response.client.firstName} already has a workout logged for today`);
        }
        
        // Show warning if client has low sessions
        if (response.client.availableSessions <= 1) {
          toast.warning(`${response.client.firstName} has only ${response.client.availableSessions} session(s) remaining`);
        }
      } else {
        throw new Error(response.message || 'Failed to load client data');
      }
    } catch (error: any) {
      console.error('Failed to load client data:', error);
      toast.error(error.message || 'Failed to load client information');
    }
  };

  const addExercise = useCallback((exercise: Exercise) => {
    const newExercise: ExerciseEntry = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [createEmptySet(1)],
      formRating: 3,
      painLevel: 0,
      performanceNotes: ''
    };
    setExercises(prev => [...prev, newExercise]);
    setSearchQuery('');
    setShowExerciseSearch(false);
    toast.success(`Added ${exercise.name} to workout`);
  }, []);

  const createEmptySet = useCallback((setNumber: number): ExerciseSet => ({
    setNumber,
    weight: 0,
    reps: 0,
    rpe: 5,
    tempo: '',
    restTime: 60,
    formQuality: 3,
    notes: ''
  }), []);

  const addSet = useCallback((exerciseIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const exercise = updated[exerciseIndex];
      const newSetNumber = exercise.sets.length + 1;
      exercise.sets.push(createEmptySet(newSetNumber));
      return updated;
    });
  }, [createEmptySet]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const exercise = updated[exerciseIndex];
      if (exercise.sets.length > 1) {
        exercise.sets.splice(setIndex, 1);
        // Renumber remaining sets
        exercise.sets.forEach((set, index) => {
          set.setNumber = index + 1;
        });
      }
      return updated;
    });
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex].sets[setIndex][field] = value;
      return updated;
    });
  }, []);

  const updateExercise = useCallback((exerciseIndex: number, field: keyof ExerciseEntry, value: any) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex][field] = value;
      return updated;
    });
  }, []);

  const removeExercise = useCallback((exerciseIndex: number) => {
    setExercises(prev => prev.filter((_, index) => index !== exerciseIndex));
    toast.info('Exercise removed from workout');
  }, []);

  const handleSubmit = async () => {
    if (exercises.length === 0) {
      toast.error('Please add at least one exercise');
      return;
    }

    if (!client) {
      toast.error('Client information not loaded');
      return;
    }

    if (client.availableSessions <= 0) {
      toast.error('Client has no available sessions remaining');
      return;
    }

    // Validate that all exercises have at least one complete set
    const hasIncompleteExercises = exercises.some(exercise => 
      exercise.sets.length === 0 || 
      exercise.sets.some(set => set.weight === 0 && set.reps === 0)
    );

    if (hasIncompleteExercises) {
      toast.error('Please complete all exercise sets before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        clientId,
        date: new Date().toISOString().split('T')[0],
        exercises,
        sessionNotes,
        overallIntensity
      };

      const response = await dailyWorkoutFormService.submitWorkoutForm(formData);

      if (response.success && response.data) {
        toast.success('Workout logged successfully! Session deducted and points earned.');
        onComplete(response.data);
      } else {
        throw new Error(response.message || 'Failed to submit workout form');
      }
    } catch (error: any) {
      console.error('Error submitting workout form:', error);
      toast.error(error.message || 'Failed to submit workout form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSets = useMemo(() => {
    return exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  }, [exercises]);

  const estimatedDuration = useMemo(() => {
    return Math.min(totalSets * 3, 120); // 3 minutes per set, cap at 2 hours
  }, [totalSets]);

  if (!client) {
    return (
      <WorkoutLoggerContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <LoadingSpinner />
        </div>
      </WorkoutLoggerContainer>
    );
  }

  return (
    <ThemeProvider theme={workoutTheme}>
      <WorkoutLoggerContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Header>
          <ClientInfo>
            <h2>
              <User size={24} />
              Logging Workout for: {client.firstName} {client.lastName}
            </h2>
            <SessionInfo>
              <InfoBadge type="info">
                <Calendar size={16} />
                Date: {new Date().toLocaleDateString()}
              </InfoBadge>
              <InfoBadge type={client.availableSessions > 3 ? 'success' : 'warning'}>
                <Activity size={16} />
                Sessions Remaining: {client.availableSessions}
              </InfoBadge>
              <InfoBadge type="info">
                <Clock size={16} />
                Est. Duration: {estimatedDuration} min
              </InfoBadge>
              <InfoBadge type="info">
                <BarChart3 size={16} />
                Total Sets: {totalSets}
              </InfoBadge>
            </SessionInfo>
          </ClientInfo>
        </Header>

        <ExerciseSection>
          <ExerciseSearchBar>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search exercises by name, type, or muscle group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowExerciseSearch(true)}
            />
            <AnimatePresence>
              {showExerciseSearch && (isLoadingExercises || availableExercises.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: workoutTheme.colors.surface,
                    border: `1px solid ${workoutTheme.colors.border}`,
                    borderRadius: workoutTheme.borderRadius.md,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    marginTop: workoutTheme.spacing.xs
                  }}
                >
                  {isLoadingExercises ? (
                    <div style={{ 
                      padding: workoutTheme.spacing.lg, 
                      textAlign: 'center', 
                      color: workoutTheme.colors.textSecondary 
                    }}>
                      <LoadingSpinner style={{ margin: '0 auto' }} />
                      <div style={{ marginTop: workoutTheme.spacing.sm }}>Searching exercises...</div>
                    </div>
                  ) : availableExercises.length > 0 ? (
                    availableExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        style={{
                          padding: workoutTheme.spacing.md,
                          cursor: 'pointer',
                          borderBottom: `1px solid ${workoutTheme.colors.border}`,
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${workoutTheme.colors.primary}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        onClick={() => addExercise(exercise)}
                      >
                        <div style={{ fontWeight: 600, color: workoutTheme.colors.text }}>
                          {exercise.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: workoutTheme.colors.textSecondary, marginTop: '4px' }}>
                          {exercise.exerciseType} • {exercise.muscleGroups.join(', ')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      padding: workoutTheme.spacing.lg, 
                      textAlign: 'center', 
                      color: workoutTheme.colors.textSecondary 
                    }}>
                      {searchQuery.length >= 2 ? 'No exercises found. Try a different search.' : 'Start typing to search exercises...'}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </ExerciseSearchBar>

          {exercises.length === 0 ? (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Your First Exercise
            </AddExerciseButton>
          ) : (
            exercises.map((exercise, exerciseIndex) => (
              <ExerciseCard
                key={exerciseIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: exerciseIndex * 0.1 }}
              >
                <ExerciseHeader>
                  <ExerciseTitle>
                    <h3>
                      <Dumbbell size={20} />
                      {exercise.exerciseName}
                    </h3>
                  </ExerciseTitle>
                  <ExerciseRatings>
                    <RatingGroup>
                      <label>Form Rating (1-5):</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StarRating value={exercise.formRating}>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <StarButton
                              key={rating}
                              filled={rating <= exercise.formRating}
                              onClick={() => updateExercise(exerciseIndex, 'formRating', rating)}
                            >
                              <Star size={16} />
                            </StarButton>
                          ))}
                        </StarRating>
                        <SliderValue>{exercise.formRating}/5</SliderValue>
                      </div>
                    </RatingGroup>
                    <RatingGroup>
                      <label>Pain Level (0-10):</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SliderInput
                          type="range"
                          min={0}
                          max={10}
                          value={exercise.painLevel}
                          onChange={(e) => updateExercise(exerciseIndex, 'painLevel', parseInt(e.target.value))}
                        />
                        <SliderValue>{exercise.painLevel}/10</SliderValue>
                      </div>
                    </RatingGroup>
                    <button
                      onClick={() => removeExercise(exerciseIndex)}
                      style={{
                        background: `${workoutTheme.colors.error}20`,
                        border: `1px solid ${workoutTheme.colors.error}`,
                        borderRadius: workoutTheme.borderRadius.sm,
                        color: workoutTheme.colors.error,
                        cursor: 'pointer',
                        padding: workoutTheme.spacing.sm,
                        alignSelf: 'flex-start'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </ExerciseRatings>
                </ExerciseHeader>

                <SetsTable>
                  <TableHeader>
                    <div>Set</div>
                    <div>Weight (lbs)</div>
                    <div>Reps</div>
                    <div>RPE (1-10)</div>
                    <div>Form (1-5)</div>
                    <div>Rest (sec)</div>
                    <div>Notes</div>
                    <div></div>
                  </TableHeader>
                  {exercise.sets.map((set, setIndex) => (
                    <SetRow key={setIndex}>
                      <SetNumber>{set.setNumber}</SetNumber>
                      <NumberInput
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <NumberInput
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SliderInput
                          type="range"
                          min={1}
                          max={10}
                          value={set.rpe}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'rpe', parseInt(e.target.value))}
                        />
                        <SliderValue>{set.rpe}</SliderValue>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StarRating value={set.formQuality}>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <StarButton
                              key={rating}
                              filled={rating <= set.formQuality}
                              onClick={() => updateSet(exerciseIndex, setIndex, 'formQuality', rating)}
                            >
                              <Star size={12} />
                            </StarButton>
                          ))}
                        </StarRating>
                      </div>
                      <NumberInput
                        type="number"
                        value={set.restTime || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'restTime', parseInt(e.target.value) || 60)}
                        placeholder="60"
                      />
                      <TextInput
                        value={set.notes || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'notes', e.target.value)}
                        placeholder="Form notes..."
                      />
                      <RemoveSetButton
                        onClick={() => removeSet(exerciseIndex, setIndex)}
                        disabled={exercise.sets.length <= 1}
                      >
                        <Minus size={14} />
                      </RemoveSetButton>
                    </SetRow>
                  ))}
                </SetsTable>

                <AddSetButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addSet(exerciseIndex)}
                >
                  <Plus size={16} />
                  Add Set
                </AddSetButton>
              </ExerciseCard>
            ))
          )}

          {exercises.length > 0 && (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Another Exercise
            </AddExerciseButton>
          )}
        </ExerciseSection>

        {exercises.length > 0 && (
          <SessionSummary>
            <SummaryTitle>
              <Target size={20} />
              Session Summary
            </SummaryTitle>
            
            <SummaryField>
              <label>Overall Session Intensity (1-10):</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SliderInput
                  type="range"
                  min={1}
                  max={10}
                  value={overallIntensity}
                  onChange={(e) => setOverallIntensity(parseInt(e.target.value))}
                />
                <SliderValue>{overallIntensity}/10</SliderValue>
              </div>
            </SummaryField>
            
            <SummaryField>
              <label>Session Notes:</label>
              <TextArea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Overall session notes, client feedback, observations, modifications made..."
                rows={4}
              />
            </SummaryField>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: workoutTheme.spacing.md,
              marginTop: workoutTheme.spacing.lg 
            }}>
              <InfoBadge type="info">
                <Activity size={16} />
                Total Exercises: {exercises.length}
              </InfoBadge>
              <InfoBadge type="info">
                <BarChart3 size={16} />
                Total Sets: {totalSets}
              </InfoBadge>
              <InfoBadge type="info">
                <Clock size={16} />
                Est. Duration: {estimatedDuration} min
              </InfoBadge>
              <InfoBadge type="warning">
                <AlertTriangle size={16} />
                Will Deduct 1 Session
              </InfoBadge>
            </div>
          </SessionSummary>
        )}

        <ActionButtons>
          <Button
            variant="secondary"
            onClick={onCancel}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={18} />
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={exercises.length === 0 || isSubmitting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSubmitting ? (
              <LoadingSpinner />
            ) : (
              <>
                <Save size={18} />
                Complete & Save Workout
              </>
            )}
          </Button>
        </ActionButtons>
      </WorkoutLoggerContainer>
    </ThemeProvider>
  );
};

export default WorkoutLogger;