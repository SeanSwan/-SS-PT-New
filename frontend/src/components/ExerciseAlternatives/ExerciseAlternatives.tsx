/**
 * Exercise Alternatives Component
 * Find optimal exercise substitutions based on equipment and limitations
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │ Architecture: Styled-components + lucide-react          │
 * │ Theme: Galaxy-Swan (Core #0a0a1a, Cyan #00FFFF,         │
 * │        Purple #7851A9)                                   │
 * │ Touch targets: min-height 44px on all buttons            │
 * │ MUI-free: All UI via styled-components + native HTML     │
 * └─────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import {
  ArrowLeftRight, Search, ChevronDown, Dumbbell,
  User, Wrench, Timer, TrendingUp,
  CheckCircle2, Info, X, Play,
  Star, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// ─── Keyframes ────────────────────────────────────────────
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ────────────────────────────────────
const AlternativesContainer = styled.div`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const PageTitle = styled.h2`
  color: #4caf50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SearchCard = styled.div`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 2rem;
  padding: 1.5rem;
`;

const SearchGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SearchFullRow = styled.div`
  grid-column: 1 / -1;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIconWrapper = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  background: rgba(50, 50, 80, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 1rem;
  min-height: 44px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    border-color: #00FFFF;
  }
`;

const ExerciseDropdown = styled.div`
  margin-top: 1rem;
  max-height: 200px;
  overflow: auto;
`;

const ExerciseOption = styled.div<{ $selected: boolean }>`
  background: ${({ $selected }) =>
    $selected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(50, 50, 80, 0.5)'};
  border: 1px solid ${({ $selected }) =>
    $selected ? '#4caf50' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: ${({ $selected }) =>
      $selected ? '#4caf50' : 'rgba(255, 255, 255, 0.3)'};
  }
`;

const ExerciseOptionName = styled.p`
  margin: 0;
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
`;

const ExerciseOptionMuscles = styled.p`
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
`;

const ChipRow = styled.div`
  margin-top: 0.5rem;
`;

const FilterButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: #4caf50;
  cursor: pointer;
  font-size: 0.95rem;
  min-height: 44px;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
`;

/* ─── Accordion ──────────────────────────────── */
const AccordionWrapper = styled.div`
  background: rgba(50, 50, 80, 0.5);
  border-radius: 8px;
  overflow: hidden;
`;

const AccordionHeader = styled.button`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  color: white;
  padding: 1rem;
  cursor: pointer;
  font-size: 0.95rem;
  min-height: 44px;
`;

const AccordionChevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  transition: transform 0.3s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

const AccordionBody = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => ($open ? '2000px' : '0')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  overflow: hidden;
  transition: max-height 0.4s ease, opacity 0.3s ease;
  padding: ${({ $open }) => ($open ? '0 1rem 1rem' : '0 1rem')};
`;

/* ─── Form Controls ──────────────────────────── */
const SectionLabel = styled.p`
  color: white;
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  cursor: pointer;
  min-height: 36px;
  padding: 0.125rem 0;
`;

const StyledCheckbox = styled.input`
  accent-color: #4caf50;
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const EquipmentChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const EquipmentChip = styled.span<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
  border: 1px solid #2196f3;
  color: #2196f3;
  background: ${({ $selected }) =>
    $selected ? 'rgba(33, 150, 243, 0.3)' : 'transparent'};

  &:hover {
    background: rgba(33, 150, 243, 0.2);
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SelectLabel = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-bottom: 0.375rem;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(50, 50, 80, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  outline: none;
  appearance: auto;

  &:focus {
    border-color: #00FFFF;
  }

  option {
    background: #1e1e3c;
    color: white;
  }
`;

/* ─── Primary Action ─────────────────────────── */
const PrimaryButton = styled.button`
  width: 100%;
  min-height: 56px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #4caf50, #66bb6a);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(90deg, #66bb6a, #4caf50);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/* ─── Exercise Card ──────────────────────────── */
const ExerciseCard = styled.div`
  background: rgba(40, 40, 70, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.2);
    border-color: rgba(76, 175, 80, 0.4);
  }
`;

const ExerciseCardInner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SelectedTitle = styled.h3`
  color: #4caf50;
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 600;
`;

const SelectedDescription = styled.p`
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 1rem;
  font-size: 0.9rem;
`;

const ChipGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const InfoChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
`;

const DifficultyChip = styled.span<{ $level: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  background: ${({ $level }) =>
    $level === 'beginner' ? 'rgba(76, 175, 80, 0.2)' :
    $level === 'intermediate' ? 'rgba(255, 152, 0, 0.2)' :
    'rgba(244, 67, 54, 0.2)'};
  color: ${({ $level }) =>
    $level === 'beginner' ? '#4caf50' :
    $level === 'intermediate' ? '#ff9800' :
    '#f44336'};
  border: 1px solid ${({ $level }) =>
    $level === 'beginner' ? '#4caf50' :
    $level === 'intermediate' ? '#ff9800' :
    '#f44336'};
`;

const AvatarCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

/* ─── Alternatives Grid ──────────────────────── */
const SectionTitle = styled.h3`
  color: #4caf50;
  margin: 0 0 1rem;
  font-size: 1.15rem;
  font-weight: 600;
`;

const AlternativesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AlternativeCard = styled.div`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 1.25rem;
`;

const AltCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const AltCardTitle = styled.h4`
  color: #4caf50;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
`;

const SimilarityChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  white-space: nowrap;
`;

const AltDescription = styled.p`
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 1rem;
  font-size: 0.9rem;
`;

const DetailBlock = styled.div`
  margin-bottom: 1rem;
`;

const DetailLabel = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  margin-bottom: 0.125rem;
`;

const DetailValue = styled.span`
  color: white;
  font-size: 0.9rem;
`;

const EquipmentTagRow = styled.div`
  display: flex;
  gap: 0.375rem;
  margin-top: 0.375rem;
  flex-wrap: wrap;
`;

const EquipmentTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
`;

const DifficultyRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

/* ─── Alert ──────────────────────────────────── */
const InfoAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-left: 4px solid #2196f3;
  border-radius: 6px;
  color: #2196f3;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const InfoAlertIcon = styled.span`
  display: flex;
  flex-shrink: 0;
  margin-top: 2px;
`;

/* ─── Progressions List ──────────────────────── */
const ProgressionsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ProgressionItem = styled.li`
  padding: 0.375rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const ProgressionAccordionHeader = styled.button`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  color: white;
  padding: 0.75rem;
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 44px;
`;

const ProgressionLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

/* ─── Action Buttons ─────────────────────────── */
const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const OutlineButton = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid ${({ $color }) => $color || 'rgba(255, 255, 255, 0.3)'};
  border-radius: 6px;
  color: ${({ $color }) => $color || 'white'};
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ $color }) =>
      $color ? `${$color}15` : 'rgba(255, 255, 255, 0.05)'};
  }
`;

/* ─── Empty State ────────────────────────────── */
const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 0;
`;

const EmptyIcon = styled.div`
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 500;
`;

const EmptySubtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  font-size: 0.9rem;
`;

// ─── Types ────────────────────────────────────────────────
interface Exercise {
  id: number;
  name: string;
  targetMuscles: string[];
  equipment: string[];
  difficulty: string;
  description: string;
}

interface Alternative {
  name: string;
  targetMuscles: string[];
  equipment: string[];
  difficulty: string;
  similarity: number;
  description: string;
  notes?: string;
  progressions: string[];
}

interface ExerciseAlternativesProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────
const ExerciseAlternatives: React.FC<ExerciseAlternativesProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('');
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedAlternatives, setSavedAlternatives] = useState<(Alternative & { savedAt: Date })[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openProgressions, setOpenProgressions] = useState<Record<number, boolean>>({});

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
  const sampleExercises: Exercise[] = [
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
    } catch (error: any) {
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
  const generateAlternatives = (exercise: Exercise): Alternative[] => {
    const baseAlternatives: Record<string, Alternative[]> = {
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
  const toggleLimitation = (limitation: string) => {
    setLimitations(prev =>
      prev.includes(limitation)
        ? prev.filter(l => l !== limitation)
        : [...prev, limitation]
    );
  };

  /**
   * Toggle equipment selection
   */
  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item)
        ? prev.filter(e => e !== item)
        : [...prev, item]
    );
  };

  /**
   * Save alternative to user's list
   */
  const saveAlternative = (alternative: Alternative) => {
    setSavedAlternatives(prev => [...prev, { ...alternative, savedAt: new Date() }]);
    enqueueSnackbar('Alternative saved successfully', { variant: 'success' });
  };

  /**
   * Toggle progressions accordion per card index
   */
  const toggleProgressions = (index: number) => {
    setOpenProgressions(prev => ({ ...prev, [index]: !prev[index] }));
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
      {/* Header */}
      <HeaderRow>
        <PageTitle>
          <ArrowLeftRight size={28} />
          Exercise Alternatives
        </PageTitle>
        <CloseButton onClick={onClose}>
          <X size={18} />
          Close
        </CloseButton>
      </HeaderRow>

      {/* Search Interface */}
      <SearchCard>
        <SearchGrid>
          {/* Exercise Search */}
          <div>
            <InputWrapper>
              <SearchIconWrapper>
                <Search size={18} />
              </SearchIconWrapper>
              <StyledInput
                type="text"
                placeholder="Search Exercise"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputWrapper>

            {/* Exercise Selection */}
            {searchTerm && (
              <ExerciseDropdown>
                {filteredExercises.map(exercise => (
                  <ExerciseOption
                    key={exercise.id}
                    $selected={selectedExercise?.id === exercise.id}
                    onClick={() => setSelectedExercise(exercise)}
                  >
                    <ExerciseOptionName>{exercise.name}</ExerciseOptionName>
                    <ExerciseOptionMuscles>
                      {exercise.targetMuscles.join(', ')}
                    </ExerciseOptionMuscles>
                    <ChipRow>
                      <DifficultyChip $level={exercise.difficulty}>
                        {exercise.difficulty}
                      </DifficultyChip>
                    </ChipRow>
                  </ExerciseOption>
                ))}
              </ExerciseDropdown>
            )}
          </div>

          {/* Filters */}
          <div>
            <FilterButton onClick={() => setFilterOpen(!filterOpen)}>
              <Filter size={18} />
              Advanced Filters
            </FilterButton>

            <AccordionWrapper>
              <AccordionHeader onClick={() => setFilterOpen(!filterOpen)}>
                <span>Limitations &amp; Equipment</span>
                <AccordionChevron $open={filterOpen}>
                  <ChevronDown size={18} />
                </AccordionChevron>
              </AccordionHeader>
              <AccordionBody $open={filterOpen}>
                {/* Limitations */}
                <SectionLabel>Physical Limitations</SectionLabel>
                <CheckboxGroup>
                  {availableLimitations.map(limitation => (
                    <CheckboxLabel key={limitation}>
                      <StyledCheckbox
                        type="checkbox"
                        checked={limitations.includes(limitation)}
                        onChange={() => toggleLimitation(limitation)}
                      />
                      {limitation}
                    </CheckboxLabel>
                  ))}
                </CheckboxGroup>

                {/* Equipment */}
                <SectionLabel>Available Equipment</SectionLabel>
                <EquipmentChipRow>
                  {availableEquipment.map(item => (
                    <EquipmentChip
                      key={item}
                      $selected={equipment.includes(item)}
                      onClick={() => toggleEquipment(item)}
                    >
                      {item}
                    </EquipmentChip>
                  ))}
                </EquipmentChipRow>

                {/* Difficulty Preference */}
                <SelectWrapper>
                  <SelectLabel htmlFor="difficulty-select">
                    Preferred Difficulty
                  </SelectLabel>
                  <StyledSelect
                    id="difficulty-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </StyledSelect>
                </SelectWrapper>
              </AccordionBody>
            </AccordionWrapper>
          </div>

          {/* Search Button */}
          <SearchFullRow>
            <PrimaryButton
              onClick={searchAlternatives}
              disabled={isLoading || !selectedExercise}
            >
              {isLoading ? <Spinner /> : 'Find Alternatives'}
            </PrimaryButton>
          </SearchFullRow>
        </SearchGrid>
      </SearchCard>

      {/* Selected Exercise Display */}
      {selectedExercise && (
        <ExerciseCard>
          <ExerciseCardInner>
            <div>
              <SelectedTitle>
                Selected Exercise: {selectedExercise.name}
              </SelectedTitle>
              <SelectedDescription>
                {selectedExercise.description}
              </SelectedDescription>
              <ChipGroup>
                <InfoChip>
                  Target: {selectedExercise.targetMuscles.join(', ')}
                </InfoChip>
                <DifficultyChip $level={selectedExercise.difficulty}>
                  {selectedExercise.difficulty}
                </DifficultyChip>
              </ChipGroup>
            </div>
            <AvatarCircle>
              <Dumbbell size={28} color="white" />
            </AvatarCircle>
          </ExerciseCardInner>
        </ExerciseCard>
      )}

      {/* Alternatives Results */}
      {alternatives.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle>
            Alternative Exercises ({alternatives.length})
          </SectionTitle>

          <AlternativesGrid>
            {alternatives.map((alternative, index) => (
              <AlternativeCard key={index}>
                <AltCardHeader>
                  <AltCardTitle>{alternative.name}</AltCardTitle>
                  <SimilarityChip title={`${alternative.similarity}% similar`}>
                    {alternative.similarity}%
                  </SimilarityChip>
                </AltCardHeader>

                <AltDescription>{alternative.description}</AltDescription>

                <DetailBlock>
                  <DetailLabel>Target Muscles:</DetailLabel>
                  <DetailValue>{alternative.targetMuscles.join(', ')}</DetailValue>
                </DetailBlock>

                <DetailBlock>
                  <DetailLabel>Equipment:</DetailLabel>
                  <EquipmentTagRow>
                    {alternative.equipment.map(eq => (
                      <EquipmentTag key={eq}>{eq}</EquipmentTag>
                    ))}
                  </EquipmentTagRow>
                </DetailBlock>

                <DifficultyRow>
                  <DifficultyChip $level={alternative.difficulty}>
                    {alternative.difficulty}
                  </DifficultyChip>
                </DifficultyRow>

                {alternative.notes && (
                  <InfoAlert>
                    <InfoAlertIcon>
                      <Info size={16} />
                    </InfoAlertIcon>
                    <span>{alternative.notes}</span>
                  </InfoAlert>
                )}

                {/* Progressions */}
                <AccordionWrapper>
                  <ProgressionAccordionHeader onClick={() => toggleProgressions(index)}>
                    <ProgressionLabel>
                      <TrendingUp size={16} />
                      Progressions
                    </ProgressionLabel>
                    <AccordionChevron $open={!!openProgressions[index]}>
                      <ChevronDown size={16} />
                    </AccordionChevron>
                  </ProgressionAccordionHeader>
                  <AccordionBody $open={!!openProgressions[index]}>
                    <ProgressionsList>
                      {alternative.progressions.map((progression, progIndex) => (
                        <ProgressionItem key={progIndex}>
                          {progression}
                        </ProgressionItem>
                      ))}
                    </ProgressionsList>
                  </AccordionBody>
                </AccordionWrapper>

                <ActionRow>
                  <OutlineButton
                    $color="#4caf50"
                    onClick={() => saveAlternative(alternative)}
                  >
                    <Star size={16} />
                    Save
                  </OutlineButton>
                  <OutlineButton>
                    <Play size={16} />
                    Demo
                  </OutlineButton>
                </ActionRow>
              </AlternativeCard>
            ))}
          </AlternativesGrid>
        </motion.div>
      )}

      {/* Empty State */}
      {!alternatives.length && !isLoading && (
        <EmptyState>
          <EmptyIcon>
            <ArrowLeftRight size={64} />
          </EmptyIcon>
          <EmptyTitle>Search for exercise alternatives</EmptyTitle>
          <EmptySubtitle>
            Find safe and effective exercise substitutions based on your needs
          </EmptySubtitle>
        </EmptyState>
      )}
    </AlternativesContainer>
  );
};

export default ExerciseAlternatives;
