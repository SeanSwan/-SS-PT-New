import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Dumbbell, Search, X } from 'lucide-react';
import { useExerciseSearch, type ExerciseSlim } from '../WorkoutLogger/useExerciseSearch';
import { useEquipmentAPI } from '../../hooks/useEquipmentAPI';
import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker';
import {
  buildEquipmentProfileTokens,
  filterExercisesByEquipmentProfile,
} from './BootcampEquipmentProfileFilter';
import {
  BOOTCAMP_EXERCISES_PER_STATION_OPTIONS,
  BOOTCAMP_STATION_COUNT_OPTIONS,
} from './BootcampBuilderConstants';
import ExerciseRolodexList from './ExerciseRolodexList';
import {
  BODY_PARTS,
  EQUIPMENT_FILTERS,
  EXERCISE_TYPES,
  getJointImpact,
  IMPACT_LEVELS,
  parseEquipment,
  SOURCE_FILTERS,
} from './ExerciseRolodexPanel.constants';
import {
  Chip,
  ChipRow,
  ClearSearchButton,
  EquipmentPickerWrap,
  FilterSection,
  FilterToggle,
  FormatInfoBar,
  FormatSelect,
  IconSlot,
  PanelHeader,
  PanelTitle,
  PanelWrap,
  ResultCount,
  SearchBox,
  StructureSelectGrid,
} from './ExerciseRolodexPanel.styles';

export interface RolodexExercise extends ExerciseSlim {}

interface ExerciseRolodexPanelProps {
  onAddExercise: (exercise: RolodexExercise, stationIndex?: number) => void;
  onSelectExercise?: (exercise: RolodexExercise) => void;
  selectedId?: string | number | null;
  targetStation?: number;
  formatLabel?: string;
  stationInfo?: string;
  stationCount?: number;
  exercisesPerStation?: number;
  onStationCountChange?: (count: number) => void;
  onExercisesPerStationChange?: (count: number) => void;
  showFormatSelector?: boolean;
  equipmentProfileId?: number | null;
  onEquipmentProfileChange?: (profileId: number | null) => void;
}

const ExerciseRolodexPanel: React.FC<ExerciseRolodexPanelProps> = ({
  onAddExercise,
  onSelectExercise,
  selectedId,
  targetStation,
  formatLabel,
  stationInfo,
  stationCount,
  exercisesPerStation,
  onStationCountChange,
  onExercisesPerStationChange,
  showFormatSelector,
  equipmentProfileId,
  onEquipmentProfileChange,
}) => {
  const { getProfile } = useEquipmentAPI();
  const {
    results: exerciseResults,
    isLoading,
    setQuery,
    setCategory,
    query: searchQuery,
    category: filterCategory,
  } = useExerciseSearch();
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profileEquipmentTokens, setProfileEquipmentTokens] = useState<string[]>([]);
  const [profileEquipmentLoading, setProfileEquipmentLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!equipmentProfileId) {
      setProfileEquipmentTokens([]);
      setProfileEquipmentLoading(false);
      return () => { cancelled = true; };
    }

    setProfileEquipmentLoading(true);
    getProfile(equipmentProfileId)
      .then((data) => {
        if (!cancelled) setProfileEquipmentTokens(buildEquipmentProfileTokens(data.items || []));
      })
      .catch(() => {
        if (!cancelled) setProfileEquipmentTokens([]);
      })
      .finally(() => {
        if (!cancelled) setProfileEquipmentLoading(false);
      });

    return () => { cancelled = true; };
  }, [equipmentProfileId, getProfile]);

  const activeFilterCount = [
    sourceFilter,
    exerciseTypeFilter,
    equipmentFilter,
    impactFilter,
    equipmentProfileId ? 'equipmentProfile' : null,
  ].filter(Boolean).length;

  const filteredExercises = useMemo(() => {
    let pool = exerciseResults;
    if (equipmentProfileId && !profileEquipmentLoading) {
      pool = filterExercisesByEquipmentProfile(pool, profileEquipmentTokens);
    }
    if (exerciseTypeFilter) {
      pool = pool.filter((exercise) => (exercise.exerciseType || '').toLowerCase() === exerciseTypeFilter);
    }
    if (equipmentFilter) {
      const norm = equipmentFilter.toLowerCase();
      pool = pool.filter((exercise) => {
        const equipment = parseEquipment((exercise as any).equipment || (exercise as any).equipmentNeeded);
        if (norm === 'bodyweight') return equipment.length === 0 || equipment.some((item) => item.toLowerCase().includes('body'));
        return equipment.some((item) => item.toLowerCase().includes(norm));
      });
    }
    if (sourceFilter) {
      pool = pool.filter((exercise) => (exercise as any).source?.toLowerCase().includes(sourceFilter));
    }
    if (impactFilter) {
      pool = pool.filter((exercise) => getJointImpact(exercise) === impactFilter);
    }
    return pool;
  }, [exerciseResults, equipmentProfileId, profileEquipmentLoading, profileEquipmentTokens, exerciseTypeFilter, equipmentFilter, sourceFilter, impactFilter]);

  const handleAddExercise = useCallback((exercise: ExerciseSlim, event: MouseEvent) => {
    event.stopPropagation();
    onAddExercise(exercise as RolodexExercise, targetStation);
  }, [onAddExercise, targetStation]);

  const handleSelectExercise = useCallback((exercise: ExerciseSlim) => {
    onSelectExercise?.(exercise as RolodexExercise);
  }, [onSelectExercise]);

  return (
    <PanelWrap>
      <PanelHeader>
        <PanelTitle><Dumbbell size={14} /> Exercise Rolodex</PanelTitle>
        <ResultCount>{filteredExercises.length} results</ResultCount>
      </PanelHeader>

      {showFormatSelector && onStationCountChange && onExercisesPerStationChange ? (
        <FormatInfoBar>
          <StructureSelectGrid>
            <FormatSelect
              aria-label="Station Count"
              value={stationCount ?? BOOTCAMP_STATION_COUNT_OPTIONS[3]}
              onChange={(event) => onStationCountChange(Number(event.target.value))}
            >
              {BOOTCAMP_STATION_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>{count} stations</option>
              ))}
            </FormatSelect>
            <FormatSelect
              aria-label="Exercises Per Station"
              value={exercisesPerStation ?? BOOTCAMP_EXERCISES_PER_STATION_OPTIONS[3]}
              onChange={(event) => onExercisesPerStationChange(Number(event.target.value))}
            >
              {BOOTCAMP_EXERCISES_PER_STATION_OPTIONS.map((count) => (
                <option key={count} value={count}>{count} exercises</option>
              ))}
            </FormatSelect>
          </StructureSelectGrid>
          {stationInfo && <span>{stationInfo}</span>}
        </FormatInfoBar>
      ) : (formatLabel || stationInfo) ? (
        <FormatInfoBar>
          <span>{formatLabel}</span>
          {stationInfo && <span>{stationInfo}</span>}
        </FormatInfoBar>
      ) : null}

      {onEquipmentProfileChange && (
        <EquipmentPickerWrap>
          <EquipmentProfilePicker
            selectedProfileId={equipmentProfileId ?? null}
            onSelect={onEquipmentProfileChange}
            showManageLink={false}
            compact
            label="Equipment Profile"
          />
        </EquipmentPickerWrap>
      )}

      <SearchBox>
        <IconSlot><Search size={14} /></IconSlot>
        <input
          value={searchQuery}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises..."
          aria-label="Search exercises"
        />
        {searchQuery && (
          <ClearSearchButton onClick={() => setQuery('')} aria-label="Clear exercise search" type="button">
            <X size={12} />
          </ClearSearchButton>
        )}
      </SearchBox>

      <ChipRow>
        {BODY_PARTS.map((bodyPart) => (
          <Chip
            key={bodyPart}
            $active={filterCategory === null ? bodyPart === 'All' : filterCategory === bodyPart}
            onClick={() => setCategory(bodyPart === 'All' ? null : bodyPart)}
            type="button"
          >
            {bodyPart}
          </Chip>
        ))}
      </ChipRow>

      <FilterToggle $open={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)} type="button">
        {filtersOpen ? 'Hide Filters' : 'More Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}
      </FilterToggle>

      <FilterSection $open={filtersOpen}>
        <ChipRow>
          {SOURCE_FILTERS.map((source) => (
            <Chip key={source} $active={sourceFilter === null ? source === 'All Programs' : sourceFilter === source.toLowerCase()} onClick={() => setSourceFilter(source === 'All Programs' ? null : source.toLowerCase())} type="button">
              {source}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {EXERCISE_TYPES.map((type) => (
            <Chip key={type} $active={exerciseTypeFilter === null ? type === 'All Types' : exerciseTypeFilter === type.toLowerCase()} onClick={() => setExerciseTypeFilter(type === 'All Types' ? null : type.toLowerCase())} type="button">
              {type}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {EQUIPMENT_FILTERS.map((equipment) => (
            <Chip key={equipment} $active={equipmentFilter === null ? equipment === 'All Equipment' : equipmentFilter === equipment.toLowerCase()} onClick={() => setEquipmentFilter(equipment === 'All Equipment' ? null : equipment.toLowerCase())} type="button">
              {equipment}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {IMPACT_LEVELS.map((impact) => (
            <Chip key={impact} $active={impactFilter === null ? impact === 'All Impact' : impactFilter === impact} onClick={() => setImpactFilter(impact === 'All Impact' ? null : impact)} type="button">
              {impact}
            </Chip>
          ))}
        </ChipRow>
      </FilterSection>

      <ExerciseRolodexList
        exercises={filteredExercises}
        isLoading={isLoading}
        selectedId={selectedId}
        onAddExercise={handleAddExercise}
        onSelectExercise={handleSelectExercise}
      />
    </PanelWrap>
  );
};

export default memo(ExerciseRolodexPanel);
