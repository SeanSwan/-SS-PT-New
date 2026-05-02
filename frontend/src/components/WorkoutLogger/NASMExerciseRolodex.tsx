/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SUB-COMPONENT: NASMExerciseRolodex                          ║
 * ║  PARENT: WorkoutLogger                                       ║
 * ║  PURPOSE: Virtualized exercise search + filter dropdown       ║
 * ║           with Teach Me exercise preview panel                ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-04-03        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [🔍 Search exercises...                              ]     │
 * │ [All] [Chest] [Back] [Arms] [Legs] ...                     │
 * │ [▸ More Filters]                                           │
 * │ ┌──────────────────────┬──────────────────────────────┐   │
 * │ │ ▸ Barbell Bench Press │ HOW TO PERFORM              │   │
 * │ │   compound · Chest    │ Muscles: Chest, Triceps     │   │
 * │ │ ▸ Dumbbell Fly       │ Equipment: Barbell, Bench   │   │
 * │ │ ▸ Cable Crossover    │ Instructions: ...            │   │
 * │ └──────────────────────┴──────────────────────────────┘   │
 * │ 59 exercises · 12 matching                                 │
 * └────────────────────────────────────────────────────────────┘
 *
 * Props: { onSelectExercise, isOpen, onClose, sectionContext? }
 */

import React, { memo, useCallback, useState, useRef, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { List, useListRef } from 'react-window';
import { Search, Loader, BookOpen, Plus } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';
import ExerciseFilterChips from './ExerciseFilterChips';
import { useExerciseSearch, type ExerciseSlim } from './useExerciseSearch';

// ─── Types ──────────────────────────────────────────────────

type SectionContext = 'warmup' | 'balance_core' | 'cooldown' | 'main';

interface NASMExerciseRolodexProps {
  onSelectExercise: (exercise: ExerciseSlim) => void;
  isOpen: boolean;
  onClose: () => void;
  sectionContext?: SectionContext;
}

// ─── Constants ──────────────────────────────────────────────

const ROW_HEIGHT = 56;
// Mobile keeps the compact 6-row dropdown so the on-screen keyboard +
// search input + chips still fit on a 320-414px handset. Desktop bumps
// to 10 rows so trainers see ~75% more results without scrolling.
// L2.B (2026-05-02): viewport-adaptive density per the long-horizon receipt.
const MAX_ROWS_MOBILE = 6;
const MAX_ROWS_DESKTOP = 10;
const DESKTOP_BREAKPOINT_MQ = '(min-width: 768px)';

function useVisibleRowCount(): number {
  const [rows, setRows] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return MAX_ROWS_MOBILE;
    return window.matchMedia(DESKTOP_BREAKPOINT_MQ).matches ? MAX_ROWS_DESKTOP : MAX_ROWS_MOBILE;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DESKTOP_BREAKPOINT_MQ);
    const handler = (e: MediaQueryListEvent) => setRows(e.matches ? MAX_ROWS_DESKTOP : MAX_ROWS_MOBILE);
    // Older WebKit uses addListener/removeListener; modern uses addEventListener.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    // @ts-expect-error legacy MediaQueryList API
    mq.addListener(handler);
    // @ts-expect-error legacy MediaQueryList API
    return () => mq.removeListener(handler);
  }, []);
  return rows;
}

const EQUIPMENT_TYPES = ['All', 'Bodyweight', 'Dumbbell', 'Barbell', 'Machine', 'Cable', 'Band', 'Kettlebell', 'Ball', 'BOSU'];
const EXERCISE_TYPES = ['All', 'Compound', 'Isolation', 'Calisthenics', 'Stability', 'Flexibility'];

// ─── Section Context Filters ─────────────────────────────

const SECTION_PATTERNS: Record<Exclude<SectionContext, 'main'>, {
  categories: string[];
  types: string[];
  nameKeywords: RegExp;
}> = {
  warmup: {
    categories: ['recovery'],
    types: ['flexibility'],
    nameKeywords: /foam roll|stretch|dynamic|warmup|warm up|corrective/i,
  },
  balance_core: {
    categories: ['core'],
    types: [],
    nameKeywords: /balance|plank|stability|bird dog|dead bug|pallof/i,
  },
  cooldown: {
    categories: ['recovery'],
    types: [],
    nameKeywords: /stretch|foam roll|breathing|cool down|cooldown|recovery/i,
  },
};

function matchesSectionContext(ex: ExerciseSlim, ctx?: SectionContext): boolean {
  if (!ctx || ctx === 'main') return true;
  const pattern = SECTION_PATTERNS[ctx];
  if (!pattern) return true;
  const cat = (ex.bodyPartCategory || '').toLowerCase();
  const type = (ex.exerciseType || '').toLowerCase();
  if (pattern.categories.some(c => cat === c)) return true;
  if (pattern.types.some(t => type === t)) return true;
  if (pattern.nameKeywords.test(ex.name)) return true;
  return false;
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

function getExerciseTips(ex: ExerciseSlim): string {
  // Use real description from DB when available
  if (ex.description && ex.description.length > 20) return ex.description;

  const n = ex.name.toLowerCase();
  if (n.includes('squat') && (n.includes('jump') || n.includes('box'))) return 'Explode upward from squat. Land softly with bent knees. Absorb impact immediately into next rep.';
  if (n.includes('goblet squat')) return 'Hold weight at chest, elbows down. Squat deep keeping torso upright, elbows inside knees. Drive through heels.';
  if (n.includes('squat')) return 'Feet shoulder-width, toes slightly out. Push hips back, bend knees. Chest up, knees track over toes. Drive through heels.';
  if (n.includes('bench press')) return 'Lie on bench, feet flat. Grip slightly wider than shoulders. Lower bar to mid-chest (3s down). Press up explosively. Keep shoulder blades retracted.';
  if (n.includes('overhead press') || n.includes('military') || n.includes('shoulder press')) return 'Stand hip-width. Hold at shoulder height. Brace core, squeeze glutes. Press straight overhead to full lockout. Lower with control.';
  if (n.includes('push up') || n.includes('pushup')) return 'Hands wider than shoulders. Straight line head to heels. Lower chest to 1-2" from floor. Push up explosively. No hip sag.';
  if (n.includes('press') || n.includes('push')) return 'Stable base. Control the lowering phase (2-3s). Press with intent. Core braced, natural spine throughout.';
  if (n.includes('pull up') || n.includes('pullup') || n.includes('chin up')) return 'Hang fully extended. Retract shoulder blades, pull until chin clears bar. Lower with control (3s). No kipping.';
  if (n.includes('bent') && n.includes('row')) return 'Hinge to ~45 degrees. Pull bar to lower ribs, squeeze shoulder blades. Lower with control. Flat back throughout.';
  if (n.includes('row')) return 'Retract shoulder blades first. Drive elbows back past torso. Squeeze between shoulder blades at top. Control the return.';
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('romanian')) return 'Feet hip-width, bar over mid-foot. Hinge at hips. Keep bar close to body, spine neutral. Lockout by squeezing glutes. Controlled return.';
  if (n.includes('reverse lunge')) return 'Step backward. Lower until both knees ~90 degrees. Front knee behind toes. Drive through front heel to return.';
  if (n.includes('walking lunge')) return 'Step forward into lunge. Both knees ~90 degrees. Drive through front heel, step back foot forward into next lunge.';
  if (n.includes('lateral lunge') || n.includes('side lunge')) return 'Step wide to one side, push hips back. Bend stepping leg, keep other straight. Push off to return. Toes forward.';
  if (n.includes('lunge')) return 'Step forward with control. Both knees ~90 degrees. Front knee over toes. Push back through front heel.';
  if (n.includes('curl')) return 'Elbows pinned to sides. Curl up (2s). Squeeze hard at top. Lower slowly (3-4s). No swinging or momentum.';
  if (n.includes('plank') || n.includes('dead bug') || n.includes('bird dog')) return 'Straight line head to heels. Draw belly button to spine. Breathe steady. No hip sag or pike. Hold with perfect form.';
  if (n.includes('jump') || n.includes('hop') || n.includes('burpee') || n.includes('bound')) return 'Athletic stance, soft knees. Explode up with triple extension. Arms generate momentum. Land softly on balls of feet. Knees track over toes.';
  if (n.includes('stretch') || n.includes('foam roll') || n.includes('mobility')) return 'Move slowly into position. Hold 20-30 seconds for static stretches. Breathe deeply and relax into it. For foam rolling: moderate pressure, 1 inch per second.';
  if (n.includes('crunch') || n.includes('sit up') || n.includes('ab ')) return 'Knees bent, feet flat. Hands lightly behind head (don\'t pull neck). Curl shoulder blades off floor. Lower with control. Focus on the squeeze.';
  if (n.includes('fly') || n.includes('flye') || n.includes('crossover')) return 'Slight elbow bend throughout. Control the stretch phase. Squeeze at contraction. 2s up, 3s down tempo.';
  if (n.includes('lateral raise') || n.includes('side raise')) return 'Slight forward lean. Lead with elbows. Raise to shoulder height only. Lower for 3s. Don\'t shrug.';
  if (n.includes('step up') || n.includes('step-up')) return 'Full foot on box. Drive through heel of working leg. Control the descent. Torso upright. Complete reps on one side, then switch.';
  if (n.includes('sprint') || n.includes('run') || n.includes('shuttle')) return 'Drive knees high, powerful arm swing. Land on balls of feet. Forward lean from ankles. Maximum effort for prescribed distance.';
  if (n.includes('rope') || n.includes('slam') || n.includes('throw')) return 'Generate power from hips and core. Athletic stance, soft knees. Full amplitude movements. Core braced. Breathe in rhythm.';
  if (n.includes('kickback') || n.includes('extension') || n.includes('skull')) return 'Isolate the target joint. Fully extend through concentric. Squeeze 1 second. Control return 3 seconds. Lighter weight, prioritize form.';
  if (n.includes('machine') || n.includes('leg press') || n.includes('lat pull')) return 'Adjust machine to fit your body. Controlled concentric. Squeeze at peak. Slow return through full ROM. Don\'t lock joints.';
  return 'Controlled movement through full range of motion. Proper alignment. Core engaged. Breathe out during exertion, in during return.';
}

// ─── Component ──────────────────────────────────────────────

const NASMExerciseRolodex: React.FC<NASMExerciseRolodexProps> = memo(({
  onSelectExercise, isOpen, onClose, sectionContext,
}) => {
  const {
    results, allExercises, isSearching, isLoading,
    setQuery, setCategory, query, category,
  } = useExerciseSearch();

  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [previewExercise, setPreviewExercise] = useState<ExerciseSlim | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [equipFilter, setEquipFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useListRef();
  // L2.B (2026-05-02): viewport-adaptive density. Mobile = 6 rows, desktop = 10.
  const maxVisibleRows = useVisibleRowCount();

  // Section-aware filtering
  const sectionFiltered = useMemo(() => {
    if (!sectionContext || sectionContext === 'main') return results;
    return results.filter(ex => matchesSectionContext(ex, sectionContext));
  }, [results, sectionContext]);

  // Advanced filters on top
  const filteredResults = useMemo(() => {
    let pool = sectionFiltered;
    if (typeFilter) {
      pool = pool.filter(ex => (ex.exerciseType || '').toLowerCase() === typeFilter.toLowerCase());
    }
    if (equipFilter) {
      const norm = equipFilter.toLowerCase();
      pool = pool.filter(ex => {
        const eqArr = parseEquipment((ex as any).equipment || (ex as any).equipmentNeeded);
        if (norm === 'bodyweight') return eqArr.length === 0 || eqArr.some(e => e.toLowerCase().includes('body'));
        return eqArr.some(e => e.toLowerCase().includes(norm));
      });
    }
    return pool;
  }, [sectionFiltered, typeFilter, equipFilter]);

  const filteredAllExercises = useMemo(() => {
    if (!sectionContext || sectionContext === 'main') return allExercises;
    return allExercises.filter(ex => matchesSectionContext(ex, sectionContext));
  }, [allExercises, sectionContext]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: filteredAllExercises.length };
    for (const ex of filteredAllExercises) {
      const cat = ex.bodyPartCategory || 'Full Body';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [filteredAllExercises]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
      setHighlightIndex(-1);
      setPreviewExercise(null);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => {
        const next = prev < filteredResults.length - 1 ? prev + 1 : 0;
        listRef.current?.scrollToRow({ index: next, align: 'smart' });
        setPreviewExercise(filteredResults[next] || null);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredResults.length - 1;
        listRef.current?.scrollToRow({ index: next, align: 'smart' });
        setPreviewExercise(filteredResults[next] || null);
        return next;
      });
    } else if (e.key === 'Enter' && highlightIndex >= 0 && filteredResults[highlightIndex]) {
      e.preventDefault();
      handleSelect(filteredResults[highlightIndex]);
    }
  }, [filteredResults, highlightIndex, onClose]);

  const handleSelect = useCallback((exercise: ExerciseSlim) => {
    onSelectExercise(exercise);
    setQuery('');
    onClose();
  }, [onSelectExercise, setQuery, onClose]);

  const handleRowHover = useCallback((exercise: ExerciseSlim) => {
    setPreviewExercise(exercise);
  }, []);

  const activeFilterCount = [equipFilter, typeFilter].filter(Boolean).length;

  // Row renderer for react-window v2
  const RowComponent = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const ex = filteredResults[index];
    if (!ex) return null;
    return (
      <ExerciseRow
        style={style}
        $highlighted={index === highlightIndex}
        onClick={() => handleSelect(ex)}
        onMouseEnter={() => handleRowHover(ex)}
        role="option"
        aria-selected={index === highlightIndex}
      >
        <ExName>{ex.name}</ExName>
        <ExMeta>
          <TypeBadge>{ex.exerciseType || 'exercise'}</TypeBadge>
          {(ex.primaryMuscles || []).slice(0, 3).join(', ')}
        </ExMeta>
      </ExerciseRow>
    );
  }, [filteredResults, highlightIndex, handleSelect, handleRowHover]);

  if (!isOpen) return null;

  const listHeight = Math.min(filteredResults.length, maxVisibleRows) * ROW_HEIGHT;

  return (
    <Wrapper ref={wrapperRef}>
      {/* Search Input */}
      <SearchRow>
        <SearchIconStyled size={16} />
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlightIndex(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Search exercises by name, type, or muscle..."
          autoComplete="off"
          aria-label="Search exercises"
          role="combobox"
          aria-expanded={filteredResults.length > 0}
          aria-controls="exercise-rolodex-list"
        />
        {(isSearching || isLoading) && <SpinnerIcon size={16} />}
      </SearchRow>

      {/* Body Part Filter Chips */}
      <ExerciseFilterChips
        activeCategory={category}
        onCategoryChange={setCategory}
        categoryCounts={categoryCounts}
      />

      {/* Advanced Filters Toggle */}
      <FilterToggle onClick={() => setShowFilters(!showFilters)}>
        {showFilters ? '▾ Hide Filters' : '▸ More Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
      </FilterToggle>

      {showFilters && (
        <FilterRows>
          <FilterLabel>Type:</FilterLabel>
          <MiniChipRow>
            {EXERCISE_TYPES.map(t => (
              <MiniChip key={t} $active={typeFilter === null ? t === 'All' : typeFilter.toLowerCase() === t.toLowerCase()}
                onClick={() => setTypeFilter(t === 'All' ? null : t)}>
                {t}
              </MiniChip>
            ))}
          </MiniChipRow>
          <FilterLabel>Equipment:</FilterLabel>
          <MiniChipRow>
            {EQUIPMENT_TYPES.map(e => (
              <MiniChip key={e} $active={equipFilter === null ? e === 'All' : equipFilter.toLowerCase() === e.toLowerCase()}
                onClick={() => setEquipFilter(e === 'All' ? null : e)}>
                {e}
              </MiniChip>
            ))}
          </MiniChipRow>
        </FilterRows>
      )}

      {/* Split View: List + Preview */}
      <SplitView $hasPreview={!!previewExercise}>
        {/* Left: Exercise List */}
        <ListSide>
          {filteredResults.length > 0 ? (
            <ListContainer>
              <List
                listRef={listRef}
                rowComponent={RowComponent}
                rowCount={filteredResults.length}
                rowHeight={ROW_HEIGHT}
                rowProps={{}}
                style={{ height: listHeight || ROW_HEIGHT }}
                id="exercise-rolodex-list"
                role="listbox"
                aria-label="Exercise search results"
              />
            </ListContainer>
          ) : !isLoading && (
            <EmptyState>
              {query.length >= 1
                ? 'No exercises found. Try a different search.'
                : 'Start typing to search exercises...'}
            </EmptyState>
          )}
        </ListSide>

        {/* Right: Teach Me Preview */}
        {previewExercise && (
          <PreviewSide>
            <PreviewHeader>
              <BookOpen size={12} />
              How to Perform
            </PreviewHeader>
            <PreviewTitle>{previewExercise.name}</PreviewTitle>
            <PreviewRow>
              <PreviewLabel>Muscles:</PreviewLabel>
              {(previewExercise.primaryMuscles || []).join(', ') || 'Full Body'}
            </PreviewRow>
            <PreviewRow>
              <PreviewLabel>Type:</PreviewLabel>
              {previewExercise.exerciseType || 'Exercise'}
            </PreviewRow>
            <PreviewRow>
              <PreviewLabel>Equipment:</PreviewLabel>
              {(() => {
                const eq = parseEquipment((previewExercise as any).equipment || (previewExercise as any).equipmentNeeded);
                return eq.length > 0 ? eq.join(', ') : 'Bodyweight';
              })()}
            </PreviewRow>
            <PreviewRow>
              <PreviewLabel>Tips:</PreviewLabel>
              {getExerciseTips(previewExercise)}
            </PreviewRow>
            {previewExercise.easyVariation && (
              <PreviewRow>
                <PreviewLabel>Easier:</PreviewLabel>
                {previewExercise.easyVariation}
              </PreviewRow>
            )}
            {previewExercise.hardVariation && (
              <PreviewRow>
                <PreviewLabel>Harder:</PreviewLabel>
                {previewExercise.hardVariation}
              </PreviewRow>
            )}
            <AddButton onClick={() => handleSelect(previewExercise)}>
              <Plus size={14} /> Add to Workout
            </AddButton>
          </PreviewSide>
        )}
      </SplitView>

      {/* Status Bar */}
      <StatusBar>
        {filteredAllExercises.length} exercises
        {query && ` · ${filteredResults.length} matching`}
        {category && category !== 'All' && ` · ${category}`}
        {sectionContext && sectionContext !== 'main' && ` · ${sectionContext.replace('_', ' ')}`}
        {previewExercise && ' · hover to preview'}
      </StatusBar>
    </Wrapper>
  );
});

NASMExerciseRolodex.displayName = 'NASMExerciseRolodex';
export default NASMExerciseRolodex;

// ── Styled Components ──────────────────────────────────────

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const Wrapper = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(20, 20, 25, 0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${withAlpha(CS.glow, 0.15)};
  border-radius: 1rem;
  padding: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 40px ${withAlpha(CS.glow, 0.06)};
  animation: ${slideDown} 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const SearchRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 4px;
`;

const SearchIconStyled = styled(Search)`
  position: absolute;
  left: 12px;
  color: ${CS.gaming};
  pointer-events: none;
  z-index: 1;
`;

const SpinnerIcon = styled(Loader)`
  position: absolute;
  right: 12px;
  color: ${CS.gaming};
  animation: ${spin} 0.8s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation-duration: 1.5s; }
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 40px 10px 38px;
  border-radius: 0.75rem;
  border: 1.5px solid ${CS.glassBorder};
  background: ${CS.inputBg};
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px ${withAlpha(CS.glow, 0.15)};
  }
  &::placeholder { color: rgba(224, 236, 244, 0.4); }
`;

const FilterToggle = styled.button`
  display: block;
  padding: 4px 8px;
  margin-bottom: 4px;
  border: none;
  background: transparent;
  color: ${CS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { color: ${CS.text}; }
`;

const FilterRows = styled.div`
  padding: 0 0 6px;
`;

const FilterLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  color: ${CS.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 2px 0 2px 2px;
`;

const MiniChipRow = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-bottom: 4px;
`;

const MiniChip = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  border-radius: 1rem;
  border: 1px solid ${({ $active }) => $active ? CS.secondary : 'transparent'};
  background: ${({ $active }) => $active ? withAlpha(CS.secondary, 0.2) : withAlpha(CS.glow, 0.06)};
  color: ${({ $active }) => $active ? CS.text : CS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 24px;
  &:hover { color: ${CS.text}; background: ${withAlpha(CS.glow, 0.12)}; }
`;

const SplitView = styled.div<{ $hasPreview: boolean }>`
  display: ${({ $hasPreview }) => $hasPreview ? 'grid' : 'block'};
  grid-template-columns: ${({ $hasPreview }) => $hasPreview ? '1fr 1fr' : '1fr'};
  gap: 8px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ListSide = styled.div``;

const PreviewSide = styled.div`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${withAlpha(CS.glow, 0.12)};
  background: ${withAlpha(CS.glow, 0.04)};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
  color: ${CS.textSecondary};
  /* L2.B: matches list-side height per breakpoint (6 mobile / 10 desktop). */
  max-height: ${MAX_ROWS_MOBILE * ROW_HEIGHT}px;
  overflow-y: auto;
  @media ${DESKTOP_BREAKPOINT_MQ} {
    max-height: ${MAX_ROWS_DESKTOP * ROW_HEIGHT}px;
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${CS.glow};
  margin-bottom: 6px;
`;

const PreviewTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${CS.text};
  margin-bottom: 8px;
`;

const PreviewRow = styled.div`
  margin-bottom: 5px;
`;

const PreviewLabel = styled.span`
  font-weight: 700;
  color: ${CS.glow};
  font-size: 0.72rem;
  margin-right: 4px;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${CS.secondary};
  background: ${withAlpha(CS.secondary, 0.15)};
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${CS.secondary};
    color: white;
  }
`;

const ListContainer = styled.div`
  border-radius: 0.5rem;
  overflow: hidden;
  & > div {
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
      background: ${withAlpha(CS.glow, 0.25)};
      border-radius: 3px;
    }
  }
`;

const ExerciseRow = styled.div<{ $highlighted: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 14px;
  cursor: pointer;
  transition: background 0.12s;
  background: ${({ $highlighted }) =>
    $highlighted ? withAlpha(CS.glow, 0.12) : 'transparent'};
  border-left: 3px solid ${({ $highlighted }) =>
    $highlighted ? CS.glow : 'transparent'};
  &:hover {
    background: ${withAlpha(CS.glow, 0.08)};
    border-left-color: ${withAlpha(CS.glow, 0.4)};
  }
`;

const ExName = styled.span`
  color: ${CS.text};
  font-size: 0.88rem;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExMeta = styled.span`
  color: ${CS.textSecondary};
  font-size: 0.8rem;
  font-family: 'Sora', sans-serif;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 1px 7px;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${withAlpha(CS.glow, 0.12)};
  color: ${CS.glowLight};
  border: 1px solid ${withAlpha(CS.glow, 0.2)};
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  padding: 20px 14px;
  text-align: center;
  color: ${CS.textSecondary};
  font-size: 0.85rem;
  font-family: 'Sora', sans-serif;
`;

const StatusBar = styled.div`
  padding: 6px 8px 0;
  font-size: 0.7rem;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  color: ${withAlpha(CS.textSecondary, 0.6)};
  text-align: right;
`;
