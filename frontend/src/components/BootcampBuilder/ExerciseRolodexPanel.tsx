/**
 * ┌─── SUB-COMPONENT: ExerciseRolodexPanel ───────────────────┐
 * │ PARENT: BootcampBuilderPage                                │
 * │ PURPOSE: Full exercise rolodex with all filter rows        │
 * │          Compact grid layout for better density             │
 * │ Props: { onAddExercise, onSelectExercise, selectedId }     │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { List } from 'react-window';
import styled from 'styled-components';
import { Search, Plus, X, Dumbbell } from 'lucide-react';
import { useExerciseSearch, type ExerciseSlim } from '../WorkoutLogger/useExerciseSearch';
import { CLASS_FORMATS } from './BootcampBuilderConstants';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface RolodexExercise extends ExerciseSlim {}

interface ExerciseRolodexPanelProps {
  onAddExercise: (exercise: RolodexExercise, stationIndex?: number) => void;
  onSelectExercise?: (exercise: RolodexExercise) => void;
  selectedId?: number | null;
  targetStation?: number;
  /** Show compact format/station info at top (Manual mode) */
  formatLabel?: string;
  stationInfo?: string;
  /** Format selector for Manual mode */
  classFormat?: string;
  onFormatChange?: (format: string) => void;
  showFormatSelector?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Filter Constants (match Workout Planner exactly)
// ─────────────────────────────────────────────────────────────
const BODY_PARTS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body', 'Cardio', 'Recovery'];
const EXERCISE_TYPES = ['All Types', 'Compound', 'Isolation', 'Calisthenics', 'Stability', 'Flexibility', 'Core'];
const EQUIPMENT_FILTERS = ['All Equipment', 'Bodyweight', 'Dumbbell', 'Barbell', 'Machine', 'Cable', 'Resistance Band', 'Kettlebell', 'Sliders', 'Stability Ball', 'Medicine Ball', 'BOSU', 'TRX'];
const SOURCE_FILTERS = ['All Programs', 'NASM', 'SwanStudios'] as const;
const IMPACT_LEVELS = ['All Impact', 'Low Impact', 'Medium Impact', 'High Impact'] as const;

function getJointImpact(ex: { exerciseType: string; difficulty: number }): string {
  const lowTypes = ['flexibility', 'stability', 'balance'];
  const highTypes = ['calisthenics', 'compound'];
  if (lowTypes.includes(ex.exerciseType) || ex.difficulty <= 200) return 'Low Impact';
  if (highTypes.includes(ex.exerciseType) && ex.difficulty >= 500) return 'High Impact';
  return 'Medium Impact';
}

function parseEquipment(eq: unknown): string[] {
  if (!eq) return [];
  if (Array.isArray(eq)) return eq.filter(Boolean);
  if (typeof eq === 'string') {
    if (eq === '[]' || eq === '') return [];
    try { const p = JSON.parse(eq); if (Array.isArray(p)) return p.filter(Boolean); } catch { return [eq]; }
  }
  return [];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const PanelWrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-surface, #1A1A24);
  border-right: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ResultCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  margin: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-base, #0A0A0F);
  flex-shrink: 0;

  input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.3)); }
  }
`;

const FilterToggle = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  margin: 2px 12px 4px;
  border-radius: 6px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: ${({ $open }) => $open ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)' : 'transparent'};
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  &:hover { color: var(--text-primary, #E0ECF4); }
`;

const FilterSection = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'block' : 'none'};
  flex-shrink: 0;
  max-height: ${({ $open }) => $open ? '180px' : '0'};
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const ChipRow = styled.div`
  display: flex;
  gap: 3px;
  padding: 2px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
  flex-wrap: wrap;
  &::-webkit-scrollbar { display: none; }
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' : 'transparent'};
  color: ${({ $active }) => $active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.5)'};
  font-family: 'Sora', sans-serif;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  min-height: 22px;
  flex-shrink: 0;
  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const ExerciseGrid = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
`;

const ExerciseCard = styled.div<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.06))'};
  background: ${({ $selected }) =>
    $selected ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)' : 'var(--bg-base, #0A0A0F)'};
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
`;

const ExName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const AddBtn = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: var(--accent-secondary, #8B5CF6);
    color: white;
  }
`;

const CardMeta = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-top: 3px;
`;

const MetaTag = styled.span<{ $impact?: string }>`
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'Fira Code', monospace;
  font-size: 8px;
  font-weight: 600;
  background: rgba(96, 192, 240, 0.08);
  color: rgba(224, 236, 244, 0.45);
  ${({ $impact }) => {
    if ($impact === 'High Impact') return 'background: rgba(201,42,84,0.12); color: #C92A54;';
    if ($impact === 'Low Impact') return 'background: rgba(16,185,129,0.12); color: #10B981;';
    if ($impact === 'Medium Impact') return 'background: rgba(198,168,75,0.12); color: #C6A84B;';
    return '';
  }}
`;

const EmptyMsg = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  grid-column: 1 / -1;
`;

const SkeletonBlock = styled.div`
  height: 52px;
  border-radius: 6px;
  background: rgba(96, 192, 240, 0.04);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const FormatInfoBar = styled.div`
  padding: 6px 12px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--accent-secondary, #8B5CF6);
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FormatSelect = styled.select`
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  cursor: pointer;
  option { background: #0A0A0F; color: #E0ECF4; }
`;

const ExerciseRolodexPanel: React.FC<ExerciseRolodexPanelProps> = ({
  onAddExercise, onSelectExercise, selectedId, targetStation,
  formatLabel, stationInfo, classFormat, onFormatChange, showFormatSelector,
}) => {
  const {
    results: exerciseResults,
    isLoading,
    setQuery,
    setCategory,
    query: searchQuery,
    category: filterCategory,
  } = useExerciseSearch();

  // Advanced filters
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [sourceFilter, exerciseTypeFilter, equipmentFilter, impactFilter].filter(Boolean).length;

  const filteredExercises = useMemo(() => {
    let pool = exerciseResults;
    if (exerciseTypeFilter) {
      pool = pool.filter(ex => (ex.exerciseType || '').toLowerCase() === exerciseTypeFilter);
    }
    if (equipmentFilter) {
      const norm = equipmentFilter.toLowerCase();
      pool = pool.filter(ex => {
        const eqArr = parseEquipment((ex as any).equipment || (ex as any).equipmentNeeded);
        if (norm === 'bodyweight') return eqArr.length === 0 || eqArr.some(e => e.toLowerCase().includes('body'));
        return eqArr.some(e => e.toLowerCase().includes(norm));
      });
    }
    if (sourceFilter) {
      pool = pool.filter(ex => (ex as any).source?.toLowerCase().includes(sourceFilter));
    }
    if (impactFilter) {
      pool = pool.filter(ex => getJointImpact(ex) === impactFilter);
    }
    return pool;
  }, [exerciseResults, exerciseTypeFilter, equipmentFilter, sourceFilter, impactFilter]);

  const handleChipClick = useCallback((bp: string) => {
    setCategory(bp === 'All' ? null : bp);
  }, [setCategory]);

  const handleCardClick = useCallback((ex: ExerciseSlim) => {
    if (onSelectExercise) onSelectExercise(ex as RolodexExercise);
  }, [onSelectExercise]);

  const handleAddClick = useCallback((e: React.MouseEvent, ex: ExerciseSlim) => {
    e.stopPropagation();
    onAddExercise(ex as RolodexExercise, targetStation);
  }, [onAddExercise, targetStation]);

  // Group into pairs for 2-column virtualized rows
  const exercisePairs = useMemo(() => {
    const pairs: ExerciseSlim[][] = [];
    for (let i = 0; i < filteredExercises.length; i += 2) {
      pairs.push(filteredExercises.slice(i, i + 2));
    }
    return pairs;
  }, [filteredExercises]);

  // Row renderer for react-window v2 List (2 cards per row)
  const PairedRowRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const pair = exercisePairs[index];
    if (!pair) return null;
    return (
      <div style={{ ...style, display: 'flex', gap: 4, padding: '2px 0' }}>
        {pair.map(ex => {
          const impact = getJointImpact(ex);
          const eqArr = parseEquipment((ex as any).equipment || (ex as any).equipmentNeeded);
          const eqLabel = eqArr.length > 0 ? eqArr[0] : 'Bodyweight';
          return (
            <ExerciseCard
              key={ex.id}
              $selected={selectedId === ex.id}
              onClick={() => handleCardClick(ex)}
              style={{ flex: 1 }}
            >
              <CardTop>
                <ExName>{ex.name}</ExName>
                <AddBtn
                  onClick={(e) => handleAddClick(e, ex)}
                  title="Add to class"
                  aria-label={`Add ${ex.name} to class`}
                >
                  <Plus size={12} />
                </AddBtn>
              </CardTop>
              <CardMeta>
                <MetaTag>{ex.bodyPartCategory}</MetaTag>
                <MetaTag>{eqLabel}</MetaTag>
                <MetaTag $impact={impact}>{impact.replace(' Impact', '')}</MetaTag>
              </CardMeta>
            </ExerciseCard>
          );
        })}
      </div>
    );
  }, [exercisePairs, selectedId, handleCardClick, handleAddClick]);

  return (
    <PanelWrap>
      <PanelHeader>
        <PanelTitle><Dumbbell size={14} /> Exercise Rolodex</PanelTitle>
        <ResultCount>{filteredExercises.length} results</ResultCount>
      </PanelHeader>

      {/* Format selector + station info (Manual mode) */}
      {showFormatSelector && onFormatChange ? (
        <FormatInfoBar>
          <FormatSelect
            value={classFormat || '2x8_r3'}
            onChange={e => onFormatChange(e.target.value)}
          >
            {CLASS_FORMATS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </FormatSelect>
        </FormatInfoBar>
      ) : (formatLabel || stationInfo) ? (
        <FormatInfoBar>
          <span>{formatLabel}</span>
          {stationInfo && <span>{stationInfo}</span>}
        </FormatInfoBar>
      ) : null}

      <SearchBox>
        <Search size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
        <input
          value={searchQuery}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search exercises..."
          aria-label="Search exercises"
        />
        {searchQuery && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}>
            <X size={12} />
          </button>
        )}
      </SearchBox>

      {/* Body Part filter — always visible */}
      <ChipRow>
        {BODY_PARTS.map(bp => (
          <Chip key={bp} $active={filterCategory === null ? bp === 'All' : filterCategory === bp} onClick={() => handleChipClick(bp)}>
            {bp}
          </Chip>
        ))}
      </ChipRow>

      {/* Advanced filters — collapsible to save space */}
      <FilterToggle $open={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
        {filtersOpen ? '▾ Hide Filters' : '▸ More Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}
      </FilterToggle>

      <FilterSection $open={filtersOpen}>
        <ChipRow>
          {SOURCE_FILTERS.map(sf => (
            <Chip key={sf} $active={sourceFilter === null ? sf === 'All Programs' : sourceFilter === sf.toLowerCase()} onClick={() => setSourceFilter(sf === 'All Programs' ? null : sf.toLowerCase())}>
              {sf}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {EXERCISE_TYPES.map(et => (
            <Chip key={et} $active={exerciseTypeFilter === null ? et === 'All Types' : exerciseTypeFilter === et.toLowerCase()} onClick={() => setExerciseTypeFilter(et === 'All Types' ? null : et.toLowerCase())}>
              {et}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {EQUIPMENT_FILTERS.map(eq => (
            <Chip key={eq} $active={equipmentFilter === null ? eq === 'All Equipment' : equipmentFilter === eq.toLowerCase()} onClick={() => setEquipmentFilter(eq === 'All Equipment' ? null : eq.toLowerCase())}>
              {eq}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {IMPACT_LEVELS.map(il => (
            <Chip key={il} $active={impactFilter === null ? il === 'All Impact' : impactFilter === il} onClick={() => setImpactFilter(il === 'All Impact' ? null : il)}>
              {il}
            </Chip>
          ))}
        </ChipRow>
      </FilterSection>

      {/* Exercise Rolodex — windowed 2-column layout (react-window v2 List) */}
      <ExerciseGrid>
        {isLoading ? (
          Array.from({ length: 8 }, (_, i) => <SkeletonBlock key={i} />)
        ) : filteredExercises.length === 0 ? (
          <EmptyMsg>No exercises match your filters.</EmptyMsg>
        ) : (
          <List
            rowComponent={PairedRowRenderer}
            rowCount={exercisePairs.length}
            rowHeight={60}
            rowProps={{}}
            style={{ height: Math.min(exercisePairs.length, 7) * 60, overflowX: 'hidden' }}
          />
        )}
      </ExerciseGrid>
    </PanelWrap>
  );
};

export default memo(ExerciseRolodexPanel);
