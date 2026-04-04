/**
 * ┌─── SUB-COMPONENT: ExerciseRolodexPanel ───────────────────┐
 * │ PARENT: BootcampBuilderPage                                │
 * │ PURPOSE: Searchable exercise browser with virtualized list │
 * │          for manual exercise selection in bootcamp builder  │
 * │ Props: { onAddExercise, availableEquipment }               │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import styled from 'styled-components';
import { Search, Plus, Filter, X, Dumbbell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { List as VirtualList } from 'react-window';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface RolodexExercise {
  id: string | number;
  name: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipmentNeeded?: string[];
  difficulty?: number;
  bodyPartCategory?: string;
  easyVariation?: string;
  hardVariation?: string;
}

interface ExerciseRolodexPanelProps {
  onAddExercise: (exercise: RolodexExercise, stationIndex?: number) => void;
  targetStation?: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Filter Chips
// ─────────────────────────────────────────────────────────────
const BODY_PARTS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body', 'Cardio', 'Recovery'];

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

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
    max-height: 50vh;
  }
`;

const PanelHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  flex-shrink: 0;
`;

const PanelTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-base, #0A0A0F);

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
  overflow-x: auto;
  padding: 8px 12px 4px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  flex-shrink: 0;
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.1))'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  min-height: 28px;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const ExerciseCount = styled.div`
  padding: 4px 12px;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  flex-shrink: 0;
`;

const ListContainer = styled.div`
  flex: 1;
  overflow: hidden;
`;

const ExerciseRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid rgba(96, 192, 240, 0.04);

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent); }
`;

const ExInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ExName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin-top: 1px;
`;

const DiffBadge = styled.span<{ $level: 'easy' | 'med' | 'hard' }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  ${({ $level }) => {
    if ($level === 'easy') return 'background: rgba(16,185,129,0.15); color: #10B981;';
    if ($level === 'hard') return 'background: rgba(201,42,84,0.15); color: #C92A54;';
    return 'background: rgba(198,168,75,0.15); color: #C6A84B;';
  }}
`;

const AddBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    transform: scale(1.1);
  }
`;

const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ExerciseRolodexPanel: React.FC<ExerciseRolodexPanelProps> = ({ onAddExercise, targetStation }) => {
  const { authAxios } = useAuth() as any;
  const [exercises, setExercises] = useState<RolodexExercise[]>([]);
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState('All');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  // Fetch exercises from API
  useEffect(() => {
    if (!authAxios) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await authAxios.get('/api/bootcamp/exercises', {
          params: {
            limit: 200,
            bodyPart: bodyPart !== 'All' ? bodyPart.toLowerCase().replace(' ', '_') : undefined,
          },
        });
        const rawData = res.data?.exercises || res.data?.data || res.data || [];
        const mapped = (Array.isArray(rawData) ? rawData : []).map((ex: any) => ({
          id: ex.id,
          name: ex.name || ex.exerciseName || 'Unknown',
          primaryMuscles: typeof ex.primaryMuscles === 'string' ? JSON.parse(ex.primaryMuscles || '[]') : (ex.primaryMuscles || []),
          secondaryMuscles: typeof ex.secondaryMuscles === 'string' ? JSON.parse(ex.secondaryMuscles || '[]') : (ex.secondaryMuscles || []),
          equipmentNeeded: typeof ex.equipmentNeeded === 'string' ? JSON.parse(ex.equipmentNeeded || '[]') : (ex.equipmentNeeded || []),
          difficulty: ex.difficulty || 500,
          bodyPartCategory: ex.bodyPartCategory || '',
          easyVariation: ex.easyVariation || ex.easy || null,
          hardVariation: ex.hardVariation || ex.hard || null,
        }));
        setExercises(mapped);
      } catch (err) {
        console.warn('Failed to load exercises:', err);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authAxios, bodyPart]);

  // Measure container height for virtualization
  useEffect(() => {
    const measure = () => {
      if (listRef.current) setListHeight(listRef.current.clientHeight || 400);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises;
    const term = search.toLowerCase();
    return exercises.filter(ex =>
      ex.name?.toLowerCase().includes(term) ||
      (ex.primaryMuscles || []).some(m => m.toLowerCase().includes(term)) ||
      (ex.bodyPartCategory || '').toLowerCase().includes(term)
    );
  }, [exercises, search]);

  const getDiffLevel = (d?: number): 'easy' | 'med' | 'hard' => {
    if (!d || d < 300) return 'easy';
    if (d < 600) return 'med';
    return 'hard';
  };

  const getDiffLabel = (d?: number): string => {
    if (!d || d < 300) return 'Easy';
    if (d < 600) return 'Medium';
    return 'Hard';
  };

  const getMuscleStr = (ex: RolodexExercise): string => {
    const muscles = ex.primaryMuscles || [];
    return muscles.slice(0, 2).map(m => m.replace(/_/g, ' ')).join(', ') || 'General';
  };

  // Virtualized row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const ex = filtered[index];
    if (!ex) return null;

    return (
      <div style={style}>
        <ExerciseRow onClick={() => onAddExercise(ex, targetStation)}>
          <ExInfo>
            <ExName>{ex.name}</ExName>
            <ExMeta>{getMuscleStr(ex)}</ExMeta>
          </ExInfo>
          <DiffBadge $level={getDiffLevel(ex.difficulty)}>{getDiffLabel(ex.difficulty)}</DiffBadge>
          <AddBtn onClick={(e) => { e.stopPropagation(); onAddExercise(ex, targetStation); }} title="Add to class">
            <Plus size={14} />
          </AddBtn>
        </ExerciseRow>
      </div>
    );
  }, [filtered, onAddExercise, targetStation]);

  return (
    <PanelWrap>
      <PanelHeader>
        <PanelTitle><Dumbbell size={14} /> Exercise Rolodex</PanelTitle>
        <SearchBox>
          <Search size={14} style={{ opacity: 0.4 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            aria-label="Search exercises"
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <X size={12} />
            </button>
          )}
        </SearchBox>
      </PanelHeader>

      <ChipRow>
        {BODY_PARTS.map(bp => (
          <Chip key={bp} $active={bodyPart === bp} onClick={() => setBodyPart(bp)}>
            {bp}
          </Chip>
        ))}
      </ChipRow>

      <ExerciseCount>{filtered.length} exercises</ExerciseCount>

      <ListContainer ref={listRef}>
        {loading ? (
          <EmptyState>Loading exercises...</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>No exercises found</EmptyState>
        ) : (
          <VirtualList
            height={listHeight}
            itemCount={filtered.length}
            itemSize={52}
            width="100%"
          >
            {Row}
          </VirtualList>
        )}
      </ListContainer>
    </PanelWrap>
  );
};

export default memo(ExerciseRolodexPanel);
