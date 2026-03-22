/**
 * ┌─── SUB-COMPONENT: ExerciseHistoryChart ─────────────────────┐
 * │ PARENT: ExerciseRolodexPage, ClientChartsPanel               │
 * │ PURPOSE: CSS-only frequency bars for all-time exercise stats │
 * │ WIREFRAME:                                                    │
 * │ ┌─────────────────────────────────────────────┐              │
 * │ │ Exercise History  (Variety: 42/840 = 5.0%)  │              │
 * │ │ [All] [Chest] [Back] [Legs] [Arms] [Core]  │              │
 * │ │                                              │              │
 * │ │ Bench Press         ████████████░░░ 24×      │              │
 * │ │ Squat               ██████████░░░░░ 18×      │              │
 * │ │ Deadlift            ████████░░░░░░░ 14×      │              │
 * │ │ Pull-up             ██████░░░░░░░░░ 10×      │              │
 * │ │ ...                                          │              │
 * │ │ [Load More]                                  │              │
 * │ └─────────────────────────────────────────────┘              │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES:                                               │
 * │ [Filter chip] → Re-fetches with muscleGroup param            │
 * │ [Sort toggle] → Re-fetches with sort param                    │
 * │ [Load More] → Cursor-based pagination                         │
 * │ GAMIFICATION: Variety score feeds achievement progress         │
 * └───────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import apiService from '../../services/api.service';
import SkeletonChart from '../UI/SkeletonChart';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface ExerciseHistoryItem {
  exerciseId: number;
  exerciseName: string;
  primaryMuscles: string;
  category: string;
  timesPerformed: number;
  maxWeight: number;
  maxReps: number;
  totalVolume: number;
  lastPerformedDate: string;
  firstPerformedDate: string;
}

interface ExerciseHistoryResponse {
  success: boolean;
  exercises: ExerciseHistoryItem[];
  totalUniqueExercises: number;
  totalAvailableExercises: number;
  varietyScore: number;
  usedMaterializedView: boolean;
}

interface ExerciseHistoryChartProps {
  userId: number | string;
}

type SortOption = 'timesPerformed' | 'totalVolume' | 'lastPerformed' | 'alphabetical';

const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body', 'Cardio', 'Recovery'] as const;

const SORT_LABELS: Record<SortOption, string> = {
  timesPerformed: 'Most Used',
  totalVolume: 'Highest Volume',
  lastPerformed: 'Recent',
  alphabetical: 'A → Z',
};

const PAGE_SIZE = 30;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: CSS-only horizontal bar chart for exercise frequency
// WHY: CEO ruling — no Victory SVG or Canvas for simple bars
// ─────────────────────────────────────────────────────────────

const ExerciseHistoryChart: React.FC<ExerciseHistoryChartProps> = ({ userId }) => {
  const [exercises, setExercises] = useState<ExerciseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muscleFilter, setMuscleFilter] = useState<string>('All');
  const [sort, setSort] = useState<SortOption>('timesPerformed');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [varietyScore, setVarietyScore] = useState(0);
  const [totalUnique, setTotalUnique] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);

  const fetchExercises = useCallback(async (append = false) => {
    if (!userId) return;
    append ? setLoadingMore(true) : setLoading(true);

    try {
      const params = new URLSearchParams({
        sort,
        limit: String(PAGE_SIZE),
        ...(muscleFilter !== 'All' ? { muscleGroup: muscleFilter } : {}),
        ...(append && cursor ? { cursor } : {}),
      });

      const res = await apiService.get(
        `/api/analytics/${userId}/exercise-history?${params}`
      );
      const data = res.data as ExerciseHistoryResponse;

      if (data.success) {
        const items = data.exercises || [];
        setExercises(prev => append ? [...prev, ...items] : items);
        setVarietyScore(data.varietyScore);
        setTotalUnique(data.totalUniqueExercises);
        setTotalAvailable(data.totalAvailableExercises);
        setHasMore(items.length >= PAGE_SIZE);

        if (items.length > 0) {
          const last = items[items.length - 1];
          setCursor(`${last.lastPerformedDate},${last.exerciseId}`);
        }
      }
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load exercise history';
      if (!append) setError(msg);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [userId, muscleFilter, sort, cursor]);

  // Reset and fetch on filter/sort change
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    setExercises([]);
    fetchExercises(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, muscleFilter, sort]);

  // Compute max value for bar scaling
  const maxValue = useMemo(() => {
    if (exercises.length === 0) return 1;
    if (sort === 'totalVolume') return Math.max(...exercises.map(e => Number(e.totalVolume)));
    return Math.max(...exercises.map(e => Number(e.timesPerformed)));
  }, [exercises, sort]);

  const getBarValue = (ex: ExerciseHistoryItem) =>
    sort === 'totalVolume' ? Number(ex.totalVolume) : Number(ex.timesPerformed);

  const getBarLabel = (ex: ExerciseHistoryItem) =>
    sort === 'totalVolume'
      ? `${(Number(ex.totalVolume) / 1000).toFixed(1)}k lbs`
      : `${ex.timesPerformed}×`;

  if (loading) return <SkeletonChart height={400} />;

  if (error) {
    return (
      <ErrorCard>
        <ErrorText>{error}</ErrorText>
        <RetryButton onClick={() => fetchExercises(false)}>Retry</RetryButton>
      </ErrorCard>
    );
  }

  return (
    <Card role="region" aria-label="Exercise History">
      <Header>
        <TitleRow>
          <Title>Exercise History</Title>
          <VarietyBadge>
            {totalUnique}/{totalAvailable} — {varietyScore}% variety
          </VarietyBadge>
        </TitleRow>

        {/* Sort toggle */}
        <SortRow>
          {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
            <SortChip
              key={key}
              type="button"
              $active={sort === key}
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
            >
              {SORT_LABELS[key]}
            </SortChip>
          ))}
        </SortRow>

        {/* Muscle group filter chips */}
        <FilterRow>
          {MUSCLE_FILTERS.map(f => (
            <FilterChip
              key={f}
              type="button"
              $active={muscleFilter === f}
              onClick={() => setMuscleFilter(f)}
              aria-pressed={muscleFilter === f}
            >
              {f}
            </FilterChip>
          ))}
        </FilterRow>
      </Header>

      {exercises.length === 0 ? (
        <EmptyState>No exercises logged yet. Complete a workout to see your history!</EmptyState>
      ) : (
        <BarList>
          {exercises.map((ex, idx) => {
            const pct = maxValue > 0 ? (getBarValue(ex) / maxValue) * 100 : 0;
            return (
              <BarRow key={`${ex.exerciseId}-${idx}`}>
                <ExName title={ex.exerciseName}>{ex.exerciseName}</ExName>
                <BarTrack>
                  <BarFill $pct={pct} $index={idx} />
                </BarTrack>
                <BarLabel>{getBarLabel(ex)}</BarLabel>
              </BarRow>
            );
          })}
        </BarList>
      )}

      {hasMore && exercises.length > 0 && (
        <LoadMoreButton
          onClick={() => fetchExercises(true)}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading…' : 'Load More'}
        </LoadMoreButton>
      )}
    </Card>
  );
};

export default React.memo(ExerciseHistoryChart);

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const barGrow = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Card = styled.div`
  background: ${({ theme }) => theme?.colors?.surface || '#1A1A24'};
  border-radius: 16px;
  border: 1px solid rgba(80, 160, 240, 0.15);
  padding: 1.25rem;
  box-shadow: 0 8px 32px rgba(0, 32, 96, 0.3);

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }
`;

const Header = styled.div`
  margin-bottom: 1rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const VarietyBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #60C0F0;
  background: rgba(96, 192, 240, 0.1);
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.2);
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const FilterChip = styled.button<{ $active: boolean }>`
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.2)'};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.2)' : 'transparent'};
  color: ${({ $active }) => $active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.6)'};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover { border-color: #60C0F0; }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }

  @media (max-width: 768px) {
    min-height: 44px;
    padding: 8px 14px;
  }
`;

const SortRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const SortChip = styled.button<{ $active: boolean }>`
  min-height: 32px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.15)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.5)'};
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover { border-color: #60C0F0; }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }

  @media (max-width: 768px) {
    min-height: 44px;
    padding: 8px 12px;
  }
`;

const BarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 500px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(96, 192, 240, 0.3) transparent;
`;

const BarRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr 60px;
  align-items: center;
  gap: 8px;
  min-height: 32px;

  @media (max-width: 480px) {
    grid-template-columns: 100px 1fr 50px;
  }
`;

const ExName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: #E0ECF4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BarTrack = styled.div`
  height: 20px;
  border-radius: 4px;
  background: rgba(80, 160, 240, 0.08);
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $index: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.max($pct, 2)}%;
  border-radius: 4px;
  background: linear-gradient(90deg, #8B5CF6, #60C0F0);
  transform-origin: left;
  animation: ${barGrow} 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  animation-delay: ${({ $index }) => Math.min($index * 30, 600)}ms;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const BarLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.7);
  text-align: right;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(224, 236, 244, 0.5);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

const LoadMoreButton = styled.button`
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 0.75rem;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background: rgba(96, 192, 240, 0.08);
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) { background: rgba(96, 192, 240, 0.15); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const ErrorCard = styled.div`
  background: ${({ theme }) => theme?.colors?.surface || '#1A1A24'};
  border-radius: 16px;
  border: 1px solid rgba(201, 42, 84, 0.4);
  border-left: 4px solid #C92A54;
  padding: 1.5rem;
  text-align: center;
`;

const ErrorText = styled.p`
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
`;

const RetryButton = styled.button`
  min-height: 44px;
  padding: 8px 24px;
  border-radius: 8px;
  border: 1px solid #60C0F0;
  background: rgba(96, 192, 240, 0.1);
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover { background: rgba(96, 192, 240, 0.2); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;
