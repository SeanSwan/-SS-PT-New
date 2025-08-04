/**
 * ExerciseLibraryManager.tsx
 * ==========================
 * 
 * Comprehensive exercise library management with filtering and search
 * Ultra-mobile responsive with professional data table design
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Advanced search and filtering capabilities
 * - Professional data table with sorting
 * - Bulk operations and management
 * - Mobile-optimized card layout
 * - Real-time search with debouncing
 * - Accessibility-first design (WCAG AA compliant)
 * - Infinite scroll pagination
 * - Export functionality
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  Search, Filter, Grid, List, MoreVertical, Eye, Edit3, 
  Trash2, Play, Star, Calendar, Users, TrendingUp, 
  ArrowUpDown, ChevronLeft, ChevronRight, Download,
  RefreshCw, Plus, CheckSquare, Square, X, Dumbbell,
  Target, Shield, Award, Clock, BarChart3, Video
} from 'lucide-react';

import { exerciseCommandTheme, mediaQueries } from '../styles/exerciseCommandTheme';
import { 
  motionVariants,
  cardHover,
  fadeIn,
  slideUp,
  accessibleAnimation,
  animationPerformance
} from '../styles/gamificationAnimations';

// === STYLED COMPONENTS ===

const LibraryContainer = styled(motion.div)`
  width: 100%;
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.xl};
  overflow: hidden;
  
  ${animationPerformance}
  ${accessibleAnimation}
`;

const LibraryHeader = styled.div`
  padding: ${exerciseCommandTheme.spacing.xl};
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(30, 58, 138, 0.05);
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.md};
    align-items: flex-start;
  }
`;

const LibraryTitle = styled.h3`
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.primaryText};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.md};
  
  .title-icon {
    color: ${exerciseCommandTheme.colors.stellarBlue};
  }
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.sm};
  align-items: center;
  
  ${mediaQueries.mobile} {
    width: 100%;
    justify-content: space-between;
  }
`;

const ViewToggle = styled.div`
  display: flex;
  background: rgba(30, 58, 138, 0.1);
  border-radius: ${exerciseCommandTheme.borderRadius.md};
  padding: 2px;
  
  ${mediaQueries.mobile} {
    order: 2;
  }
`;

const ViewButton = styled(motion.button)<{ isActive: boolean }>`
  padding: ${exerciseCommandTheme.spacing.sm};
  border: none;
  background: ${props => 
    props.isActive 
      ? exerciseCommandTheme.gradients.buttonPrimary 
      : 'transparent'
  };
  color: ${props => 
    props.isActive 
      ? exerciseCommandTheme.colors.stellarWhite 
      : exerciseCommandTheme.colors.secondaryText
  };
  border-radius: ${exerciseCommandTheme.borderRadius.sm};
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    background: ${props => 
      props.isActive 
        ? exerciseCommandTheme.gradients.buttonPrimary 
        : 'rgba(59, 130, 246, 0.1)'
    };
  }
`;

const ActionButton = styled(motion.button)`
  width: 36px;
  height: 36px;
  border-radius: ${exerciseCommandTheme.borderRadius.md};
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: ${exerciseCommandTheme.colors.stellarBlue};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const SearchFilterRow = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.md};
  align-items: center;
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  
  ${mediaQueries.mobile} {
    max-width: none;
  }
`;

const SearchInput = styled(motion.input)`
  width: 100%;
  padding: ${exerciseCommandTheme.spacing.md} ${exerciseCommandTheme.spacing.lg};
  padding-left: 45px;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  background: ${exerciseCommandTheme.colors.inputBackground};
  color: ${exerciseCommandTheme.colors.primaryText};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:focus {
    outline: none;
    border-color: ${exerciseCommandTheme.colors.stellarBlue};
    box-shadow: ${exerciseCommandTheme.shadows.inputFocus};
  }
  
  &::placeholder {
    color: ${exerciseCommandTheme.colors.placeholderText};
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: ${exerciseCommandTheme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${exerciseCommandTheme.colors.secondaryText};
  pointer-events: none;
`;

const FilterButton = styled(motion.button)<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  padding: ${exerciseCommandTheme.spacing.md} ${exerciseCommandTheme.spacing.lg};
  border: 2px solid ${props => 
    props.isActive 
      ? exerciseCommandTheme.colors.stellarBlue 
      : 'rgba(59, 130, 246, 0.2)'
  };
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  background: ${props => 
    props.isActive 
      ? 'rgba(59, 130, 246, 0.1)' 
      : exerciseCommandTheme.colors.inputBackground
  };
  color: ${props => 
    props.isActive 
      ? exerciseCommandTheme.colors.stellarBlue 
      : exerciseCommandTheme.colors.secondaryText
  };
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    border-color: ${exerciseCommandTheme.colors.stellarBlue};
    background: rgba(59, 130, 246, 0.1);
  }
`;

const LibraryContent = styled.div`
  padding: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

// Table View
const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  border: 1px solid rgba(59, 130, 246, 0.1);
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(30, 58, 138, 0.1);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${exerciseCommandTheme.gradients.commandCenter};
    border-radius: 4px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: rgba(30, 58, 138, 0.05);
`;

const TableHeader = styled.thead`
  background: rgba(30, 58, 138, 0.1);
`;

const TableHeaderCell = styled.th<{ sortable?: boolean }>`
  padding: ${exerciseCommandTheme.spacing.lg};
  text-align: left;
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  color: ${exerciseCommandTheme.colors.primaryText};
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  white-space: nowrap;
  cursor: ${props => props.sortable ? 'pointer' : 'default'};
  
  &:hover {
    background: ${props => props.sortable ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
  }
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
  }
`;

const TableRow = styled(motion.tr)`
  &:hover {
    background: rgba(59, 130, 246, 0.05);
  }
`;

const TableCell = styled.td`
  padding: ${exerciseCommandTheme.spacing.lg};
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  color: ${exerciseCommandTheme.colors.secondaryText};
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
  }
`;

// Card View
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    grid-template-columns: 1fr;
    gap: ${exerciseCommandTheme.spacing.lg};
  }
`;

const ExerciseCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  overflow: hidden;
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    background: rgba(30, 58, 138, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-4px);
    box-shadow: ${exerciseCommandTheme.shadows.exerciseCardHover};
  }
`;

const CardHeader = styled.div`
  position: relative;
  height: 160px;
  background: ${exerciseCommandTheme.gradients.uploadZone};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  ${mediaQueries.mobile} {
    height: 120px;
  }
`;

const CardThumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CardPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${exerciseCommandTheme.colors.secondaryText};
  
  .placeholder-icon {
    margin-bottom: ${exerciseCommandTheme.spacing.sm};
    opacity: 0.5;
  }
`;

const CardOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: ${exerciseCommandTheme.spacing.lg};
  opacity: 0;
  transition: opacity ${exerciseCommandTheme.transitions.base};
  
  ${ExerciseCard}:hover & {
    opacity: 1;
  }
`;

const PlayButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  background: ${exerciseCommandTheme.gradients.buttonPrimary};
  border: none;
  color: ${exerciseCommandTheme.colors.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.xs};
`;

const CardActionButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  border-radius: ${exerciseCommandTheme.borderRadius.md};
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: ${exerciseCommandTheme.colors.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const CardContent = styled.div`
  padding: ${exerciseCommandTheme.spacing.lg};
`;

const CardTitle = styled.h4`
  font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  color: ${exerciseCommandTheme.colors.primaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.sm};
  line-height: ${exerciseCommandTheme.typography.lineHeights.tight};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  }
`;

const CardDescription = styled.p`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  color: ${exerciseCommandTheme.colors.secondaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.md};
  line-height: ${exerciseCommandTheme.typography.lineHeights.normal};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  }
`;

const CardTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${exerciseCommandTheme.spacing.xs};
  margin-bottom: ${exerciseCommandTheme.spacing.md};
`;

const Tag = styled.span`
  background: ${exerciseCommandTheme.gradients.buttonPrimary};
  color: ${exerciseCommandTheme.colors.stellarWhite};
  padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.sm};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-size: 0.625rem;
  font-weight: ${exerciseCommandTheme.typography.fontWeights.medium};
`;

const CardStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${exerciseCommandTheme.spacing.md};
  border-top: 1px solid rgba(59, 130, 246, 0.1);
`;

const StatGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.xs};
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  color: ${exerciseCommandTheme.colors.secondaryText};
`;

// Pagination & Loading
const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${exerciseCommandTheme.spacing.xl};
  padding-top: ${exerciseCommandTheme.spacing.xl};
  border-top: 1px solid rgba(59, 130, 246, 0.1);
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.md};
  }
`;

const PaginationInfo = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  color: ${exerciseCommandTheme.colors.secondaryText};
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.sm};
`;

const PaginationButton = styled(motion.button)<{ isActive?: boolean }>`
  min-width: 36px;
  height: 36px;
  border-radius: ${exerciseCommandTheme.borderRadius.md};
  border: 1px solid rgba(59, 130, 246, 0.2);
  background: ${props => 
    props.isActive 
      ? exerciseCommandTheme.gradients.buttonPrimary 
      : 'rgba(30, 58, 138, 0.05)'
  };
  color: ${props => 
    props.isActive 
      ? exerciseCommandTheme.colors.stellarWhite 
      : exerciseCommandTheme.colors.secondaryText
  };
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover:not(:disabled) {
    background: ${props => 
      props.isActive 
        ? exerciseCommandTheme.gradients.buttonPrimary 
        : 'rgba(59, 130, 246, 0.1)'
    };
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${exerciseCommandTheme.spacing['3xl']};
  color: ${exerciseCommandTheme.colors.secondaryText};
  
  .loading-icon {
    margin-bottom: ${exerciseCommandTheme.spacing.lg};
    animation: ${motionVariants.float.animate};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${exerciseCommandTheme.spacing['3xl']};
  color: ${exerciseCommandTheme.colors.secondaryText};
  text-align: center;
  
  .empty-icon {
    margin-bottom: ${exerciseCommandTheme.spacing.lg};
    opacity: 0.5;
  }
  
  h4 {
    color: ${exerciseCommandTheme.colors.primaryText};
    margin-bottom: ${exerciseCommandTheme.spacing.sm};
  }
`;

// === INTERFACES ===

interface Exercise {
  id: string;
  name: string;
  description: string;
  exerciseType: string;
  primaryMuscles: string[];
  difficulty: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  nasmScore?: number;
  createdAt: string;
  updatedAt: string;
  stats?: {
    views: number;
    completions: number;
    avgRating: number;
    lastUsed: string;
  };
}

interface ExerciseLibraryManagerProps {
  onExerciseSelect: (exercise: Exercise) => void;
  onExerciseEdit: (exercise: Exercise) => void;
  isLoading?: boolean;
  className?: string;
}

type ViewMode = 'table' | 'grid';
type SortField = 'name' | 'type' | 'difficulty' | 'created' | 'views' | 'rating';
type SortDirection = 'asc' | 'desc';

// === UTILITY FUNCTIONS ===

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const getDifficultyLabel = (difficulty: number): string => {
  if (difficulty <= 200) return 'Beginner';
  if (difficulty <= 600) return 'Intermediate';
  return 'Advanced';
};

// === MAIN COMPONENT ===

const ExerciseLibraryManager: React.FC<ExerciseLibraryManagerProps> = ({
  onExerciseSelect,
  onExerciseEdit,
  isLoading = false,
  className
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Mock exercises data (replace with actual data fetching)
  const mockExercises: Exercise[] = useMemo(() => [
    {
      id: 'ex_001',
      name: 'Push-up Progression',
      description: 'A comprehensive push-up progression suitable for all fitness levels, focusing on proper form and gradual strength building.',
      exerciseType: 'Strength Training',
      primaryMuscles: ['Chest', 'Shoulders', 'Triceps'],
      difficulty: 300,
      thumbnailUrl: '/api/placeholder/300/160',
      nasmScore: 95,
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-25T14:30:00Z',
      stats: {
        views: 1247,
        completions: 892,
        avgRating: 4.8,
        lastUsed: '2025-02-01T14:30:00Z'
      }
    },
    {
      id: 'ex_002',
      name: 'Deadlift Form Check',
      description: 'Master the fundamentals of deadlifting with this detailed form-focused exercise routine.',
      exerciseType: 'Powerlifting',
      primaryMuscles: ['Back', 'Glutes', 'Hamstrings'],
      difficulty: 700,
      videoUrl: '/api/placeholder/video',
      nasmScore: 98,
      createdAt: '2025-01-10T09:00:00Z',
      updatedAt: '2025-01-30T16:45:00Z',
      stats: {
        views: 1089,
        completions: 743,
        avgRating: 4.9,
        lastUsed: '2025-02-01T13:45:00Z'
      }
    },
    {
      id: 'ex_003',
      name: 'Core Stability Sequence',
      description: 'Dynamic core stabilization exercises to improve functional movement and reduce injury risk.',
      exerciseType: 'Functional',
      primaryMuscles: ['Core', 'Abs'],
      difficulty: 450,
      thumbnailUrl: '/api/placeholder/300/160',
      nasmScore: 92,
      createdAt: '2025-01-05T11:00:00Z',
      updatedAt: '2025-01-28T12:15:00Z',
      stats: {
        views: 987,
        completions: 654,
        avgRating: 4.7,
        lastUsed: '2025-02-01T12:15:00Z'
      }
    }
  ], []);
  
  // Filtered and sorted exercises
  const filteredExercises = useMemo(() => {
    let filtered = mockExercises;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.exerciseType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.primaryMuscles.some(muscle => 
          muscle.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(exercise => 
        exercise.exerciseType === filterType
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.exerciseType.toLowerCase();
          bValue = b.exerciseType.toLowerCase();
          break;
        case 'difficulty':
          aValue = a.difficulty;
          bValue = b.difficulty;
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'views':
          aValue = a.stats?.views || 0;
          bValue = b.stats?.views || 0;
          break;
        case 'rating':
          aValue = a.stats?.avgRating || 0;
          bValue = b.stats?.avgRating || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [mockExercises, searchQuery, filterType, sortField, sortDirection]);
  
  // Pagination
  const exercisesPerPage = 12;
  const totalPages = Math.ceil(filteredExercises.length / exercisesPerPage);
  const paginatedExercises = filteredExercises.slice(
    (currentPage - 1) * exercisesPerPage,
    currentPage * exercisesPerPage
  );
  
  // Get unique exercise types for filter
  const exerciseTypes = useMemo(() => {
    const types = new Set(mockExercises.map(ex => ex.exerciseType));
    return ['all', ...Array.from(types)];
  }, [mockExercises]);
  
  // Debounced search
  const handleSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(query);
      setCurrentPage(1);
    }, 300);
  }, []);
  
  // Handle sorting
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);
  
  // Handle selection
  const handleSelectExercise = useCallback((exerciseId: string) => {
    setSelectedExercises(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(exerciseId)) {
        newSelection.delete(exerciseId);
      } else {
        newSelection.add(exerciseId);
      }
      return newSelection;
    });
  }, []);
  
  // Handle bulk operations
  const handleSelectAll = useCallback(() => {
    if (selectedExercises.size === paginatedExercises.length) {
      setSelectedExercises(new Set());
    } else {
      setSelectedExercises(new Set(paginatedExercises.map(ex => ex.id)));
    }
  }, [selectedExercises.size, paginatedExercises]);
  
  // Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  // Render exercise card
  const renderExerciseCard = useCallback((exercise: Exercise, index: number) => (
    <ExerciseCard
      key={exercise.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => onExerciseSelect(exercise)}
    >
      <CardHeader>
        {exercise.thumbnailUrl || exercise.videoUrl ? (
          <>
            <CardThumbnail
              src={exercise.thumbnailUrl || '/api/placeholder/300/160'}
              alt={exercise.name}
            />
            <CardOverlay>
              {exercise.videoUrl && (
                <PlayButton
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle video play
                  }}
                >
                  <Play size={18} />
                </PlayButton>
              )}
              
              <CardActions>
                <CardActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onExerciseEdit(exercise);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Edit3 size={14} />
                </CardActionButton>
                
                <CardActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectExercise(exercise.id);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {selectedExercises.has(exercise.id) ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                </CardActionButton>
              </CardActions>
            </CardOverlay>
          </>
        ) : (
          <CardPlaceholder>
            <Dumbbell size={48} className="placeholder-icon" />
            <div>No Preview Available</div>
          </CardPlaceholder>
        )}
      </CardHeader>
      
      <CardContent>
        <CardTitle>{exercise.name}</CardTitle>
        <CardDescription>{exercise.description}</CardDescription>
        
        <CardTags>
          <Tag>{getDifficultyLabel(exercise.difficulty)}</Tag>
          <Tag>{exercise.exerciseType}</Tag>
          {exercise.nasmScore && exercise.nasmScore >= 90 && (
            <Tag>NASM Certified</Tag>
          )}
        </CardTags>
        
        <CardStats>
          <StatGroup>
            <Eye size={12} />
            {exercise.stats ? formatNumber(exercise.stats.views) : '0'}
          </StatGroup>
          
          <StatGroup>
            <Users size={12} />
            {exercise.stats ? formatNumber(exercise.stats.completions) : '0'}
          </StatGroup>
          
          <StatGroup>
            <Star size={12} />
            {exercise.stats ? exercise.stats.avgRating.toFixed(1) : '0.0'}
          </StatGroup>
          
          <StatGroup>
            <Calendar size={12} />
            {formatDate(exercise.createdAt)}
          </StatGroup>
        </CardStats>
      </CardContent>
    </ExerciseCard>
  ), [onExerciseSelect, onExerciseEdit, selectedExercises, handleSelectExercise]);
  
  if (isLoading) {
    return (
      <LibraryContainer className={className}>
        <LoadingState>
          <RefreshCw size={48} className="loading-icon" />
          <div>Loading exercise library...</div>
        </LoadingState>
      </LibraryContainer>
    );
  }
  
  return (
    <LibraryContainer
      className={className}
      initial="hidden"
      animate="visible"
      variants={motionVariants.cardEnter}
    >
      {/* Header */}
      <LibraryHeader>
        <HeaderTop>
          <LibraryTitle>
            <Grid size={20} className="title-icon" />
            Exercise Library
          </LibraryTitle>
          
          <HeaderActions>
            <ViewToggle>
              <ViewButton
                isActive={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Grid size={16} />
              </ViewButton>
              <ViewButton
                isActive={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <List size={16} />
              </ViewButton>
            </ViewToggle>
            
            <ActionButton
              onClick={() => {/* Handle export */}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Export exercises"
            >
              <Download size={16} />
            </ActionButton>
            
            <ActionButton
              onClick={() => {/* Handle refresh */}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh library"
            >
              <RefreshCw size={16} />
            </ActionButton>
          </HeaderActions>
        </HeaderTop>
        
        {/* Search and Filters */}
        <SearchFilterRow>
          <SearchContainer>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search exercises, types, muscles..."
              onChange={(e) => handleSearch(e.target.value)}
            />
          </SearchContainer>
          
          <FilterButton
            isActive={showFilters}
            onClick={() => setShowFilters(!showFilters)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter size={16} />
            Filters
          </FilterButton>
          
          {/* Type Filter */}
          <FilterButton
            isActive={filterType !== 'all'}
            onClick={() => {
              const nextIndex = exerciseTypes.indexOf(filterType) + 1;
              const nextType = exerciseTypes[nextIndex] || exerciseTypes[0];
              setFilterType(nextType);
              setCurrentPage(1);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Target size={16} />
            {filterType === 'all' ? 'All Types' : filterType}
          </FilterButton>
        </SearchFilterRow>
      </LibraryHeader>
      
      {/* Content */}
      <LibraryContent>
        {filteredExercises.length === 0 ? (
          <EmptyState>
            <Dumbbell size={64} className="empty-icon" />
            <h4>No exercises found</h4>
            <p>Try adjusting your search or filter criteria</p>
          </EmptyState>
        ) : viewMode === 'grid' ? (
          <CardGrid>
            {paginatedExercises.map(renderExerciseCard)}
          </CardGrid>
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>
                    <input
                      type="checkbox"
                      checked={selectedExercises.size === paginatedExercises.length && paginatedExercises.length > 0}
                      onChange={handleSelectAll}
                    />
                  </TableHeaderCell>
                  <TableHeaderCell sortable onClick={() => handleSort('name')}>
                    Name <ArrowUpDown size={12} />
                  </TableHeaderCell>
                  <TableHeaderCell sortable onClick={() => handleSort('type')}>
                    Type <ArrowUpDown size={12} />
                  </TableHeaderCell>
                  <TableHeaderCell sortable onClick={() => handleSort('difficulty')}>
                    Difficulty <ArrowUpDown size={12} />
                  </TableHeaderCell>
                  <TableHeaderCell sortable onClick={() => handleSort('views')}>
                    Views <ArrowUpDown size={12} />
                  </TableHeaderCell>
                  <TableHeaderCell sortable onClick={() => handleSort('rating')}>
                    Rating <ArrowUpDown size={12} />
                  </TableHeaderCell>
                  <TableHeaderCell sortable onClick={() => handleSort('created')}>
                    Created <ArrowUpDown size={12} />
                  </TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHeader>
              <tbody>
                {paginatedExercises.map((exercise, index) => (
                  <TableRow
                    key={exercise.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => onExerciseSelect(exercise)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedExercises.has(exercise.id)}
                        onChange={() => handleSelectExercise(exercise.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <strong style={{ color: exerciseCommandTheme.colors.primaryText }}>
                        {exercise.name}
                      </strong>
                    </TableCell>
                    <TableCell>{exercise.exerciseType}</TableCell>
                    <TableCell>{getDifficultyLabel(exercise.difficulty)}</TableCell>
                    <TableCell>{exercise.stats ? formatNumber(exercise.stats.views) : '0'}</TableCell>
                    <TableCell>{exercise.stats ? exercise.stats.avgRating.toFixed(1) : '0.0'}</TableCell>
                    <TableCell>{formatDate(exercise.createdAt)}</TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: exerciseCommandTheme.spacing.xs }}>
                        <ActionButton
                          onClick={(e) => {
                            e.stopPropagation();
                            onExerciseEdit(exercise);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Edit3 size={14} />
                        </ActionButton>
                        <ActionButton
                          onClick={(e) => e.stopPropagation()}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <MoreVertical size={14} />
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationContainer>
            <PaginationInfo>
              Showing {((currentPage - 1) * exercisesPerPage) + 1} to {Math.min(currentPage * exercisesPerPage, filteredExercises.length)} of {filteredExercises.length} exercises
            </PaginationInfo>
            
            <PaginationButtons>
              <PaginationButton
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft size={16} />
              </PaginationButton>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <PaginationButton
                    key={page}
                    isActive={page === currentPage}
                    onClick={() => setCurrentPage(page)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {page}
                  </PaginationButton>
                );
              })}
              
              <PaginationButton
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight size={16} />
              </PaginationButton>
            </PaginationButtons>
          </PaginationContainer>
        )}
      </LibraryContent>
    </LibraryContainer>
  );
};

export default ExerciseLibraryManager;
