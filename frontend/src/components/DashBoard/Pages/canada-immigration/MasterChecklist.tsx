/**
 * MasterChecklist.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 2: Interactive master checklist with phase/owner/status
 * filters, expandable notes, category color coding, and progress
 * bars per phase.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import type { ImmigrationTask } from './CanadaImmigrationTab';

/* ────────── Props ────────── */

interface Props {
  tasks: ImmigrationTask[];
  updateTask: (id: number, updates: Partial<ImmigrationTask>) => Promise<void>;
}

/* ────────── Category Colors ────────── */

const CAT_COLORS: Record<string, string> = {
  marriage: '#ef4444',
  tribal: '#f97316',
  language: '#60C0F0',
  certification: '#22c55e',
  immigration: '#8B5CF6',
  pt_market: '#06b6d4',
};

const OWNER_LABELS: Record<string, string> = {
  sean: 'Sean',
  wife: 'Wife',
  both: 'Both',
};

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 200px; }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
`;

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
  min-height: 36px;
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
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
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
  margin-bottom: 6px;
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

const ProgressTrack = styled.div`
  height: 6px;
  background: rgba(0, 32, 96, 0.6);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: linear-gradient(90deg, #8B5CF6, #60C0F0);
  border-radius: 3px;
  transition: width 0.5s ease;
`;

/* ── Task Cards ── */

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TaskCard = styled.div<{ $catColor: string }>`
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-left: 3px solid ${(p) => p.$catColor};
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;

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

const ExpandBtn = styled.button`
  width: 36px;
  height: 36px;
  min-width: 36px;
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

  /* ── Phase progress ── */

  const phasePcts = useMemo(() => {
    return [0, 1, 2, 3].map((p) => {
      const pt = tasks.filter((t) => t.phase === p);
      if (pt.length === 0) return 0;
      return Math.round((pt.filter((t) => t.status === 'completed').length / pt.length) * 100);
    });
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

  return (
    <Container>
      {/* Filters */}
      <FiltersBar>
        <FilterGroup>
          <FilterBtn $active={phaseFilter === 'all'} onClick={() => setPhaseFilter('all')}>
            All
          </FilterBtn>
          {[0, 1, 2, 3].map((p) => (
            <FilterBtn key={p} $active={phaseFilter === p} onClick={() => setPhaseFilter(p)}>
              Phase {p}
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

      {/* Phase Progress */}
      <PhaseProgressRow>
        {[0, 1, 2, 3].map((p) => (
          <PhaseProgressCard key={p}>
            <PhaseProgressHeader>
              <PhaseLabel>Phase {p}</PhaseLabel>
              <PhasePct>{phasePcts[p]}%</PhasePct>
            </PhaseProgressHeader>
            <ProgressTrack>
              <ProgressFill $pct={phasePcts[p]} />
            </ProgressTrack>
          </PhaseProgressCard>
        ))}
      </PhaseProgressRow>

      {/* Task List */}
      <TaskList>
        {filtered.length === 0 && <EmptyState>No tasks match filters.</EmptyState>}

        {filtered.map((task) => {
          const isExpanded = expandedId === task.id;
          const catColor = CAT_COLORS[task.category] || '#60C0F0';

          return (
            <TaskCard key={task.id} $catColor={catColor}>
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
                    <Badge $bg="rgba(224,236,244,0.08)" $color="rgba(224,236,244,0.6)">
                      {OWNER_LABELS[task.owner] || task.owner}
                    </Badge>
                    {task.cost && <CostTag>{task.cost}</CostTag>}
                  </BadgeRow>
                </TaskInfo>

                <ExpandBtn onClick={() => toggleExpand(task.id)}>
                  {isExpanded ? '\u25B2' : '\u25BC'}
                </ExpandBtn>
              </TaskHeader>

              {isExpanded && (
                <TaskExpanded>
                  <div>
                    <label style={{ fontSize: '12px', color: 'rgba(224,236,244,0.5)', marginBottom: 4, display: 'block' }}>
                      Notes
                    </label>
                    <NotesTextarea
                      value={notesDraft[task.id] ?? task.notes ?? ''}
                      onChange={(e) => setNotesDraft((d) => ({ ...d, [task.id]: e.target.value }))}
                      onBlur={() => saveNotes(task.id)}
                      placeholder="Add notes..."
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'rgba(224,236,244,0.5)', marginBottom: 4, display: 'block' }}>
                      Due Date
                    </label>
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
