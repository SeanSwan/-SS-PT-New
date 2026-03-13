/**
 * ImmigrationTimeline.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 7: Visual vertical timeline with 4 phase lanes,
 * task cards, today indicator, and expandable details.
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

/* ────────── Constants ────────── */

const PHASE_META = [
  { phase: 0, name: 'Phase 0: Pre-Departure', range: 'Months 0-3', color: '#ef4444' },
  { phase: 1, name: 'Phase 1: Language & Certs', range: 'Months 3-9', color: '#60C0F0' },
  { phase: 2, name: 'Phase 2: Express Entry', range: 'Months 9-15', color: '#8B5CF6' },
  { phase: 3, name: 'Phase 3: Landing & Setup', range: 'Months 15-24', color: '#C6A84B' },
];

const CAT_COLORS: Record<string, string> = {
  marriage: '#ef4444',
  tribal: '#f97316',
  language: '#60C0F0',
  certification: '#22c55e',
  immigration: '#8B5CF6',
  pt_market: '#06b6d4',
};

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 300px; }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
`;

const TimelineWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
`;

/* ── Phase Lane ── */

const PhaseLane = styled.div<{ $isCurrent: boolean; $color: string }>`
  position: relative;
  padding: 0 0 0 48px;
  margin-bottom: 8px;

  @media (max-width: 480px) {
    padding-left: 32px;
  }
`;

const PhaseConnector = styled.div<{ $color: string }>`
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: ${(p) => p.$color}44;

  @media (max-width: 480px) {
    left: 12px;
  }
`;

const PhaseNode = styled.div<{ $color: string; $isCurrent: boolean }>`
  position: absolute;
  left: 12px;
  top: 24px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  border: 3px solid ${(p) => (p.$isCurrent ? '#E0ECF4' : p.$color)};
  z-index: 2;
  ${(p) => p.$isCurrent && `animation: ${glowPulse} 2s ease-in-out infinite;`}

  @media (max-width: 480px) {
    left: 4px;
    width: 18px;
    height: 18px;
  }
`;

const PhaseHeader = styled.div<{ $isCurrent: boolean }>`
  background: ${(p) => (p.$isCurrent ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 48, 128, 0.25)')};
  border: 1px solid ${(p) => (p.$isCurrent ? 'rgba(139, 92, 246, 0.3)' : 'rgba(96, 192, 240, 0.08)')};
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 12px;
  ${(p) => p.$isCurrent && `box-shadow: 0 0 16px rgba(139, 92, 246, 0.15);`}

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const PhaseHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const PhaseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #E0ECF4;

  @media (max-width: 480px) {
    font-size: 15px;
  }
`;

const PhaseRange = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
`;

const PhaseStats = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 10px;
`;

const PhaseStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PhaseStatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #60C0F0;
`;

const PhaseStatLabel = styled.span`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.45);
`;

const PhaseProgressTrack = styled.div`
  height: 6px;
  background: rgba(0, 32, 96, 0.6);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 12px;
`;

const PhaseProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  border-radius: 3px;
  transition: width 0.5s ease;
`;

/* ── Today Marker ── */

const TodayMarker = styled.div<{ $phase: number }>`
  position: relative;
  padding: 6px 0 6px 48px;
  margin: 4px 0;

  @media (max-width: 480px) {
    padding-left: 32px;
  }
`;

const TodayLine = styled.div`
  height: 2px;
  background: linear-gradient(90deg, #8B5CF6, #60C0F0, transparent);
  border-radius: 1px;
`;

const TodayLabel = styled.span`
  position: absolute;
  left: 48px;
  top: -6px;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #8B5CF6;
  background: rgba(0, 16, 64, 0.9);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(139, 92, 246, 0.3);

  @media (max-width: 480px) {
    left: 32px;
  }
`;

/* ── Task Cards ── */

const TaskCardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
`;

const TaskCard = styled.div<{ $catColor: string; $done: boolean }>`
  background: ${(p) => (p.$done ? 'rgba(0, 32, 96, 0.2)' : 'rgba(0, 48, 128, 0.3)')};
  backdrop-filter: blur(12px);
  border: 1px solid ${(p) => (p.$done ? 'rgba(34,197,94,0.15)' : 'rgba(96, 192, 240, 0.1)')};
  border-left: 3px solid ${(p) => p.$catColor};
  border-radius: 10px;
  overflow: hidden;
  opacity: ${(p) => (p.$done ? 0.6 : 1)};
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    border-color: rgba(139, 92, 246, 0.3);
  }
`;

const TaskHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  min-height: 44px;
`;

const StatusDot = styled.div<{ $status: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${(p) =>
    p.$status === 'completed'
      ? '#22c55e'
      : p.$status === 'in_progress'
        ? '#f59e0b'
        : 'rgba(224,236,244,0.2)'};
`;

const TaskTitle = styled.span<{ $done: boolean }>`
  flex: 1;
  font-size: 13px;
  color: ${(p) => (p.$done ? 'rgba(224,236,244,0.4)' : '#E0ECF4')};
  text-decoration: ${(p) => (p.$done ? 'line-through' : 'none')};
  font-family: 'Sora', sans-serif;
`;

const TaskOwner = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(224, 236, 244, 0.08);
  color: rgba(224, 236, 244, 0.5);
  flex-shrink: 0;
`;

const TaskPriority = styled.span<{ $p: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  background: ${(p) =>
    p.$p === 'P0' ? 'rgba(239,68,68,0.2)' :
    p.$p === 'P1' ? 'rgba(245,158,11,0.2)' :
    'rgba(96,192,240,0.15)'};
  color: ${(p) =>
    p.$p === 'P0' ? '#fca5a5' :
    p.$p === 'P1' ? '#fde68a' :
    '#60C0F0'};
`;

const ExpandArrow = styled.span`
  font-size: 10px;
  color: rgba(224, 236, 244, 0.3);
  flex-shrink: 0;
`;

const TaskExpanded = styled.div`
  padding: 0 14px 14px 34px;
  animation: ${slideDown} 0.25s ease-out;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TaskDetail = styled.div`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
`;

const TaskDetailLabel = styled.span`
  color: rgba(224, 236, 244, 0.35);
  margin-right: 6px;
`;

const StatusToggle = styled.button`
  min-height: 36px;
  padding: 6px 16px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  cursor: pointer;
  align-self: flex-start;
  transition: all 0.15s;

  &:hover {
    background: rgba(139, 92, 246, 0.25);
  }
`;

const ResourceLink = styled.a`
  color: #60C0F0;
  font-size: 12px;
  text-decoration: none;
  &:hover { text-decoration: underline; color: #8B5CF6; }
`;

/* ────────── Component ────────── */

const ImmigrationTimeline: React.FC<Props> = ({ tasks, updateTask }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /* ── Compute current phase ── */
  const currentPhase = useMemo(() => {
    for (let p = 0; p <= 3; p++) {
      const pt = tasks.filter((t) => t.phase === p);
      const done = pt.filter((t) => t.status === 'completed').length;
      if (done < pt.length) return p;
    }
    return 3;
  }, [tasks]);

  /* ── Group tasks by phase ── */
  const phaseGroups = useMemo(() => {
    return PHASE_META.map((pm) => {
      const phaseTasks = tasks
        .filter((t) => t.phase === pm.phase)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const done = phaseTasks.filter((t) => t.status === 'completed').length;
      const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;
      return { ...pm, tasks: phaseTasks, done, total: phaseTasks.length, pct };
    });
  }, [tasks]);

  /* ── Handlers ── */

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const cycleStatus = async (task: ImmigrationTask) => {
    const next =
      task.status === 'not_started'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'completed'
          : 'not_started';
    await updateTask(task.id, { status: next });
  };

  const ownerLabel = (o: string) => {
    if (o === 'sean') return 'Sean';
    if (o === 'wife') return 'Wife';
    return 'Both';
  };

  return (
    <Container>
      <TimelineWrapper>
        {phaseGroups.map((pg, idx) => {
          const isCurrent = currentPhase === pg.phase;
          const showTodayAfter = isCurrent;

          return (
            <React.Fragment key={pg.phase}>
              <PhaseLane $isCurrent={isCurrent} $color={pg.color}>
                <PhaseConnector $color={pg.color} />
                <PhaseNode $color={pg.color} $isCurrent={isCurrent} />

                {/* Phase Header */}
                <PhaseHeader $isCurrent={isCurrent}>
                  <PhaseHeaderRow>
                    <PhaseName>{pg.name}</PhaseName>
                    <PhaseRange>{pg.range}</PhaseRange>
                  </PhaseHeaderRow>
                  <PhaseStats>
                    <PhaseStat>
                      <PhaseStatValue>{pg.done}</PhaseStatValue>
                      <PhaseStatLabel>Done</PhaseStatLabel>
                    </PhaseStat>
                    <PhaseStat>
                      <PhaseStatValue>{pg.total}</PhaseStatValue>
                      <PhaseStatLabel>Total</PhaseStatLabel>
                    </PhaseStat>
                    <PhaseStat>
                      <PhaseStatValue>{pg.pct}%</PhaseStatValue>
                      <PhaseStatLabel>Complete</PhaseStatLabel>
                    </PhaseStat>
                  </PhaseStats>
                  <PhaseProgressTrack>
                    <PhaseProgressFill $pct={pg.pct} $color={pg.color} />
                  </PhaseProgressTrack>
                </PhaseHeader>

                {/* Task Cards */}
                <TaskCardsList>
                  {pg.tasks.map((task) => {
                    const isExpanded = expandedId === task.id;
                    const catColor = CAT_COLORS[task.category] || '#60C0F0';

                    return (
                      <TaskCard key={task.id} $catColor={catColor} $done={task.status === 'completed'}>
                        <TaskHeader onClick={() => toggleExpand(task.id)}>
                          <StatusDot $status={task.status} />
                          <TaskTitle $done={task.status === 'completed'}>{task.title}</TaskTitle>
                          <TaskPriority $p={task.priority}>{task.priority}</TaskPriority>
                          <TaskOwner>{ownerLabel(task.owner)}</TaskOwner>
                          <ExpandArrow>{isExpanded ? '\u25B2' : '\u25BC'}</ExpandArrow>
                        </TaskHeader>

                        {isExpanded && (
                          <TaskExpanded>
                            <TaskDetail>
                              <TaskDetailLabel>Category:</TaskDetailLabel>
                              {task.category}
                            </TaskDetail>
                            {task.cost && (
                              <TaskDetail>
                                <TaskDetailLabel>Cost:</TaskDetailLabel>
                                <span style={{ color: '#C6A84B' }}>{task.cost}</span>
                              </TaskDetail>
                            )}
                            {task.dueDate && (
                              <TaskDetail>
                                <TaskDetailLabel>Due:</TaskDetailLabel>
                                {task.dueDate}
                              </TaskDetail>
                            )}
                            {task.notes && (
                              <TaskDetail>
                                <TaskDetailLabel>Notes:</TaskDetailLabel>
                                {task.notes}
                              </TaskDetail>
                            )}
                            {task.resourceUrl && (
                              <ResourceLink href={task.resourceUrl} target="_blank" rel="noopener noreferrer">
                                {task.resourceLabel || 'Open Resource'} \u2197
                              </ResourceLink>
                            )}
                            <StatusToggle onClick={() => cycleStatus(task)}>
                              {task.status === 'not_started' && 'Start Task'}
                              {task.status === 'in_progress' && 'Mark Complete'}
                              {task.status === 'completed' && 'Reset to To Do'}
                            </StatusToggle>
                          </TaskExpanded>
                        )}
                      </TaskCard>
                    );
                  })}
                </TaskCardsList>
              </PhaseLane>

              {/* Today Indicator */}
              {showTodayAfter && idx < phaseGroups.length - 1 && (
                <TodayMarker $phase={pg.phase}>
                  <TodayLabel>TODAY</TodayLabel>
                  <TodayLine />
                </TodayMarker>
              )}
            </React.Fragment>
          );
        })}
      </TimelineWrapper>
    </Container>
  );
};

export default ImmigrationTimeline;
