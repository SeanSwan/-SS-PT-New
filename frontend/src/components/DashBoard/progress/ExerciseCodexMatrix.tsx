/**
 * COMPONENT: ExerciseCodexMatrix
 * PURPOSE: Overwatch-style exercise history map across the full workout Rolodex.
 * DATA: logged exercise frequency + client-safe /api/exercises/library payload.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Grid3X3, Trophy } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  buildExerciseCodexMatrix,
  extractExerciseCatalogPayload,
  type ExerciseCodexCatalogEntry,
  type ExerciseCodexLoggedPoint,
  type ExerciseCodexStatus,
} from './ExerciseCodexMatrix.logic';
import {
  BarFill,
  BarList,
  BarRow,
  BarTrack,
  CodexBoard,
  CodexHeader,
  Controls,
  DetailGrid,
  Eyebrow,
  FilterButton,
  FilterRow,
  MatrixCell,
  MatrixCells,
  MatrixHeader,
  MatrixShell,
  MetaPill,
  MutedText,
  Panel,
  PanelTitle,
  PriorityItem,
  PriorityList,
  SearchInput,
  StatGrid,
  StatLabel,
  StatTile,
  StatValue,
  StatusBadge,
  Title,
  TitleBlock,
} from './ExerciseCodexMatrix.styles';

interface ExerciseCodexMatrixProps {
  loggedExercises: ExerciseCodexLoggedPoint[];
}

type StatusFilter = 'all' | ExerciseCodexStatus;

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mastered', label: 'Mastered' },
  { id: 'trained', label: 'Trained' },
  { id: 'sampled', label: 'Sampled' },
  { id: 'untrained', label: 'Untouched' },
];

const formatNumber = (value: number): string => new Intl.NumberFormat('en-US').format(value);

const ExerciseCodexMatrix: React.FC<ExerciseCodexMatrixProps> = ({ loggedExercises }) => {
  const { authAxios } = useAuth();
  const [catalog, setCatalog] = useState<ExerciseCodexCatalogEntry[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let isActive = true;

    if (!authAxios) {
      setCatalog([]);
      setIsCatalogLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsCatalogLoading(true);
    setCatalogError(null);

    authAxios.get('/api/exercises/library')
      .then((response) => {
        if (!isActive) return;
        setCatalog(extractExerciseCatalogPayload(response?.data));
      })
      .catch(() => {
        if (!isActive) return;
        setCatalog([]);
        setCatalogError('Rolodex unavailable - showing logged exercises only');
      })
      .finally(() => {
        if (isActive) setIsCatalogLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authAxios]);

  const matrix = useMemo(
    () => buildExerciseCodexMatrix(catalog, loggedExercises),
    [catalog, loggedExercises]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return matrix.rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;
      return [row.name, row.exerciseType, row.bodyPartCategory, row.pattern]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [matrix.rows, query, statusFilter]);

  return (
    <CodexBoard aria-label="Exercise Codex Matrix" data-testid="exercise-codex-matrix">
      <CodexHeader>
        <TitleBlock>
          <Eyebrow>
            <Grid3X3 size={14} />
            Exercise Codex Matrix
          </Eyebrow>
          <Title>Full Rolodex coverage: trained, sampled, and untouched movements</Title>
        </TitleBlock>
        <MetaPill>
          <Dumbbell size={14} />
          {isCatalogLoading ? 'Loading Rolodex' : `${formatNumber(matrix.summary.totalExercises)} exercises`}
        </MetaPill>
      </CodexHeader>

      <StatGrid aria-label="Exercise Codex summary">
        <StatTile>
          <StatValue>{matrix.summary.coveragePct}%</StatValue>
          <StatLabel>Rolodex coverage</StatLabel>
        </StatTile>
        <StatTile>
          <StatValue>{formatNumber(matrix.summary.loggedExercises)}</StatValue>
          <StatLabel>Exercises trained</StatLabel>
        </StatTile>
        <StatTile>
          <StatValue>{formatNumber(matrix.summary.untrainedExercises)}</StatValue>
          <StatLabel>Untouched options</StatLabel>
        </StatTile>
        <StatTile>
          <StatValue>{formatNumber(matrix.summary.totalSets)}</StatValue>
          <StatLabel>All-time sets</StatLabel>
        </StatTile>
      </StatGrid>

      <Controls>
        <SearchInput
          aria-label="Search Exercise Codex Matrix"
          placeholder="Search movement, muscle, pattern, or category"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <FilterRow aria-label="Exercise status filters">
          {FILTERS.map((filter) => (
            <FilterButton
              key={filter.id}
              type="button"
              $active={filter.id === statusFilter}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </FilterButton>
          ))}
        </FilterRow>
      </Controls>

      <MatrixShell>
        <MatrixHeader>
          <span>{formatNumber(filteredRows.length)} visible</span>
          <span>{catalogError ?? 'Each cell is one Rolodex exercise'}</span>
        </MatrixHeader>
        <MatrixCells aria-label="Dense exercise coverage heatmap">
          {filteredRows.map((row) => (
            <MatrixCell
              key={row.id}
              $status={row.status}
              $intensity={row.intensityPct}
              title={`${row.name}: ${row.status}, ${row.sessions} sessions, ${row.sets} sets`}
            />
          ))}
        </MatrixCells>
      </MatrixShell>

      <DetailGrid>
        <Panel>
          <PanelTitle>Coverage by body part</PanelTitle>
          <BarList>
            {matrix.summary.bodyPartCoverage.map((group) => (
              <BarRow key={group.label}>
                <span>{group.label}</span>
                <BarTrack><BarFill $pct={group.pct} /></BarTrack>
                <MutedText>{group.trained}/{group.total}</MutedText>
              </BarRow>
            ))}
          </BarList>
        </Panel>
        <Panel>
          <PanelTitle>Next smart targets</PanelTitle>
          <PriorityList>
            {matrix.summary.nextTargets.length === 0 ? (
              <PriorityItem>
                <Trophy size={15} />
                <span>Every listed movement has been touched</span>
                <MutedText>0 gaps</MutedText>
              </PriorityItem>
            ) : matrix.summary.nextTargets.map((row) => (
              <PriorityItem key={row.id}>
                <StatusBadge $status={row.status} />
                <span>{row.name}</span>
                <MutedText>{row.bodyPartCategory}</MutedText>
              </PriorityItem>
            ))}
          </PriorityList>
        </Panel>
      </DetailGrid>

      <DetailGrid>
        <Panel>
          <PanelTitle>Pattern balance</PanelTitle>
          <BarList>
            {matrix.summary.patternCoverage.map((group) => (
              <BarRow key={group.label}>
                <span>{group.label}</span>
                <BarTrack><BarFill $pct={group.pct} /></BarTrack>
                <MutedText>{group.pct}%</MutedText>
              </BarRow>
            ))}
          </BarList>
        </Panel>
        <Panel>
          <PanelTitle>Difficulty ladder</PanelTitle>
          <BarList>
            {matrix.summary.difficultyBands.map((group) => (
              <BarRow key={group.label}>
                <span>{group.label}</span>
                <BarTrack><BarFill $pct={group.pct} /></BarTrack>
                <MutedText>{group.trained}/{group.total}</MutedText>
              </BarRow>
            ))}
          </BarList>
        </Panel>
      </DetailGrid>
    </CodexBoard>
  );
};

export default React.memo(ExerciseCodexMatrix);
