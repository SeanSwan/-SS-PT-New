/**
 * ImmigrationDashboard.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 1: Overview — at-a-glance progress dashboard
 * Shows progress ring, phase cards, stats, priority actions,
 * milestone countdowns, and category breakdowns.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import type { ImmigrationTask, ImmigrationDocument, StudySession } from './CanadaImmigrationTab';

/* ────────── Props ────────── */

interface Props {
  tasks: ImmigrationTask[];
  documents: ImmigrationDocument[];
  studySessions: StudySession[];
  updateTask: (id: number, updates: Partial<ImmigrationTask>) => Promise<void>;
  reload: () => Promise<void>;
}

/* ────────── Constants ────────── */

const PHASES = [
  { phase: 0, name: 'Pre-Departure', description: 'Marriage, tribal, legal docs', months: '0-3' },
  { phase: 1, name: 'Language & Certs', description: 'IELTS, TEF, AI certifications', months: '3-9' },
  { phase: 2, name: 'Express Entry', description: 'Profile, PNP, applications', months: '9-15' },
  { phase: 3, name: 'Landing & Setup', description: 'Move, settle, start career', months: '15-24' },
];

const CATEGORIES = [
  { key: 'marriage', label: 'Marriage & Legal', color: '#ef4444' },
  { key: 'tribal', label: 'Tribal/Indigenous', color: '#f97316' },
  { key: 'language', label: 'Language', color: '#60C0F0' },
  { key: 'certification', label: 'Certifications', color: '#22c55e' },
  { key: 'immigration', label: 'Immigration', color: '#8B5CF6' },
  { key: 'pt_market', label: 'PT Market Prep', color: '#06b6d4' },
];

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ringDraw = keyframes`
  from { stroke-dashoffset: 440; }
`;

/* ────────── Styled Components ────────── */

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  animation: ${fadeIn} 0.4s ease-out;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 16px;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const FullWidthCard = styled(Card)`
  grid-column: 1 / -1;
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 16px;
`;

/* ── Progress Ring ── */

const RingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const RingSVG = styled.svg`
  width: 160px;
  height: 160px;
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 120px;
    height: 120px;
  }
`;

const RingTrack = styled.circle`
  fill: none;
  stroke: rgba(96, 192, 240, 0.1);
  stroke-width: 12;
`;

const RingProgress = styled.circle<{ $pct: number }>`
  fill: none;
  stroke: url(#ringGradient);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-dasharray: 440;
  stroke-dashoffset: ${(p) => 440 - (440 * p.$pct) / 100};
  transform: rotate(-90deg);
  transform-origin: center;
  animation: ${ringDraw} 1.2s ease-out;
`;

const RingLabel = styled.text`
  fill: #E0ECF4;
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
`;

const RingStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #60C0F0;
`;

const StatLabel = styled.span`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.6);
`;

/* ── Phase Cards ── */

const PhaseRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const PhaseCard = styled.div<{ $active: boolean }>`
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 32, 96, 0.4)')};
  border: 1px solid ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.5)' : 'rgba(96, 192, 240, 0.08)')};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
  ${(p) => p.$active && 'box-shadow: 0 0 16px rgba(139, 92, 246, 0.3);'}
`;

const PhaseNumber = styled.div<{ $active: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.4)')};
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const PhaseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

const PhaseDesc = styled.div`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.5);
  margin-bottom: 8px;
`;

const PhasePct = styled.div<{ $pct: number }>`
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  font-weight: 700;
  color: ${(p) => (p.$pct >= 100 ? '#22c55e' : p.$pct > 0 ? '#60C0F0' : 'rgba(224,236,244,0.3)')};
`;

/* ── Priority Actions ── */

const ActionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ActionItem = styled.button<{ $priority: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-left: 3px solid ${(p) => (p.$priority === 'P0' ? '#ef4444' : p.$priority === 'P1' ? '#f59e0b' : '#60C0F0')};
  border-radius: 10px;
  color: #E0ECF4;
  cursor: pointer;
  text-align: left;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  transition: all 0.15s;

  &:hover {
    background: rgba(139, 92, 246, 0.12);
    border-color: rgba(139, 92, 246, 0.3);
  }
`;

const PriorityBadge = styled.span<{ $p: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${(p) => (p.$p === 'P0' ? 'rgba(239,68,68,0.2)' : p.$p === 'P1' ? 'rgba(245,158,11,0.2)' : 'rgba(96,192,240,0.2)')};
  color: ${(p) => (p.$p === 'P0' ? '#fca5a5' : p.$p === 'P1' ? '#fde68a' : '#60C0F0')};
  flex-shrink: 0;
`;

const ActionTitle = styled.span`
  flex: 1;
`;

const CheckMark = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`;

/* ── Category Breakdown ── */

const CategoryRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CategoryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CategoryLabel = styled.span`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.7);
  width: 110px;
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 80px;
    font-size: 11px;
  }
`;

const BarTrack = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(0, 32, 96, 0.6);
  border-radius: 4px;
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  border-radius: 4px;
  transition: width 0.6s ease;
`;

const BarPct = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.6);
  width: 40px;
  text-align: right;
  flex-shrink: 0;
`;

/* ── Milestone countdown ── */

const MilestoneGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const MilestoneCard = styled.div`
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(198, 168, 75, 0.15);
  border-radius: 10px;
  padding: 14px;
  text-align: center;
`;

const MilestoneDays = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 700;
  color: #C6A84B;
`;

const MilestoneName = styled.div`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.6);
  margin-top: 4px;
`;

/* ────────── Component ────────── */

const ImmigrationDashboard: React.FC<Props> = ({ tasks, documents, studySessions, updateTask }) => {
  /* ── Computed data ── */

  const completed = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const docsGathered = useMemo(
    () => documents.filter((d) => d.status === 'received' || d.status === 'completed').length,
    [documents],
  );

  const currentPhase = useMemo(() => {
    for (let p = 0; p <= 3; p++) {
      const phaseTasks = tasks.filter((t) => t.phase === p);
      const done = phaseTasks.filter((t) => t.status === 'completed').length;
      if (done < phaseTasks.length) return p;
    }
    return 3;
  }, [tasks]);

  const phasePcts = useMemo(() => {
    return [0, 1, 2, 3].map((p) => {
      const pt = tasks.filter((t) => t.phase === p);
      if (pt.length === 0) return 0;
      return Math.round((pt.filter((t) => t.status === 'completed').length / pt.length) * 100);
    });
  }, [tasks]);

  const priorityActions = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => {
        const pOrd = (p: string) => (p === 'P0' ? 0 : p === 'P1' ? 1 : p === 'P2' ? 2 : 3);
        return pOrd(a.priority) - pOrd(b.priority) || a.sortOrder - b.sortOrder;
      })
      .slice(0, 5);
  }, [tasks]);

  const categoryBreakdown = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const catTasks = tasks.filter((t) => t.category === cat.key);
      const done = catTasks.filter((t) => t.status === 'completed').length;
      const p = catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0;
      return { ...cat, done, total: catTasks.length, pct: p };
    });
  }, [tasks]);

  /* ── Milestones (rough from today) ── */

  const milestones = useMemo(() => {
    const today = new Date();
    const items = [
      { name: 'Marriage License', date: new Date(today.getFullYear(), today.getMonth() + 1, 15) },
      { name: 'IELTS Test Date', date: new Date(today.getFullYear(), today.getMonth() + 4, 1) },
      { name: 'TEF Test Date', date: new Date(today.getFullYear(), today.getMonth() + 6, 1) },
      { name: 'Express Entry Profile', date: new Date(today.getFullYear(), today.getMonth() + 9, 1) },
      { name: 'Target Landing', date: new Date(today.getFullYear() + 1, today.getMonth() + 6, 1) },
    ];
    return items.map((m) => {
      const diff = Math.max(0, Math.ceil((m.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      return { ...m, days: diff };
    });
  }, []);

  /* ── Handlers ── */

  const handleToggle = async (task: ImmigrationTask) => {
    const nextStatus =
      task.status === 'not_started'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'completed'
          : 'not_started';
    await updateTask(task.id, { status: nextStatus });
  };

  /* ── Render ── */

  return (
    <Grid>
      {/* Progress Ring + Stats */}
      <Card>
        <CardTitle>Overall Progress</CardTitle>
        <RingContainer>
          <RingSVG viewBox="0 0 160 160">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#60C0F0" />
                <stop offset="100%" stopColor="#C6A84B" />
              </linearGradient>
            </defs>
            <RingTrack cx="80" cy="80" r="70" />
            <RingProgress cx="80" cy="80" r="70" $pct={pct} />
            <RingLabel x="80" y="80">
              {pct}%
            </RingLabel>
          </RingSVG>
          <RingStats>
            <StatRow>
              <StatValue>{completed}</StatValue>
              <StatLabel>Tasks completed</StatLabel>
            </StatRow>
            <StatRow>
              <StatValue>{docsGathered}</StatValue>
              <StatLabel>Docs gathered</StatLabel>
            </StatRow>
            <StatRow>
              <StatValue>{studySessions.length}</StatValue>
              <StatLabel>Study sessions</StatLabel>
            </StatRow>
          </RingStats>
        </RingContainer>
      </Card>

      {/* Phase Indicator */}
      <Card>
        <CardTitle>Immigration Phases</CardTitle>
        <PhaseRow>
          {PHASES.map((ph, i) => (
            <PhaseCard key={ph.phase} $active={currentPhase === ph.phase}>
              <PhaseNumber $active={currentPhase === ph.phase}>Phase {ph.phase}</PhaseNumber>
              <PhaseName>{ph.name}</PhaseName>
              <PhaseDesc>{ph.description}</PhaseDesc>
              <PhasePct $pct={phasePcts[i]}>{phasePcts[i]}%</PhasePct>
            </PhaseCard>
          ))}
        </PhaseRow>
      </Card>

      {/* Priority Actions */}
      <Card>
        <CardTitle>Next Priority Actions</CardTitle>
        <ActionList>
          {priorityActions.length === 0 && (
            <StatLabel style={{ textAlign: 'center', padding: '20px 0' }}>
              All tasks completed!
            </StatLabel>
          )}
          {priorityActions.map((task) => (
            <ActionItem key={task.id} $priority={task.priority} onClick={() => handleToggle(task)}>
              <CheckMark>{task.status === 'in_progress' ? '\u{1F7E1}' : '\u2B1C'}</CheckMark>
              <PriorityBadge $p={task.priority}>{task.priority}</PriorityBadge>
              <ActionTitle>{task.title}</ActionTitle>
            </ActionItem>
          ))}
        </ActionList>
      </Card>

      {/* Milestones */}
      <Card>
        <CardTitle>Days Until Milestones</CardTitle>
        <MilestoneGrid>
          {milestones.map((m) => (
            <MilestoneCard key={m.name}>
              <MilestoneDays>{m.days}</MilestoneDays>
              <MilestoneName>{m.name}</MilestoneName>
            </MilestoneCard>
          ))}
        </MilestoneGrid>
      </Card>

      {/* Category Breakdown */}
      <FullWidthCard>
        <CardTitle>Category Breakdown</CardTitle>
        <CategoryRow>
          {categoryBreakdown.map((cat) => (
            <CategoryItem key={cat.key}>
              <CategoryLabel>{cat.label}</CategoryLabel>
              <BarTrack>
                <BarFill $pct={cat.pct} $color={cat.color} />
              </BarTrack>
              <BarPct>
                {cat.done}/{cat.total}
              </BarPct>
            </CategoryItem>
          ))}
        </CategoryRow>
      </FullWidthCard>
    </Grid>
  );
};

export default ImmigrationDashboard;
