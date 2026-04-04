/**
 * ┌─── SUB-COMPONENT: ExerciseRolodexPanel ───────────────────┐
 * │ PARENT: BootcampBuilderPage                                │
 * │ PURPOSE: Full exercise rolodex with all filter rows        │
 * │          matching the Workout Planner's rolodex sidebar    │
 * │ Props: { onAddExercise }                                   │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import styled from 'styled-components';
import { Search, Plus, X, Dumbbell } from 'lucide-react';
import { useExerciseSearch, type ExerciseSlim } from '../WorkoutLogger/useExerciseSearch';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface RolodexExercise extends ExerciseSlim {}

interface ExerciseRolodexPanelProps {
  onAddExercise: (exercise: RolodexExercise, stationIndex?: number) => void;
  targetStation?: number;
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

const ChipRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 3px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
  flex-wrap: wrap;
  &::-webkit-scrollbar { display: none; }
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' : 'transparent'};
  color: ${({ $active }) => $active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.5)'};
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  min-height: 24px;
  flex-shrink: 0;
  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const ExerciseList = styled.div`
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(96, 192, 240, 0.1); border-radius: 2px; }
`;

const ExerciseItem = styled.button`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid rgba(96, 192, 240, 0.04);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
  min-height: 48px;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent); }
`;

const ExName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
`;

const ExMeta = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 3px;
`;

const MetaTag = styled.span<{ $impact?: string }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  font-weight: 600;
  background: rgba(96, 192, 240, 0.08);
  color: rgba(224, 236, 244, 0.5);
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
`;

const SkeletonBlock = styled.div`
  height: 48px;
  margin: 4px 12px;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.04);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ExerciseRolodexPanel: React.FC<ExerciseRolodexPanelProps> = ({ onAddExercise, targetStation }) => {
  // Use the same hook as the Workout Planner
  const {
    results: exerciseResults,
    isLoading,
    setQuery,
    setCategory,
    query: searchQuery,
    category: filterCategory,
  } = useExerciseSearch();

  // Advanced filters (same as Workout Planner)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);

  // Apply advanced filters on top of search results
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

  return (
    <PanelWrap>
      <PanelHeader>
        <PanelTitle><Dumbbell size={14} /> Exercise Rolodex</PanelTitle>
        <ResultCount>{filteredExercises.length} results</ResultCount>
      </PanelHeader>

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

      {/* Body Part filter */}
      <ChipRow>
        {BODY_PARTS.map(bp => (
          <Chip key={bp} $active={filterCategory === null ? bp === 'All' : filterCategory === bp} onClick={() => handleChipClick(bp)}>
            {bp}
          </Chip>
        ))}
      </ChipRow>

      {/* Source filter */}
      <ChipRow>
        {SOURCE_FILTERS.map(sf => (
          <Chip key={sf} $active={sourceFilter === null ? sf === 'All Programs' : sourceFilter === sf.toLowerCase()} onClick={() => setSourceFilter(sf === 'All Programs' ? null : sf.toLowerCase())}>
            {sf}
          </Chip>
        ))}
      </ChipRow>

      {/* Exercise Type filter */}
      <ChipRow>
        {EXERCISE_TYPES.map(et => (
          <Chip key={et} $active={exerciseTypeFilter === null ? et === 'All Types' : exerciseTypeFilter === et.toLowerCase()} onClick={() => setExerciseTypeFilter(et === 'All Types' ? null : et.toLowerCase())}>
            {et}
          </Chip>
        ))}
      </ChipRow>

      {/* Equipment filter */}
      <ChipRow>
        {EQUIPMENT_FILTERS.map(eq => (
          <Chip key={eq} $active={equipmentFilter === null ? eq === 'All Equipment' : equipmentFilter === eq.toLowerCase()} onClick={() => setEquipmentFilter(eq === 'All Equipment' ? null : eq.toLowerCase())}>
            {eq}
          </Chip>
        ))}
      </ChipRow>

      {/* Impact Level filter */}
      <ChipRow>
        {IMPACT_LEVELS.map(il => (
          <Chip key={il} $active={impactFilter === null ? il === 'All Impact' : impactFilter === il} onClick={() => setImpactFilter(il === 'All Impact' ? null : il)}>
            {il}
          </Chip>
        ))}
      </ChipRow>

      {/* Exercise List */}
      <ExerciseList>
        {isLoading ? (
          Array.from({ length: 8 }, (_, i) => <SkeletonBlock key={i} />)
        ) : filteredExercises.length === 0 ? (
          <EmptyMsg>No exercises match your filters.</EmptyMsg>
        ) : (
          filteredExercises.slice(0, 200).map(ex => (
            <ExerciseItem
              key={ex.id}
              onClick={() => onAddExercise(ex as any, targetStation)}
            >
              <ExName>{ex.name}</ExName>
              <ExMeta>
                <MetaTag>{ex.bodyPartCategory}</MetaTag>
                <MetaTag>{ex.exerciseType}</MetaTag>
                <MetaTag>{(() => { const eqArr = parseEquipment((ex as any).equipment || (ex as any).equipmentNeeded); return eqArr.length > 0 ? eqArr.slice(0, 2).join(', ') : 'Bodyweight'; })()}</MetaTag>
                <MetaTag $impact={getJointImpact(ex)}>{getJointImpact(ex)}</MetaTag>
              </ExMeta>
            </ExerciseItem>
          ))
        )}
      </ExerciseList>
    </PanelWrap>
  );
};

export default memo(ExerciseRolodexPanel);
