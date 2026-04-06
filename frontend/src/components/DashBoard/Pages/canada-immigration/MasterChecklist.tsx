/**
 * MasterChecklist.tsx  v2.0
 * ──────────────────────────────────────────────────────────────────
 * Module 2: Interactive master checklist with phase/owner/status
 * filters, expandable notes, category color coding, cost tracking,
 * critical-path indicators, and progress bars per phase (0-4).
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { ImmigrationTask } from './CanadaImmigrationTab';

/* ────────── Props ────────── */

interface Props {
  tasks: ImmigrationTask[];
  updateTask: (id: number, updates: Partial<ImmigrationTask>) => Promise<void>;
}

/* ────────── Phase Meta ────────── */

const PHASE_META: Record<number, { label: string; months: string; color: string }> = {
  0: { label: 'Immediate Actions',   months: 'This Week',    color: '#ef4444' },
  1: { label: 'Foundation',          months: 'Months 1-3',   color: '#8B5CF6' },
  2: { label: 'Applications',        months: 'Months 4-6',   color: '#60C0F0' },
  3: { label: 'Transition',          months: 'Months 7-12',  color: '#C6A84B' },
  4: { label: 'Permanent Residency', months: 'Months 13-24', color: '#22C55E' },
};

const PHASE_KEYS = [0, 1, 2, 3, 4] as const;

/* ────────── Category Colors ────────── */

const CAT_COLORS: Record<string, string> = {
  marriage:       '#ef4444',
  tribal:         '#f97316',
  language:       '#60C0F0',
  certification:  '#22c55e',
  immigration:    '#8B5CF6',
  pt_market:      '#06b6d4',
  family:         '#22C55E',
};

/* ────────── Owner Config ────────── */

const OWNER_LABELS: Record<string, string> = {
  sean: 'Spouse A',
  wife: 'Spouse B',
  both: 'Both',
};

const OWNER_COLORS: Record<string, string> = {
  sean: '#60C0F0',
  wife: '#E879F9',
  both: '#8B5CF6',
};

/* ────────── Helpers ────────── */

/** Parse a cost string like "$2,500" or "$150" into a number. Returns 0 on failure. */
function parseCost(cost: string | null | undefined): number {
  if (!cost) return 0;
  const cleaned = cost.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/** Format a number as $X,XXX */
function fmtCost(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 300px; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  50% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.25); }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
`;

/* ── Summary Bar ── */

const SummaryBar = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 20px;
`;

const SummaryHeadline = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
  margin-bottom: 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`;

const SummaryNumber = styled.span`
  font-family: 'Fira Code', monospace;
  color: #C6A84B;
`;

const SummaryDim = styled.span`
  color: rgba(224, 236, 244, 0.5);
`;

const MiniProgressRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 375px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MiniPhaseItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MiniPhaseLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MiniTrack = styled.div`
  height: 4px;
  background: rgba(0, 32, 96, 0.6);
  border-radius: 2px;
  overflow: hidden;
`;

const MiniFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  border-radius: 2px;
  transition: width 0.5s ease;
`;

/* ── Filters ── */

const FiltersBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(0, 32, 96, 0.4);
  border-radius: 10px;
  padding: 4px;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.15s;
  color: ${(p) => (p.$active ? '#E0ECF4' : 'rgba(224,236,244,0.5)')};
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.3)' : 'transparent')};

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: #E0ECF4;
  }
`;

/* ── Phase Progress ── */

const PhaseProgressRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 375px) {
    grid-template-columns: 1fr;
  }
`;

const PhaseProgressCard = styled.div`
  background: rgba(0, 48, 128, 0.25);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 10px;
  padding: 12px;
`;

const PhaseProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const PhaseLabel = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: rgba(224, 236, 244, 0.7);
`;

const PhasePct = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #60C0F0;
`;

const PhaseSubline = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: rgba(224, 236, 244, 0.4);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PhaseCostHighlight = styled.span`
  color: #C6A84B;
`;

const ProgressTrack = styled.div`
  height: 6px;
  background: rgba(0, 32, 96, 0.6);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number; $color?: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color || 'linear-gradient(90deg, #8B5CF6, #60C0F0)'};
  border-radius: 3px;
  transition: width 0.5s ease;
`;

/* ── Task Cards ── */

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const blockingBorderPulse = css`
  border-left: 3px solid #ef4444;
  animation: ${pulseGlow} 2.5s ease-in-out infinite;
`;

const TaskCard = styled.div<{ $catColor: string; $blocking: boolean }>`
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-left: 3px solid ${(p) => p.$catColor};
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
  position: relative;

  ${(p) => p.$blocking && blockingBorderPulse}

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
  }
`;

const TaskHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  min-height: 48px;

  @media (max-width: 480px) {
    gap: 8px;
    padding: 12px;
  }
`;

const Checkbox = styled.button<{ $status: string }>`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 6px;
  border: 2px solid ${(p) =>
    p.$status === 'completed'
      ? '#22c55e'
      : p.$status === 'in_progress'
        ? '#f59e0b'
        : 'rgba(224,236,244,0.3)'};
  background: ${(p) =>
    p.$status === 'completed'
      ? 'rgba(34,197,94,0.2)'
      : p.$status === 'in_progress'
        ? 'rgba(245,158,11,0.15)'
        : 'transparent'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #E0ECF4;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    border-color: #8B5CF6;
    background: rgba(139, 92, 246, 0.15);
  }
`;

const TaskInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskTitle = styled.div<{ $done: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: ${(p) => (p.$done ? 'rgba(224,236,244,0.4)' : '#E0ECF4')};
  text-decoration: ${(p) => (p.$done ? 'line-through' : 'none')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 480px) {
    font-size: 13px;
    white-space: normal;
  }
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  align-items: center;
`;

const Badge = styled.span<{ $bg: string; $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  white-space: nowrap;
`;

const BlockingBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const OwnerBadge = styled.span<{ $ownerColor: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${(p) => `${p.$ownerColor}18`};
  color: ${(p) => p.$ownerColor};
  white-space: nowrap;
`;

const ExpandBtn = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.5);
  color: rgba(224, 236, 244, 0.5);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    color: #E0ECF4;
  }
`;

const TaskExpanded = styled.div`
  padding: 0 16px 16px 56px;
  animation: ${slideDown} 0.25s ease-out;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 0 12px 12px;
  }
`;

const BlockingNote = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 6px;
  padding: 8px 12px;
  line-height: 1.5;
`;

const FieldLabel = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
  margin-bottom: 4px;
  display: block;
`;

const NotesTextarea = styled.textarea`
  width: 100%;
  min-height: 60px;
  padding: 10px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
  }
`;

const DueDateInput = styled.input`
  padding: 8px 12px;
  min-height: 44px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  width: 200px;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }
`;

const ResourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #60C0F0;
  font-size: 13px;
  text-decoration: none;
  min-height: 44px;

  &:hover {
    color: #8B5CF6;
    text-decoration: underline;
  }
`;

const CostTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #C6A84B;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: rgba(224, 236, 244, 0.4);
  font-size: 14px;
`;

/* ────────── Component ────────── */

const MasterChecklist: React.FC<Props> = ({ tasks, updateTask }) => {
  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

  /* ── Filtered list ── */

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => phaseFilter === 'all' || t.phase === phaseFilter)
      .filter((t) => ownerFilter === 'all' || t.owner === ownerFilter)
      .filter((t) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'todo') return t.status === 'not_started';
        if (statusFilter === 'in_progress') return t.status === 'in_progress';
        if (statusFilter === 'done') return t.status === 'completed';
        return true;
      })
      .sort((a, b) => a.phase - b.phase || a.sortOrder - b.sortOrder);
  }, [tasks, phaseFilter, ownerFilter, statusFilter]);

  /* ── Phase stats (pct + cost) ── */

  const phaseStats = useMemo(() => {
    return PHASE_KEYS.map((p) => {
      const pt = tasks.filter((t) => t.phase === p);
      const done = pt.filter((t) => t.status === 'completed');
      const pct = pt.length === 0 ? 0 : Math.round((done.length / pt.length) * 100);
      const totalCost = pt.reduce((sum, t) => sum + parseCost(t.cost), 0);
      const spentCost = done.reduce((sum, t) => sum + parseCost(t.cost), 0);
      return { phase: p, total: pt.length, completed: done.length, pct, totalCost, spentCost };
    });
  }, [tasks]);

  /* ── Overall summary ── */

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const totalCost = tasks.reduce((sum, t) => sum + parseCost(t.cost), 0);
    const spentCost = tasks
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + parseCost(t.cost), 0);
    return { total, completed, pct, totalCost, spentCost };
  }, [tasks]);

  /* ── Handlers ── */

  const cycleStatus = async (task: ImmigrationTask) => {
    const next =
      task.status === 'not_started'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'completed'
          : 'not_started';
    await updateTask(task.id, { status: next });
  };

  const saveNotes = async (taskId: number) => {
    if (notesDraft[taskId] !== undefined) {
      await updateTask(taskId, { notes: notesDraft[taskId] });
    }
  };

  const saveDueDate = async (taskId: number, date: string) => {
    await updateTask(taskId, { dueDate: date || null });
  };

  const toggleExpand = (taskId: number) => {
    if (expandedId === taskId) {
      saveNotes(taskId);
      setExpandedId(null);
    } else {
      if (expandedId !== null) saveNotes(expandedId);
      const task = tasks.find((t) => t.id === taskId);
      if (task) setNotesDraft((d) => ({ ...d, [taskId]: task.notes || '' }));
      setExpandedId(taskId);
    }
  };

  const statusIcon = (s: string) => {
    if (s === 'completed') return '\u2705';
    if (s === 'in_progress') return '\u{1F7E1}';
    return '';
  };

  const isBlocking = (task: ImmigrationTask) =>
    task.priority === 'P0' && task.status !== 'completed';

  return (
    <Container>
      {/* ── Top Summary ── */}
      <SummaryBar>
        <SummaryHeadline>
          <SummaryNumber>{summary.completed}</SummaryNumber>
          <SummaryDim>of</SummaryDim>
          <SummaryNumber>{summary.total}</SummaryNumber>
          <SummaryDim>tasks complete</SummaryDim>
          <SummaryDim>({summary.pct}%)</SummaryDim>
          <SummaryDim>|</SummaryDim>
          <SummaryNumber>{fmtCost(summary.spentCost)}</SummaryNumber>
          <SummaryDim>of</SummaryDim>
          <SummaryNumber>{fmtCost(summary.totalCost)}</SummaryNumber>
          <SummaryDim>spent</SummaryDim>
        </SummaryHeadline>

        <MiniProgressRow>
          {phaseStats.map((ps) => (
            <MiniPhaseItem key={ps.phase}>
              <MiniPhaseLabel>P{ps.phase} {PHASE_META[ps.phase]?.label}</MiniPhaseLabel>
              <MiniTrack>
                <MiniFill $pct={ps.pct} $color={PHASE_META[ps.phase]?.color || '#8B5CF6'} />
              </MiniTrack>
            </MiniPhaseItem>
          ))}
        </MiniProgressRow>
      </SummaryBar>

      {/* ── Filters ── */}
      <FiltersBar>
        <FilterGroup>
          <FilterBtn $active={phaseFilter === 'all'} onClick={() => setPhaseFilter('all')}>
            All
          </FilterBtn>
          {PHASE_KEYS.map((p) => (
            <FilterBtn key={p} $active={phaseFilter === p} onClick={() => setPhaseFilter(p)}>
              P{p}
            </FilterBtn>
          ))}
        </FilterGroup>

        <FilterGroup>
          <FilterBtn $active={ownerFilter === 'all'} onClick={() => setOwnerFilter('all')}>
            All
          </FilterBtn>
          {['sean', 'wife', 'both'].map((o) => (
            <FilterBtn key={o} $active={ownerFilter === o} onClick={() => setOwnerFilter(o)}>
              {OWNER_LABELS[o]}
            </FilterBtn>
          ))}
        </FilterGroup>

        <FilterGroup>
          <FilterBtn $active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            All
          </FilterBtn>
          <FilterBtn $active={statusFilter === 'todo'} onClick={() => setStatusFilter('todo')}>
            To Do
          </FilterBtn>
          <FilterBtn $active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')}>
            In Progress
          </FilterBtn>
          <FilterBtn $active={statusFilter === 'done'} onClick={() => setStatusFilter('done')}>
            Done
          </FilterBtn>
        </FilterGroup>
      </FiltersBar>

      {/* ── Phase Progress Cards ── */}
      <PhaseProgressRow>
        {phaseStats.map((ps) => {
          const meta = PHASE_META[ps.phase];
          return (
            <PhaseProgressCard key={ps.phase}>
              <PhaseProgressHeader>
                <PhaseLabel>Phase {ps.phase}: {meta?.label}</PhaseLabel>
                <PhasePct>{ps.pct}%</PhasePct>
              </PhaseProgressHeader>
              <PhaseSubline>
                {ps.completed}/{ps.total} tasks |{' '}
                <PhaseCostHighlight>{fmtCost(ps.spentCost)}</PhaseCostHighlight>
                {' / '}
                <PhaseCostHighlight>{fmtCost(ps.totalCost)}</PhaseCostHighlight>
              </PhaseSubline>
              <ProgressTrack>
                <ProgressFill $pct={ps.pct} $color={meta?.color} />
              </ProgressTrack>
            </PhaseProgressCard>
          );
        })}
      </PhaseProgressRow>

      {/* ── Task List ── */}
      <TaskList>
        {filtered.length === 0 && <EmptyState>No tasks match filters.</EmptyState>}

        {filtered.map((task) => {
          const isExpanded = expandedId === task.id;
          const catColor = CAT_COLORS[task.category] || '#60C0F0';
          const blocking = isBlocking(task);
          const ownerColor = OWNER_COLORS[task.owner] || 'rgba(224,236,244,0.6)';

          return (
            <TaskCard key={task.id} $catColor={blocking ? '#ef4444' : catColor} $blocking={blocking}>
              <TaskHeader>
                <Checkbox $status={task.status} onClick={() => cycleStatus(task)}>
                  {statusIcon(task.status)}
                </Checkbox>

                <TaskInfo onClick={() => toggleExpand(task.id)}>
                  <TaskTitle $done={task.status === 'completed'}>{task.title}</TaskTitle>
                  <BadgeRow>
                    <Badge $bg="rgba(96,192,240,0.15)" $color="#60C0F0">
                      P{task.phase}
                    </Badge>
                    <Badge
                      $bg={
                        task.priority === 'P0'
                          ? 'rgba(239,68,68,0.2)'
                          : task.priority === 'P1'
                            ? 'rgba(245,158,11,0.2)'
                            : 'rgba(96,192,240,0.15)'
                      }
                      $color={
                        task.priority === 'P0'
                          ? '#fca5a5'
                          : task.priority === 'P1'
                            ? '#fde68a'
                            : '#60C0F0'
                      }
                    >
                      {task.priority}
                    </Badge>
                    <Badge
                      $bg={`${catColor}22`}
                      $color={catColor}
                    >
                      {task.category}
                    </Badge>
                    <OwnerBadge $ownerColor={ownerColor}>
                      {OWNER_LABELS[task.owner] || task.owner}
                    </OwnerBadge>
                    {task.cost && <CostTag>{task.cost}</CostTag>}
                    {blocking && <BlockingBadge>BLOCKING</BlockingBadge>}
                  </BadgeRow>
                </TaskInfo>

                <ExpandBtn onClick={() => toggleExpand(task.id)}>
                  {isExpanded ? '\u25B2' : '\u25BC'}
                </ExpandBtn>
              </TaskHeader>

              {isExpanded && (
                <TaskExpanded>
                  {blocking && (
                    <BlockingNote>
                      This task is P0 priority and blocks progress to the next phase. Complete it before moving on.
                    </BlockingNote>
                  )}

                  <div>
                    <FieldLabel>Notes</FieldLabel>
                    <NotesTextarea
                      value={notesDraft[task.id] ?? task.notes ?? ''}
                      onChange={(e) => setNotesDraft((d) => ({ ...d, [task.id]: e.target.value }))}
                      onBlur={() => saveNotes(task.id)}
                      placeholder="Add notes..."
                    />
                  </div>

                  <div>
                    <FieldLabel>Due Date</FieldLabel>
                    <DueDateInput
                      type="date"
                      value={task.dueDate || ''}
                      onChange={(e) => saveDueDate(task.id, e.target.value)}
                    />
                  </div>

                  {task.resourceUrl && (
                    <ResourceLink href={task.resourceUrl} target="_blank" rel="noopener noreferrer">
                      {'\u{1F517}'} {task.resourceLabel || 'Open Resource'}
                    </ResourceLink>
                  )}
                </TaskExpanded>
              )}
            </TaskCard>
          );
        })}
      </TaskList>
    </Container>
  );
};

export default MasterChecklist;
