import React, { useState, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Search as SearchIcon,
  Dumbbell as ExerciseIcon,
  Plus as AddIcon,
  Edit as EditIcon,
  Filter as FilterIcon,
  ChevronDown as ExpandMoreIcon,
  Clock as DurationIcon,
  TrendingUp as DifficultyIcon,
  Tag as CategoryIcon,
  X as CloseIcon
} from 'lucide-react';
import { useWorkoutMcp, Exercise } from '../../hooks/useWorkoutMcp';

/* ───────────────────────────────────────────
   Types & Interfaces
   ─────────────────────────────────────────── */

interface ExerciseLibraryProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  selectedExercises?: string[];
  multiSelect?: boolean;
  filterOptions?: {
    categories?: string[];
    muscleGroups?: string[];
    equipment?: string[];
    difficulties?: string[];
  };
}

/* ───────────────────────────────────────────
   Galaxy-Swan Design Tokens
   ─────────────────────────────────────────── */

const theme = {
  bg: 'rgba(15, 23, 42, 0.95)',
  bgCard: 'rgba(15, 23, 42, 0.85)',
  bgHover: 'rgba(14, 165, 233, 0.08)',
  bgOverlay: 'rgba(0, 0, 0, 0.6)',
  border: 'rgba(14, 165, 233, 0.2)',
  borderActive: 'rgba(14, 165, 233, 0.5)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  secondary: '#a78bfa',
  radius: '12px',
  radiusSm: '8px',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
  shadowHover: '0 8px 32px rgba(14, 165, 233, 0.15)',
  glass: 'backdrop-filter: blur(12px);',
  transition: 'all 0.3s ease',
};

/* ───────────────────────────────────────────
   Animations
   ─────────────────────────────────────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
`;

/* ───────────────────────────────────────────
   Layout Styled Components
   ─────────────────────────────────────────── */

const Container = styled.div`
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0;
`;

const FabButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: 1px solid ${theme.border};
  background: linear-gradient(135deg, ${theme.accent}, #7c3aed);
  color: #fff;
  cursor: pointer;
  box-shadow: ${theme.shadow};
  transition: ${theme.transition};

  &:hover {
    transform: scale(1.08);
    box-shadow: ${theme.shadowHover};
  }

  &:active {
    transform: scale(0.96);
  }
`;

/* ───────────────────────────────────────────
   Search & Filter Bar
   ─────────────────────────────────────────── */

const SearchFilterSection = styled.div`
  margin-bottom: 24px;
`;

const SearchFilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: center;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr auto;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIconWrapper = styled.span`
  position: absolute;
  left: 14px;
  color: ${theme.textMuted};
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px 10px 42px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid ${theme.border};
  border-radius: ${theme.radiusSm};
  color: ${theme.text};
  font-size: 0.95rem;
  outline: none;
  transition: ${theme.transition};
  ${theme.glass}

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }
`;

const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SelectLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid ${theme.border};
  border-radius: ${theme.radiusSm};
  color: ${theme.text};
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: ${theme.transition};

  &:focus {
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  option {
    background: #0f172a;
    color: ${theme.text};
  }
`;

const FilterButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  border: 1px solid ${theme.border};
  border-radius: ${theme.radiusSm};
  color: ${theme.text};
  font-size: 0.95rem;
  cursor: pointer;
  transition: ${theme.transition};
  white-space: nowrap;

  &:hover {
    background: ${theme.bgHover};
    border-color: ${theme.borderActive};
  }
`;

/* ───────────────────────────────────────────
   Collapsible Accordion (replaces MUI Accordion)
   ─────────────────────────────────────────── */

const AccordionContainer = styled.div`
  margin-top: 16px;
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
  overflow: hidden;
  background: ${theme.bgCard};
  ${theme.glass}
`;

const AccordionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: ${theme.text};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition};

  &:hover {
    background: ${theme.bgHover};
  }
`;

const AccordionChevron = styled.span<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
  transform: ${({ $expanded }) => ($expanded ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

const AccordionBody = styled.div<{ $expanded: boolean }>`
  max-height: ${({ $expanded }) => ($expanded ? '500px' : '0')};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.3s ease;
  padding: ${({ $expanded }) => ($expanded ? '16px' : '0 16px')};
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

/* ───────────────────────────────────────────
   Alert (replaces MUI Alert)
   ─────────────────────────────────────────── */

const AlertBox = styled.div<{ $severity?: 'warning' | 'info' | 'error' | 'success' }>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: ${theme.radiusSm};
  border-left: 4px solid;
  font-size: 0.9rem;
  color: ${theme.text};
  animation: ${fadeIn} 0.3s ease;

  ${({ $severity }) => {
    switch ($severity) {
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.1);
          border-left-color: ${theme.warning};
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          border-left-color: ${theme.error};
        `;
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          border-left-color: ${theme.success};
        `;
      case 'info':
      default:
        return css`
          background: rgba(14, 165, 233, 0.1);
          border-left-color: ${theme.info};
        `;
    }
  }}
`;

/* ───────────────────────────────────────────
   Exercise Card Grid
   ─────────────────────────────────────────── */

const ExerciseGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const ExerciseCard = styled.div<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${theme.bgCard};
  border: ${({ $selected }) =>
    $selected ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`};
  border-radius: ${theme.radius};
  cursor: pointer;
  transition: ${theme.transition};
  overflow: hidden;
  animation: ${fadeIn} 0.3s ease;
  ${theme.glass}

  &:hover {
    box-shadow: ${theme.shadowHover};
    transform: translateY(-2px);
    border-color: ${theme.borderActive};
  }
`;

const CardBody = styled.div`
  flex: 1;
  padding: 16px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const ExerciseName = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 36px);
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${theme.textMuted};
  cursor: pointer;
  transition: ${theme.transition};

  &:hover {
    background: ${theme.bgHover};
    color: ${theme.accent};
  }
`;

const Description = styled.p`
  font-size: 0.85rem;
  color: ${theme.textMuted};
  margin: 0 0 12px;
  line-height: 1.5;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

/* Chip (replaces MUI Chip) */
interface ChipProps {
  $color?: string;
  $variant?: 'filled' | 'outlined';
}

const Chip = styled.span<ChipProps>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
  line-height: 1.4;
  transition: ${theme.transition};

  ${({ $variant, $color }) => {
    const c = $color || theme.accent;
    if ($variant === 'outlined') {
      return css`
        background: transparent;
        border: 1px solid ${c};
        color: ${c};
      `;
    }
    return css`
      background: ${c}22;
      border: 1px solid ${c}44;
      color: ${c};
    `;
  }}

  svg {
    width: 12px;
    height: 12px;
  }
`;

const CaptionLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const SmallChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`;

/* Card Footer (replaces CardActions) */
const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid ${theme.border};
`;

/* ───────────────────────────────────────────
   Buttons
   ─────────────────────────────────────────── */

const ButtonBase = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: ${theme.radiusSm};
  cursor: pointer;
  transition: ${theme.transition};
  white-space: nowrap;
`;

const PrimaryButton = styled(ButtonBase)`
  background: linear-gradient(135deg, ${theme.accent}, #7c3aed);
  border: none;
  color: #fff;

  &:hover {
    box-shadow: 0 0 16px rgba(14, 165, 233, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GhostButton = styled(ButtonBase)`
  background: transparent;
  border: none;
  color: ${theme.accent};

  &:hover {
    background: ${theme.bgHover};
  }
`;

const OutlineButton = styled(ButtonBase)<{ $active?: boolean }>`
  background: ${({ $active }) => ($active ? `${theme.accent}22` : 'transparent')};
  border: 1px solid ${({ $active }) => ($active ? theme.accent : theme.border)};
  color: ${({ $active }) => ($active ? theme.accent : theme.text)};

  &:hover {
    border-color: ${theme.accent};
    background: ${theme.bgHover};
  }
`;

/* ───────────────────────────────────────────
   Modal / Dialog (replaces MUI Dialog)
   ─────────────────────────────────────────── */

const ModalOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${theme.bgOverlay};
  animation: ${fadeIn} 0.2s ease;
`;

const ModalPanel = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
  box-shadow: ${theme.shadow};
  animation: ${scaleIn} 0.25s ease;
  ${theme.glass}

  /* scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${theme.border};
    border-radius: 3px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${theme.border};
`;

const ModalTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0;
`;

const ModalContent = styled.div`
  padding: 24px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${theme.border};
`;

/* ───────────────────────────────────────────
   List (replaces MUI List/ListItem/ListItemText)
   ─────────────────────────────────────────── */

const StyledList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledListItem = styled.li`
  padding: 8px 0;
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);

  &:last-child {
    border-bottom: none;
  }
`;

const ListPrimary = styled.div`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${theme.text};
`;

const ListSecondary = styled.div`
  font-size: 0.8rem;
  color: ${theme.textMuted};
  margin-top: 2px;
`;

const SectionTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 8px;
`;

const Paragraph = styled.p`
  font-size: 0.95rem;
  color: ${theme.textMuted};
  line-height: 1.65;
  margin: 0 0 16px;
`;

const DialogChipRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SectionBlock = styled.div`
  margin-bottom: 24px;
`;

/* ───────────────────────────────────────────
   Helper: Color mapping for chips
   ─────────────────────────────────────────── */

const difficultyColorMap: Record<string, string> = {
  beginner: theme.success,
  intermediate: theme.warning,
  advanced: theme.error,
};

const categoryColorMap: Record<string, string> = {
  strength: theme.accent,
  cardio: theme.error,
  flexibility: theme.secondary,
  core: theme.info,
};

/* ===================================================================
   Component
   =================================================================== */

const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  onExerciseSelect,
  selectedExercises = [],
  multiSelect = false,
  filterOptions = {}
}) => {
  const { getWorkoutRecommendations, loading, error } = useWorkoutMcp();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    muscleGroup: '',
    equipment: '',
    difficulty: '',
    goal: 'general'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mock data for fallback when MCP server is unavailable
  const mockExercises: Exercise[] = [
    {
      id: '1',
      name: 'Push-ups',
      description: 'Classic upper body exercise targeting chest, shoulders, and triceps',
      difficulty: 'beginner',
      category: 'strength',
      exerciseType: 'compound',
      muscleGroups: [
        { id: '1', name: 'Chest', shortName: 'chest', bodyRegion: 'upper_body' },
        { id: '2', name: 'Shoulders', shortName: 'shoulders', bodyRegion: 'upper_body' },
        { id: '3', name: 'Triceps', shortName: 'triceps', bodyRegion: 'upper_body' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    },
    {
      id: '2',
      name: 'Squats',
      description: 'Fundamental lower body exercise for legs and glutes',
      difficulty: 'beginner',
      category: 'strength',
      exerciseType: 'compound',
      muscleGroups: [
        { id: '4', name: 'Quadriceps', shortName: 'quads', bodyRegion: 'lower_body' },
        { id: '5', name: 'Glutes', shortName: 'glutes', bodyRegion: 'lower_body' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    },
    {
      id: '3',
      name: 'Deadlift',
      description: 'Full body compound movement focusing on posterior chain',
      difficulty: 'intermediate',
      category: 'strength',
      exerciseType: 'compound',
      muscleGroups: [
        { id: '6', name: 'Hamstrings', shortName: 'hamstrings', bodyRegion: 'lower_body' },
        { id: '5', name: 'Glutes', shortName: 'glutes', bodyRegion: 'lower_body' },
        { id: '7', name: 'Lower Back', shortName: 'lower_back', bodyRegion: 'core' }
      ],
      equipment: [{ id: '2', name: 'Barbell', category: 'free_weights' }]
    },
    {
      id: '4',
      name: 'Plank',
      description: 'Core stability exercise for abdominal strength',
      difficulty: 'beginner',
      category: 'core',
      exerciseType: 'isolation',
      muscleGroups: [
        { id: '8', name: 'Core', shortName: 'core', bodyRegion: 'core' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    },
    {
      id: '5',
      name: 'Bicycle Crunches',
      description: 'Dynamic ab exercise with rotational movement',
      difficulty: 'beginner',
      category: 'core',
      exerciseType: 'isolation',
      muscleGroups: [
        { id: '8', name: 'Core', shortName: 'core', bodyRegion: 'core' },
        { id: '9', name: 'Obliques', shortName: 'obliques', bodyRegion: 'core' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    }
  ];

  // Load exercises on component mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Filter exercises based on search and filters
  useEffect(() => {
    let filtered = exercises;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(exercise => exercise.category === filters.category);
    }

    // Muscle group filter
    if (filters.muscleGroup) {
      filtered = filtered.filter(exercise =>
        exercise.muscleGroups?.some(mg => mg.name === filters.muscleGroup)
      );
    }

    // Equipment filter
    if (filters.equipment) {
      filtered = filtered.filter(exercise =>
        exercise.equipment?.some(eq => eq.name === filters.equipment)
      );
    }

    // Difficulty filter
    if (filters.difficulty) {
      filtered = filtered.filter(exercise => exercise.difficulty === filters.difficulty);
    }

    setFilteredExercises(filtered);
  }, [exercises, searchTerm, filters]);

  const loadExercises = async () => {
    try {
      // Try to load from MCP server first
      const response = await getWorkoutRecommendations({
        userId: 'admin-library', // Special ID for admin library view
        goal: filters.goal,
        limit: 50
      });

      if (response?.exercises && response.exercises.length > 0) {
        setExercises(response.exercises);
      } else {
        // Fallback to mock data
        setExercises(mockExercises);
      }
    } catch (err) {
      console.error('Failed to load exercises from MCP:', err);
      // Use mock data as fallback
      setExercises(mockExercises);
    }
  };

  const handleExerciseClick = (exercise: Exercise) => {
    if (onExerciseSelect) {
      onExerciseSelect(exercise);
    }
    if (!multiSelect) {
      setSelectedExercise(exercise);
      setDialogOpen(true);
    }
  };

  const isExerciseSelected = (exerciseId: string) => {
    return selectedExercises.includes(exerciseId);
  };

  const getDifficultyColor = (difficulty: string): string => {
    return difficultyColorMap[difficulty] || theme.textMuted;
  };

  const getCategoryColor = (category: string): string => {
    return categoryColorMap[category] || theme.textMuted;
  };

  return (
    <Container>
      {/* Header */}
      <Header>
        <Title>Exercise Library</Title>
        <FabButton
          title="Add New Exercise"
          onClick={() => {/* TODO: Implement add exercise */}}
        >
          <AddIcon size={20} />
        </FabButton>
      </Header>

      {/* Search and Filter Bar */}
      <SearchFilterSection>
        <SearchFilterGrid>
          {/* Search field */}
          <SearchInputWrapper>
            <SearchIconWrapper>
              <SearchIcon size={18} />
            </SearchIconWrapper>
            <StyledInput
              type="text"
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchInputWrapper>

          {/* Goal select */}
          <SelectWrapper>
            <SelectLabel htmlFor="goal-select">Goal</SelectLabel>
            <StyledSelect
              id="goal-select"
              value={filters.goal}
              onChange={(e) => setFilters({ ...filters, goal: e.target.value })}
            >
              <option value="general">General Fitness</option>
              <option value="strength">Strength</option>
              <option value="hypertrophy">Muscle Building</option>
              <option value="endurance">Endurance</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="rehabilitation">Rehabilitation</option>
            </StyledSelect>
          </SelectWrapper>

          {/* Filter toggle */}
          <FilterButton onClick={() => setShowFilters(!showFilters)}>
            <FilterIcon size={16} />
            Filters
          </FilterButton>
        </SearchFilterGrid>

        {/* Advanced Filters */}
        {showFilters && (
          <AccordionContainer>
            <AccordionHeader onClick={() => setAdvancedOpen(!advancedOpen)}>
              <span>Advanced Filters</span>
              <AccordionChevron $expanded={advancedOpen}>
                <ExpandMoreIcon size={18} />
              </AccordionChevron>
            </AccordionHeader>
            <AccordionBody $expanded={advancedOpen}>
              <FilterGrid>
                {/* Category */}
                <SelectWrapper>
                  <SelectLabel htmlFor="filter-category">Category</SelectLabel>
                  <StyledSelect
                    id="filter-category"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="core">Core</option>
                    <option value="balance">Balance</option>
                  </StyledSelect>
                </SelectWrapper>

                {/* Muscle Group */}
                <SelectWrapper>
                  <SelectLabel htmlFor="filter-muscle">Muscle Group</SelectLabel>
                  <StyledSelect
                    id="filter-muscle"
                    value={filters.muscleGroup}
                    onChange={(e) => setFilters({ ...filters, muscleGroup: e.target.value })}
                  >
                    <option value="">All Muscle Groups</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Legs">Legs</option>
                    <option value="Core">Core</option>
                  </StyledSelect>
                </SelectWrapper>

                {/* Equipment */}
                <SelectWrapper>
                  <SelectLabel htmlFor="filter-equipment">Equipment</SelectLabel>
                  <StyledSelect
                    id="filter-equipment"
                    value={filters.equipment}
                    onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
                  >
                    <option value="">Any Equipment</option>
                    <option value="Bodyweight">Bodyweight</option>
                    <option value="Dumbbells">Dumbbells</option>
                    <option value="Barbell">Barbell</option>
                    <option value="Machines">Machines</option>
                    <option value="Resistance Bands">Resistance Bands</option>
                  </StyledSelect>
                </SelectWrapper>

                {/* Difficulty */}
                <SelectWrapper>
                  <SelectLabel htmlFor="filter-difficulty">Difficulty</SelectLabel>
                  <StyledSelect
                    id="filter-difficulty"
                    value={filters.difficulty}
                    onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </StyledSelect>
                </SelectWrapper>
              </FilterGrid>
            </AccordionBody>
          </AccordionContainer>
        )}
      </SearchFilterSection>

      {/* Error Alert */}
      {error && (
        <AlertBox $severity="warning">
          MCP Server connection issue. Showing cached exercises.
        </AlertBox>
      )}

      {/* Exercise Grid */}
      <ExerciseGrid>
        {filteredExercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            $selected={isExerciseSelected(exercise.id)}
            onClick={() => handleExerciseClick(exercise)}
          >
            <CardBody>
              <CardHeader>
                <ExerciseName>{exercise.name}</ExerciseName>
                <IconBtn
                  title="Edit exercise"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement edit exercise
                  }}
                >
                  <EditIcon size={16} />
                </IconBtn>
              </CardHeader>

              <Description>
                {exercise.description.length > 80
                  ? `${exercise.description.substring(0, 80)}...`
                  : exercise.description}
              </Description>

              <ChipRow>
                {exercise.category && (
                  <Chip $color={getCategoryColor(exercise.category)}>
                    <CategoryIcon size={12} />
                    {exercise.category}
                  </Chip>
                )}
                {exercise.difficulty && (
                  <Chip $color={getDifficultyColor(exercise.difficulty)}>
                    <DifficultyIcon size={12} />
                    {exercise.difficulty}
                  </Chip>
                )}
              </ChipRow>

              {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <CaptionLabel>Target Muscles:</CaptionLabel>
                  <SmallChipRow>
                    {exercise.muscleGroups.slice(0, 3).map((mg) => (
                      <Chip key={mg.id} $variant="outlined" $color={theme.accent}>
                        {mg.shortName}
                      </Chip>
                    ))}
                    {exercise.muscleGroups.length > 3 && (
                      <Chip $variant="outlined" $color={theme.secondary}>
                        +{exercise.muscleGroups.length - 3} more
                      </Chip>
                    )}
                  </SmallChipRow>
                </div>
              )}

              {exercise.equipment && exercise.equipment.length > 0 && (
                <div>
                  <CaptionLabel>Equipment:</CaptionLabel>
                  <SmallChipRow>
                    {exercise.equipment.slice(0, 2).map((eq) => (
                      <Chip key={eq.id} $variant="outlined" $color={theme.accent}>
                        <ExerciseIcon size={12} />
                        {eq.name}
                      </Chip>
                    ))}
                    {exercise.equipment.length > 2 && (
                      <Chip $variant="outlined" $color={theme.secondary}>
                        +{exercise.equipment.length - 2} more
                      </Chip>
                    )}
                  </SmallChipRow>
                </div>
              )}
            </CardBody>

            <CardFooter>
              <GhostButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedExercise(exercise);
                  setDialogOpen(true);
                }}
              >
                View Details
              </GhostButton>
              {multiSelect && (
                <OutlineButton
                  $active={isExerciseSelected(exercise.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onExerciseSelect) {
                      onExerciseSelect(exercise);
                    }
                  }}
                >
                  {isExerciseSelected(exercise.id) ? 'Selected' : 'Select'}
                </OutlineButton>
              )}
            </CardFooter>
          </ExerciseCard>
        ))}
      </ExerciseGrid>

      {/* Exercise Detail Modal */}
      <ModalOverlay $open={dialogOpen} onClick={() => setDialogOpen(false)}>
        {selectedExercise && (
          <ModalPanel onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flex: 1 }}>
                <ModalTitle>{selectedExercise.name}</ModalTitle>
                <DialogChipRow>
                  {selectedExercise.category && (
                    <Chip $color={getCategoryColor(selectedExercise.category)}>
                      {selectedExercise.category}
                    </Chip>
                  )}
                  {selectedExercise.difficulty && (
                    <Chip $color={getDifficultyColor(selectedExercise.difficulty)}>
                      {selectedExercise.difficulty}
                    </Chip>
                  )}
                </DialogChipRow>
              </div>
              <IconBtn title="Close" onClick={() => setDialogOpen(false)}>
                <CloseIcon size={18} />
              </IconBtn>
            </ModalHeader>

            <ModalContent>
              <Paragraph>{selectedExercise.description}</Paragraph>

              {selectedExercise.muscleGroups && selectedExercise.muscleGroups.length > 0 && (
                <SectionBlock>
                  <SectionTitle>Target Muscle Groups</SectionTitle>
                  <StyledList>
                    {selectedExercise.muscleGroups.map((mg) => (
                      <StyledListItem key={mg.id}>
                        <ListPrimary>{mg.name}</ListPrimary>
                        <ListSecondary>
                          {mg.shortName} - {mg.bodyRegion.replace('_', ' ')}
                        </ListSecondary>
                      </StyledListItem>
                    ))}
                  </StyledList>
                </SectionBlock>
              )}

              {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                <SectionBlock>
                  <SectionTitle>Required Equipment</SectionTitle>
                  <StyledList>
                    {selectedExercise.equipment.map((eq) => (
                      <StyledListItem key={eq.id}>
                        <ListPrimary>{eq.name}</ListPrimary>
                        <ListSecondary>{eq.category.replace('_', ' ')}</ListSecondary>
                      </StyledListItem>
                    ))}
                  </StyledList>
                </SectionBlock>
              )}

              {selectedExercise.isRehabExercise && (
                <AlertBox $severity="info">
                  This is a rehabilitation exercise. Please consult with a qualified healthcare provider.
                </AlertBox>
              )}
            </ModalContent>

            <ModalFooter>
              <GhostButton onClick={() => setDialogOpen(false)}>
                Close
              </GhostButton>
              {onExerciseSelect && (
                <PrimaryButton
                  onClick={() => {
                    onExerciseSelect(selectedExercise);
                    setDialogOpen(false);
                  }}
                >
                  Select Exercise
                </PrimaryButton>
              )}
            </ModalFooter>
          </ModalPanel>
        )}
      </ModalOverlay>
    </Container>
  );
};

export default ExerciseLibrary;
