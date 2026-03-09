/**
 * ExercisePickerPanel — Rich Exercise Search & Selection
 * =======================================================
 * Autocomplete-powered exercise picker that filters by
 * equipment profile, muscle group, and difficulty.
 *
 * Galaxy-Swan theme: Midnight Sapphire, Swan Cyan, 44px touch targets.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Dumbbell, Search, Zap, Filter, X } from 'lucide-react';
import { ApiService } from '../../services/api.service';

// ── Types ─────────────────────────────────────────────────────────────

export interface ExerciseResult {
  id: string | number;
  name: string;
  exerciseType: string;
  difficulty: number;
  muscleGroups: string[];
  description?: string;
  equipmentRequired?: string;
  experiencePointsEarned?: number;
}

export interface ExercisePickerPanelProps {
  onSelect: (exercise: ExerciseResult) => void;
  equipmentProfileId?: number | null;
  muscleGroupFilter?: string;
  difficultyFilter?: string;
  placeholder?: string;
  label?: string;
}

// ── Component ─────────────────────────────────────────────────────────

const ExercisePickerPanel: React.FC<ExercisePickerPanelProps> = ({
  onSelect,
  equipmentProfileId,
  muscleGroupFilter,
  difficultyFilter,
  placeholder = 'Search exercises by name, type, or muscle group...',
  label = 'Exercise Library',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState(muscleGroupFilter || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficultyFilter || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchExercises = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2 && !selectedMuscle && !selectedDifficulty) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const api = new ApiService();
        const params = new URLSearchParams();
        if (searchQuery.length >= 2) params.set('q', searchQuery);
        if (selectedMuscle) params.set('muscleGroup', selectedMuscle);
        if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
        if (equipmentProfileId) params.set('equipmentProfileId', String(equipmentProfileId));
        params.set('limit', '15');

        const response = await api.get(`/api/exercises/search?${params.toString()}`);
        if (response.success && response.exercises) {
          setResults(response.exercises);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [equipmentProfileId, selectedMuscle, selectedDifficulty],
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchExercises(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchExercises]);

  const handleSelect = (exercise: ExerciseResult) => {
    onSelect(exercise);
    setQuery('');
    setShowResults(false);
  };

  const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Core', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves',
    'Full Body', 'Cardio',
  ];

  const DIFFICULTIES = [
    { value: '1', label: 'Beginner' },
    { value: '2', label: 'Easy' },
    { value: '3', label: 'Intermediate' },
    { value: '4', label: 'Advanced' },
    { value: '5', label: 'Expert' },
  ];

  const getDifficultyColor = (diff: number) => {
    if (diff <= 1) return '#4caf50';
    if (diff <= 2) return '#8bc34a';
    if (diff <= 3) return '#60c0f0';
    if (diff <= 4) return '#ff9800';
    return '#ff4757';
  };

  return (
    <Wrapper ref={wrapperRef}>
      <LabelRow>
        <LabelText>{label}</LabelText>
        <FilterToggle onClick={() => setShowFilters(!showFilters)} type="button">
          <Filter size={14} />
          Filters
        </FilterToggle>
      </LabelRow>

      {showFilters && (
        <FiltersRow>
          <FilterSelect
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
          >
            <option value="">All Muscles</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            <option value="">All Difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </FilterSelect>
          {(selectedMuscle || selectedDifficulty) && (
            <ClearFilters
              onClick={() => {
                setSelectedMuscle('');
                setSelectedDifficulty('');
              }}
              type="button"
            >
              <X size={14} /> Clear
            </ClearFilters>
          )}
        </FiltersRow>
      )}

      <SearchWrapper>
        <SearchIcon>
          <Search size={16} />
        </SearchIcon>
        <SearchInput
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
        />
      </SearchWrapper>

      {showResults && (
        <ResultsDropdown>
          {loading ? (
            <EmptyMsg>Searching...</EmptyMsg>
          ) : results.length > 0 ? (
            results.map((exercise) => (
              <ResultItem
                key={exercise.id}
                onClick={() => handleSelect(exercise)}
              >
                <ResultIcon>
                  <Dumbbell size={14} />
                </ResultIcon>
                <ResultInfo>
                  <ResultName>{exercise.name}</ResultName>
                  <ResultMeta>
                    {exercise.exerciseType}
                    {exercise.muscleGroups?.length > 0 &&
                      ` · ${exercise.muscleGroups.join(', ')}`}
                  </ResultMeta>
                </ResultInfo>
                <ResultBadges>
                  <DiffBadge $color={getDifficultyColor(exercise.difficulty)}>
                    Lv{exercise.difficulty}
                  </DiffBadge>
                  {exercise.experiencePointsEarned && (
                    <XpBadge>
                      <Zap size={10} /> {exercise.experiencePointsEarned}XP
                    </XpBadge>
                  )}
                </ResultBadges>
              </ResultItem>
            ))
          ) : (
            <EmptyMsg>
              {query.length >= 2
                ? 'No exercises found. Try a different search.'
                : 'Type at least 2 characters to search...'}
            </EmptyMsg>
          )}
        </ResultsDropdown>
      )}
    </Wrapper>
  );
};

export default ExercisePickerPanel;

// ── Styled Components ─────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const LabelText = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
`;

const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 6px;
  background: transparent;
  color: #60c0f0;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: rgba(96, 192, 240, 0.08);
  }
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 8px 10px;
  min-height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(0, 32, 96, 0.4);
  color: #f0f0ff;
  font-size: 12px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: rgba(96, 192, 240, 0.4);
  }

  option {
    background: #001040;
    color: #f0f0ff;
  }
`;

const ClearFilters = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 6px;
  background: transparent;
  color: #ff6b6b;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 71, 87, 0.08);
  }
`;

const SearchWrapper = styled.div`
  position: relative;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 38px;
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.4);
  color: #f0f0ff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: rgba(96, 192, 240, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const ResultsDropdown = styled.div`
  position: absolute;
  top: calc(100%);
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(0, 20, 60, 0.98);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 10px;
  padding: 4px;
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  margin-top: 4px;
`;

const ResultItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  min-height: 48px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: rgba(96, 192, 240, 0.08);
  }
`;

const ResultIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.1);
  color: #60c0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ResultInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResultName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #f0f0ff;
`;

const ResultMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
  text-transform: capitalize;
`;

const ResultBadges = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const DiffBadge = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${(p) => `${p.$color}18`};
  color: ${(p) => p.$color};
`;

const XpBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 183, 77, 0.12);
  color: #ffb74d;
`;

const EmptyMsg = styled.div`
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
`;
