/**
 * ============================================================================
 * FILE: CrystallineCoverageTracker.tsx
 * PURPOSE: Hexagonal grid showing exercise-to-video coverage across 840+ exercises
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches exercise coverage data from the backend and renders
 * a filterable hexagonal grid where each hex represents an exercise. Color indicates
 * coverage status (has video vs gap). Summary stats and body-part breakdown shown above.
 *
 * HOW IT FITS IN THE APP: ContentStudioHub → Coverage Tab → CrystallineCoverageTracker
 *
 * ┌─── SUB-COMPONENT: CrystallineCoverageTracker ─────────────┐
 * │ PARENT: ContentStudioHub                                    │
 * │ PURPOSE: Visual coverage map of exercise video library      │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────┐            │
 * │ │ Summary: 47.2% covered | 840 exercises       │            │
 * │ ├──────────────────────────────────────────────┤            │
 * │ │ [All] [Chest] [Back] [Legs] ... (filters)   │            │
 * │ ├──────────────────────────────────────────────┤            │
 * │ │  ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡       │            │
 * │ │  ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡       │            │
 * │ │  (green=covered, dim=gap, purple=legacy)     │            │
 * │ └──────────────────────────────────────────────┘            │
 * │ Props: none (fetches from /api/content-studio/coverage)     │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Search, Film, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import CoverageExerciseMediaDetail from './CoverageExerciseMediaDetail';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface CoverageExercise {
  id: string | number;
  name: string;
  exerciseKey: string;
  exerciseType: string;
  bodyPartCategory: string;
  difficulty: number;
  source: string;
  videoUrl?: string | null;
  previewVideoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaPreviewUrl?: string | null;
  catalogVideoSample?: {
    title?: string | null;
    source?: string | null;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
  } | null;
  hasLegacyVideo: boolean;
  catalogVideoCount: number;
  covered: boolean;
}

interface CoverageSummary {
  totalExercises: number;
  coveredCount: number;
  gapCount: number;
  coveragePercent: number;
}

interface ByBodyPart {
  [key: string]: { total: number; covered: number; gaps?: number };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const iceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div`
  padding: 24px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const StatCard = styled.div<{ $accent?: string }>`
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $accent }) => $accent || 'rgba(96, 192, 240, 0.1)'};
`;

const StatValue = styled.div<{ $color?: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

// ─── Body Part Breakdown Bar ─────────────────────────────
const BreakdownGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 8px;
  margin-bottom: 24px;
`;

const BreakdownItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.06);
`;

const BreakdownLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-primary, #E0ECF4);
  min-width: 80px;
`;

const BreakdownBar = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(96, 192, 240, 0.08);
  overflow: hidden;
`;

const BreakdownFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 3px;
  background: ${({ $pct }) =>
    $pct >= 75 ? 'var(--color-ice-wing, #60C0F0)' :
    $pct >= 40 ? 'var(--color-gilded-fern, #C6A84B)' :
    'var(--color-wing-purple, #8B5CF6)'};
  transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
`;

const BreakdownPct = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  min-width: 42px;
  text-align: right;
`;

// ─── Filter + Search ─────────────────────────────────────
const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  min-width: 200px;
  flex: 0 1 280px;

  &:focus-within {
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }
`;

const SearchInput = styled.input`
  all: unset;
  flex: 1;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: var(--text-primary, #E0ECF4);

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }
`;

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
`;

const Chip = styled.button<{ $active: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  padding: 6px 14px;
  border-radius: 20px;
  min-height: 32px;
  white-space: nowrap;
  color: ${({ $active }) =>
    $active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.6)'};
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(96, 192, 240, 0.06)'};
  border: 1px solid ${({ $active }) =>
    $active ? '#8B5CF6' : 'rgba(96, 192, 240, 0.1)'};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: #E0ECF4;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const GapToggle = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active
    ? 'var(--color-gilded-fern, #C6A84B)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)')};
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--color-gilded-fern, #C6A84B) 18%, transparent)'
    : 'var(--bg-elevated, #141419)')};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--color-gilded-fern, #C6A84B) 14%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─── Hexagonal Grid ──────────────────────────────────────
const HexGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 0;
`;

const HexCell = styled.button<{ $covered: boolean; $legacy: boolean; $selected: boolean }>`
  all: unset;
  box-sizing: border-box;
  width: 44px;
  height: 48px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  /* Hex shape via clip-path */
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: ${({ $covered, $legacy }) =>
    $covered && !$legacy
      ? 'rgba(96, 192, 240, 0.6)'     /* Catalog video — cyan */
      : $legacy
        ? 'rgba(139, 92, 246, 0.5)'    /* Legacy video — purple */
        : 'rgba(96, 192, 240, 0.06)'}; /* Gap — dim */
  border: ${({ $selected }) =>
    $selected ? '2px solid #C6A84B' : 'none'};

  &:hover {
    transform: scale(1.3);
    z-index: 2;
    background: ${({ $covered, $legacy }) =>
      $covered && !$legacy
        ? 'rgba(96, 192, 240, 0.85)'
        : $legacy
          ? 'rgba(139, 92, 246, 0.75)'
          : 'rgba(96, 192, 240, 0.15)'};
  }

  &:focus-visible {
    outline: 2px solid var(--color-gilded-fern, #C6A84B);
    outline-offset: 2px;
  }
`;

const Tooltip = styled.div`
  position: fixed;
  z-index: 9999;
  max-width: 280px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(26, 26, 36, 0.95);
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  pointer-events: none;
`;

const TooltipName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

const TooltipMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.6;
`;

const TooltipStatus = styled.span<{ $covered: boolean }>`
  color: ${({ $covered }) => ($covered ? 'var(--color-ice-wing, #60C0F0)' : 'var(--color-wing-purple, #8B5CF6)')};
  font-weight: 600;
`;

// ─── Legend ───────────────────────────────────────────────
const Legend = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

const LegendSwatch = styled.div<{ $color: string }>`
  width: 14px;
  height: 16px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: ${({ $color }) => $color};
`;

// ─── Loading skeleton ────────────────────────────────────
const SkeletonBlock = styled.div`
  height: 200px;
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    rgba(96, 192, 240, 0.04) 25%,
    rgba(96, 192, 240, 0.1) 50%,
    rgba(96, 192, 240, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 1.5s ease-in-out infinite;
`;

const ErrorBox = styled.div`
  padding: 24px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border-left: 4px solid var(--color-crimson-frost, #C92A54);
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 12px;

  button {
    all: unset;
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: #60C0F0;
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid rgba(96, 192, 240, 0.3);
    min-height: 36px;

    &:hover { background: rgba(96, 192, 240, 0.1); }
    &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Body Part Filters
// ─────────────────────────────────────────────────────────────
const BODY_PART_FILTERS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs',
  'Core', 'Full Body', 'Cardio', 'Recovery', 'Unknown',
];

const getCoverageStatusLabel = (ex: CoverageExercise) => {
  if (ex.covered && ex.catalogVideoCount > 0) {
    return `Uploaded demo + ${ex.catalogVideoCount} catalog reference${ex.catalogVideoCount === 1 ? '' : 's'}`;
  }
  if (ex.covered) return 'Uploaded demo';
  if (ex.catalogVideoCount > 0) {
    return `${ex.catalogVideoCount} catalog reference${ex.catalogVideoCount === 1 ? '' : 's'} / upload gap`;
  }
  return 'No uploaded media';
};

const getCoverageAriaLabel = (ex: CoverageExercise) => `${ex.name}: ${getCoverageStatusLabel(ex)}`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const CrystallineCoverageTracker: React.FC = () => {
  const { authAxios } = useAuth();
  const [exercises, setExercises] = useState<CoverageExercise[]>([]);
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [byBodyPart, setByBodyPart] = useState<ByBodyPart>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [hoveredEx, setHoveredEx] = useState<CoverageExercise | null>(null);
  const [selectedEx, setSelectedEx] = useState<CoverageExercise | null>(null);
  const [showOnlyGaps, setShowOnlyGaps] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const fetchCoverage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAxios.get('/api/content-studio/coverage');
      if (res.data?.success) {
        const list: CoverageExercise[] = res.data.data.exercises;
        setExercises(list);
        setSummary(res.data.data.summary);
        setByBodyPart(res.data.data.byBodyPart);
        return list;
      }
      setError('Unexpected response format');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch coverage data';
      setError(msg);
    } finally {
      setLoading(false);
    }
    return undefined;
  }, [authAxios]);

  // Save a pinned exercise's media via the shared library endpoint, then
  // re-fetch coverage so the hex re-colors and re-pin the freshened record so
  // the editor reflects what was just saved (not a stale pre-save snapshot).
  const handleSaveMedia = useCallback(async (
    id: string | number,
    fields: { videoUrl: string | null; previewVideoUrl: string | null; thumbnailUrl: string | null },
  ) => {
    await authAxios.put(`/api/exercises/${id}/media`, fields);
    const list = await fetchCoverage();
    const updated = list?.find(e => String(e.id) === String(id));
    if (updated) setSelectedEx(updated);
  }, [authAxios, fetchCoverage]);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = exercises;
    if (filter !== 'All') {
      result = result.filter(e => e.bodyPartCategory === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.exerciseKey.toLowerCase().includes(q)
      );
    }
    if (showOnlyGaps) {
      result = result.filter(e => !e.covered);
    }
    return result;
  }, [exercises, filter, search, showOnlyGaps]);

  const filteredSummary = useMemo(() => {
    const total = filtered.length;
    const covered = filtered.filter(e => e.covered).length;
    return { total, covered, gap: total - covered, pct: total > 0 ? Math.round((covered / total) * 1000) / 10 : 0 };
  }, [filtered]);

  const handleHexHover = useCallback((ex: CoverageExercise, e: React.MouseEvent) => {
    setHoveredEx(ex);
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${e.clientX + 12}px`;
      tooltipRef.current.style.top = `${e.clientY - 10}px`;
    }
  }, []);

  const handleHexLeave = useCallback(() => {
    setHoveredEx(null);
  }, []);

  // Click PINS the detail panel; hover only previews when nothing is pinned.
  // (Was `hoveredEx || selectedEx`, which let any grazed hex overwrite the
  // clicked selection — the "random" jumping Sean noticed, and it would yank
  // the media editor's target mid-edit.)
  const activeDetailExercise = selectedEx ?? hoveredEx;

  // ─── Loading State ──────────────────────────────────────
  if (loading) {
    return (
      <Container>
        <SummaryGrid>
          {[1, 2, 3, 4].map(i => (
            <StyledBox as={SkeletonBlock} key={i} $style={{ height: 80 }} role="status" aria-live="polite" aria-label="Loading coverage data" />
          ))}
        </SummaryGrid>
        <SkeletonBlock />
      </Container>
    );
  }

  // ─── Error State ────────────────────────────────────────
  if (error) {
    return (
      <Container>
        <ErrorBox>
          <AlertTriangle size={20} color="var(--color-crimson-frost, #C92A54)" />
          <span>{error}</span>
          <button onClick={fetchCoverage}>Retry</button>
        </ErrorBox>
      </Container>
    );
  }

  return (
    <Container>
      {/* Summary Stats */}
      {summary && (
        <SummaryGrid>
          <StatCard>
            <StatValue>{summary.totalExercises}</StatValue>
            <StatLabel>Total Exercises</StatLabel>
          </StatCard>
          <StatCard $accent="rgba(96, 192, 240, 0.25)">
            <StatValue $color="#60C0F0">{summary.coveredCount}</StatValue>
            <StatLabel>Uploaded Demos</StatLabel>
          </StatCard>
          <StatCard $accent="rgba(201, 42, 84, 0.25)">
            <StatValue $color="var(--color-wing-purple, #8B5CF6)">{summary.gapCount}</StatValue>
            <StatLabel>No Uploaded Media</StatLabel>
          </StatCard>
          <StatCard $accent="rgba(139, 92, 246, 0.25)">
            <StatValue $color="#8B5CF6">{summary.coveragePercent}%</StatValue>
            <StatLabel>Coverage</StatLabel>
          </StatCard>
        </SummaryGrid>
      )}

      {/* Body Part Breakdown */}
      <BreakdownGrid>
        {Object.entries(byBodyPart)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([bp, data]) => {
            const pct = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0;
            return (
              <BreakdownItem key={bp}>
                <BreakdownLabel>{bp}</BreakdownLabel>
                <BreakdownBar>
                  <BreakdownFill $pct={pct} />
                </BreakdownBar>
                <BreakdownPct>{data.covered}/{data.total}</BreakdownPct>
              </BreakdownItem>
            );
          })}
      </BreakdownGrid>

      {/* Search + Filter */}
      <ControlRow>
        <SearchBox>
          <Search size={16} color="rgba(224, 236, 244, 0.4)" />
          <SearchInput
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </SearchBox>
        <ChipRow>
          {BODY_PART_FILTERS.map(bp => (
            <Chip key={bp} $active={filter === bp} onClick={() => setFilter(bp)}>
              {bp}
            </Chip>
          ))}
        </ChipRow>
        <GapToggle
          type="button"
          $active={showOnlyGaps}
          aria-pressed={showOnlyGaps}
          onClick={() => setShowOnlyGaps(v => !v)}
        >
          Gaps only
        </GapToggle>
      </ControlRow>

      {/* Legend */}
      <Legend>
        <LegendItem>
          <LegendSwatch $color="rgba(96, 192, 240, 0.6)" />
          Uploaded Demos
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color="rgba(139, 92, 246, 0.5)" />
          Catalog Reference
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color="rgba(96, 192, 240, 0.06)" />
          No Uploaded Media
        </LegendItem>
        <StyledBox as={LegendItem} $style={{ marginLeft: 'auto' }}>
          <Film size={14} /> {filteredSummary.total} shown / {filteredSummary.covered} uploaded / {filteredSummary.gap} gaps ({filteredSummary.pct}%)
        </StyledBox>
      </Legend>

      {/* Hexagonal Grid */}
      <HexGrid>
        {filtered.map(ex => (
          <HexCell
            type="button"
            key={ex.id}
            $covered={ex.covered}
            $legacy={!ex.covered && ex.catalogVideoCount > 0}
            $selected={activeDetailExercise?.id === ex.id}
            onClick={() => setSelectedEx(ex)}
            onFocus={() => setSelectedEx(ex)}
            onMouseEnter={e => handleHexHover(ex, e)}
            onMouseMove={e => {
              if (tooltipRef.current) {
                tooltipRef.current.style.left = `${e.clientX + 12}px`;
                tooltipRef.current.style.top = `${e.clientY - 10}px`;
              }
            }}
            onMouseLeave={handleHexLeave}
            aria-label={getCoverageAriaLabel(ex)}
            title={ex.name}
          />
        ))}
      </HexGrid>

      <CoverageExerciseMediaDetail exercise={activeDetailExercise} onSaveMedia={handleSaveMedia} />

      {/* Tooltip */}
      {hoveredEx && (
        <Tooltip ref={tooltipRef}>
          <TooltipName>{hoveredEx.name}</TooltipName>
          <TooltipMeta>
            {hoveredEx.bodyPartCategory} | {hoveredEx.exerciseType} | Diff: {hoveredEx.difficulty}/900
            <br />
            Source: {hoveredEx.source}
            <br />
            Status: <TooltipStatus $covered={hoveredEx.covered}>
              {getCoverageStatusLabel(hoveredEx)}
            </TooltipStatus>
          </TooltipMeta>
        </Tooltip>
      )}
    </Container>
  );
};

export default React.memo(CrystallineCoverageTracker);
