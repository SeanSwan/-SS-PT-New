/**
 * ImmigrationTimeline.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 7 v2.0: Visual vertical timeline with 5 phase lanes,
 * 12-month scorecard toggle, family milestone markers,
 * cost accumulation bars, and enhanced TODAY indicator.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Award,
  Heart,
  Home,
  GraduationCap,
  Plane,
  Users,
  Calendar,
  LayoutGrid,
} from 'lucide-react';
import type { ImmigrationTask } from './CanadaImmigrationTab';

/* ────────── Props ────────── */



/* Also accept legacy props from parent spread */
interface Props {
  tasks: ImmigrationTask[];
  updateTask?: (id: number, updates: Partial<ImmigrationTask>) => Promise<void>;
  onToggleTask?: (id: number) => void;
  [key: string]: any;
}

/* ────────── Constants ────────── */

const PHASE_META = [
  { phase: 0, name: 'Phase 0: Immediate Actions',   range: 'This Week',    color: '#ef4444' },
  { phase: 1, name: 'Phase 1: Foundation',           range: 'Months 1-3',   color: '#8B5CF6' },
  { phase: 2, name: 'Phase 2: Applications',         range: 'Months 4-6',   color: '#60C0F0' },
  { phase: 3, name: 'Phase 3: Transition',           range: 'Months 7-12',  color: '#C6A84B' },
  { phase: 4, name: 'Phase 4: Permanent Residency',  range: 'Months 13-24', color: '#22C55E' },
];

const CAT_COLORS: Record<string, string> = {
  marriage:       '#ef4444',
  tribal:         '#f97316',
  language:       '#60C0F0',
  certification:  '#22c55e',
  immigration:    '#8B5CF6',
  pt_market:      '#06b6d4',
};

/* ── Family Milestones ── */

interface FamilyMilestone {
  label: string;
  phase: number;
  icon: 'heart' | 'home' | 'graduation' | 'plane' | 'users';
}

const FAMILY_MILESTONES: FamilyMilestone[] = [
  { label: 'Spouse B accepted to MEd',        phase: 3, icon: 'graduation' },
  { label: 'Family moves to Canada',      phase: 3, icon: 'plane' },
  { label: 'Kids start school',           phase: 3, icon: 'users' },
  { label: 'Grandma arrives on Super Visa', phase: 3, icon: 'heart' },
  { label: 'Spouse B graduates MEd',          phase: 4, icon: 'graduation' },
  { label: 'PR application submitted',    phase: 4, icon: 'home' },
];

const MILESTONE_ICONS = {
  heart:      Heart,
  home:       Home,
  graduation: GraduationCap,
  plane:      Plane,
  users:      Users,
};

/* ── 12-Month Scorecard ── */

const MONTH_DATA = [
  { month: 1,  text: 'Get married, CDIB app, book IELTS' },
  { month: 2,  text: 'Take IELTS, submit wife\'s ECA' },
  { month: 3,  text: 'Express Entry profile, research MEd programs' },
  { month: 4,  text: 'Wife applies to MEd programs, Ontario HCP backup' },
  { month: 5,  text: 'iTalki French tutoring, Chickasaw citizenship' },
  { month: 6,  text: 'Azure AI-102 exam, document PT business' },
  { month: 7,  text: 'Wife accepted — apply study permit + spousal OWP' },
  { month: 8,  text: 'Family applications submitted together' },
  { month: 9,  text: 'MOVE TO CANADA — wife starts classes, kids in school' },
  { month: 10, text: 'Start training clients in target neighborhoods' },
  { month: 11, text: 'Book TEF Canada exam, intensive French prep' },
  { month: 12, text: 'Take TEF, update Express Entry (+50 CRS), apply French draws' },
];

/* ── Cost parsing helper ── */

function parseCost(costStr: string | null): number {
  if (!costStr) return 0;
  const match = costStr.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
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

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
`;

const todayGlow = keyframes`
  0%, 100% { box-shadow: 0 0 12px rgba(139, 92, 246, 0.4), 0 0 24px rgba(96, 192, 240, 0.2); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.7), 0 0 40px rgba(96, 192, 240, 0.4); }
`;

const scorecardPulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 14px rgba(139, 92, 246, 0.6); }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  animation: ${css`${fadeIn}`} 0.4s ease-out;
`;

/* ── View Toggle ── */

const ViewToggleBar = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  width: fit-content;
`;

const ViewToggleBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 20px;
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.2)' : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.35)' : 'transparent')};
  border-radius: 8px;
  color: ${(p) => (p.$active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.5)')};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.12);
    color: #E0ECF4;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

/* ── Scorecard ── */

const ScorecardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  animation: ${css`${fadeIn}`} 0.4s ease-out;

  @media (min-width: 768px)  { grid-template-columns: repeat(4, 1fr); }
  @media (min-width: 1024px) { grid-template-columns: repeat(6, 1fr); }
  @media (min-width: 1440px) { grid-template-columns: repeat(12, 1fr); }
`;

const ScorecardCell = styled.div<{ $status: 'complete' | 'active' | 'pending' }>`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid ${(p) =>
    p.$status === 'complete' ? 'rgba(96, 192, 240, 0.25)' :
    p.$status === 'active' ? 'rgba(139, 92, 246, 0.35)' :
    'rgba(96, 192, 240, 0.08)'};
  border-radius: 12px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;
  ${(p) => p.$status === 'active' && css`animation: ${scorecardPulse} 2.5s ease-in-out infinite;`}

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
  }
`;

const ScorecardMonth = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #C6A84B;
`;

const ScorecardText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(224, 236, 244, 0.65);
`;

const ScorecardDot = styled.div<{ $status: 'complete' | 'active' | 'pending' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  align-self: flex-end;
  background: ${(p) =>
    p.$status === 'complete' ? '#60C0F0' :
    p.$status === 'active' ? '#8B5CF6' :
    'rgba(224, 236, 244, 0.15)'};
  ${(p) => p.$status === 'active' && css`box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);`}
`;

/* ── Timeline ── */

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
  ${(p) => p.$isCurrent && css`animation: ${glowPulse} 2s ease-in-out infinite;`}

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

/* ── Cost Bar ── */

const CostBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 6px 10px;
  background: rgba(198, 168, 75, 0.06);
  border: 1px solid rgba(198, 168, 75, 0.12);
  border-radius: 8px;
`;

const CostBarLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: rgba(224, 236, 244, 0.4);
`;

const CostBarValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #C6A84B;
`;

const CostBarTrack = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(198, 168, 75, 0.1);
  border-radius: 2px;
  overflow: hidden;
`;

const CostBarFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${(p) => Math.min(p.$pct, 100)}%;
  background: linear-gradient(90deg, #C6A84B, #e0c878);
  border-radius: 2px;
  transition: width 0.5s ease;
`;

/* ── Today Marker (Enhanced) ── */

const TodayMarker = styled.div`
  position: relative;
  padding: 10px 0 10px 48px;
  margin: 8px 0;

  @media (max-width: 480px) {
    padding-left: 32px;
  }
`;

const TodayLine = styled.div`
  height: 3px;
  background: linear-gradient(90deg, #8B5CF6, #60C0F0, transparent);
  border-radius: 2px;
`;

const TodayBadge = styled.div`
  position: absolute;
  left: 48px;
  top: -8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #E0ECF4;
  background: rgba(0, 16, 64, 0.95);
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.4);
  animation: ${css`${todayGlow}`} 3s ease-in-out infinite;
  z-index: 5;

  @media (max-width: 480px) {
    left: 32px;
    font-size: 10px;
    padding: 4px 10px;
    flex-wrap: wrap;
  }
`;

const TodayText = styled.span`
  color: #8B5CF6;
  font-weight: 800;
  letter-spacing: 0.5px;
`;

const TodayDate = styled.span`
  color: #60C0F0;
`;

const TodayCountdown = styled.span`
  color: #C6A84B;
  font-size: 10px;
`;

/* ── Family Milestone Marker ── */

const FamilyMarker = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin: 4px 0;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-left: 3px solid #22C55E;
  border-radius: 10px;
  animation: ${css`${fadeIn}`} 0.3s ease-out;
`;

const FamilyMarkerIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
    color: #22C55E;
  }
`;

const FamilyMarkerLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #22C55E;
`;

const FamilyMarkerTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  padding: 2px 6px;
  background: rgba(34, 197, 94, 0.12);
  border-radius: 4px;
  color: rgba(34, 197, 94, 0.7);
  margin-left: auto;
  flex-shrink: 0;
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

const TaskHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: transparent;
  cursor: pointer;
  min-height: 44px;
  text-align: left;
`;

const PhaseAwardIcon = styled(Award)`
  width: 18px;
  height: 18px;
  vertical-align: middle;
  margin-right: 6px;
  color: #22C55E;
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
  animation: ${css`${slideDown}`} 0.25s ease-out;
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

const CostAmount = styled.span`
  color: #C6A84B;
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

const ImmigrationTimeline: React.FC<Props> = ({ tasks, updateTask, onToggleTask }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'scorecard'>('timeline');
  const [activeMonth] = useState<number>(() => {
    /* Default active month: rough calc from a Phase 0 start ~March 2026 */
    const start = new Date(2026, 2, 1); // March 2026
    const now = new Date();
    const diff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    return Math.max(1, Math.min(12, diff));
  });

  /* ── Compute current phase ── */
  const currentPhase = useMemo(() => {
    for (let p = 0; p <= 4; p++) {
      const pt = tasks.filter((t) => t.phase === p);
      if (pt.length === 0) continue;
      const done = pt.filter((t) => t.status === 'completed').length;
      if (done < pt.length) return p;
    }
    return 4;
  }, [tasks]);

  /* ── Group tasks by phase ── */
  const phaseGroups = useMemo(() => {
    return PHASE_META.map((pm) => {
      const phaseTasks = tasks
        .filter((t) => t.phase === pm.phase)
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const done = phaseTasks.filter((t: any) => t.status === 'completed').length;
      const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;
      const totalCost = phaseTasks.reduce((sum: number, t: any) => sum + parseCost(t.cost), 0);
      return { ...pm, tasks: phaseTasks, done, total: phaseTasks.length, pct, totalCost };
    });
  }, [tasks]);

  /* ── Total cost across all phases ── */
  useMemo(() => {
    return tasks.reduce((sum: number, t: any) => sum + parseCost(t.cost), 0);
  }, [tasks]);

  /* ── Next milestone for countdown ── */
  const nextMilestone = useMemo(() => {
    const now = new Date();
    const upcoming = tasks
      .filter((t: any) => t.status !== 'completed' && t.dueDate)
      .map((t: any) => ({ title: t.title, date: new Date(t.dueDate) }))
      .filter((m) => m.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (upcoming.length === 0) return null;
    const diff = Math.ceil((upcoming[0].date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { title: upcoming[0].title, daysUntil: diff };
  }, [tasks]);

  /* ── Formatted today ── */
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  /* ── Family milestones for a phase ── */
  const getMilestonesForPhase = (phase: number) =>
    FAMILY_MILESTONES.filter((m) => m.phase === phase);

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
    if (updateTask) {
      await updateTask(task.id, { status: next });
    } else if (onToggleTask) {
      onToggleTask(task.id);
    }
  };

  const ownerLabel = (o: string) => {
    if (o === 'sean') return 'Spouse A';
    if (o === 'wife') return 'Spouse B';
    return 'Both';
  };

  const renderMilestoneIcon = (icon: FamilyMilestone['icon']) => {
    const Icon = MILESTONE_ICONS[icon];
    return <Icon />;
  };

  /* ── Scorecard month status ── */
  const getMonthStatus = (month: number): 'complete' | 'active' | 'pending' => {
    if (month < activeMonth) return 'complete';
    if (month === activeMonth) return 'active';
    return 'pending';
  };

  /* ────────── Render ────────── */

  return (
    <Container>
      {/* View Toggle */}
      <ViewToggleBar>
        <ViewToggleBtn
          $active={viewMode === 'timeline'}
          onClick={() => setViewMode('timeline')}
        >
          <Calendar /> Timeline
        </ViewToggleBtn>
        <ViewToggleBtn
          $active={viewMode === 'scorecard'}
          onClick={() => setViewMode('scorecard')}
        >
          <LayoutGrid /> Scorecard
        </ViewToggleBtn>
      </ViewToggleBar>

      {/* ── Scorecard View ── */}
      {viewMode === 'scorecard' && (
        <ScorecardGrid>
          {MONTH_DATA.map((md) => {
            const status = getMonthStatus(md.month);
            return (
              <ScorecardCell key={md.month} $status={status}>
                <ScorecardMonth>M{md.month}</ScorecardMonth>
                <ScorecardText>{md.text}</ScorecardText>
                <ScorecardDot $status={status} />
              </ScorecardCell>
            );
          })}
        </ScorecardGrid>
      )}

      {/* ── Timeline View ── */}
      {viewMode === 'timeline' && (
        <TimelineWrapper>
          {phaseGroups.map((pg, idx) => {
            const isCurrent = currentPhase === pg.phase;
            const showTodayAfter = isCurrent;
            const phaseMilestones = getMilestonesForPhase(pg.phase);
            const spentCost = pg.tasks
              .filter((t: any) => t.status === 'completed')
              .reduce((sum: number, t: any) => sum + parseCost(t.cost), 0);

            return (
              <React.Fragment key={pg.phase}>
                <PhaseLane $isCurrent={isCurrent} $color={pg.color}>
                  <PhaseConnector $color={pg.color} />
                  <PhaseNode $color={pg.color} $isCurrent={isCurrent} />

                  {/* Phase Header */}
                  <PhaseHeader $isCurrent={isCurrent}>
                    <PhaseHeaderRow>
                      <PhaseName>
                        {pg.phase === 4 && (
                          <PhaseAwardIcon />
                        )}
                        {pg.name}
                      </PhaseName>
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

                    {/* Cost Accumulation Bar */}
                    {pg.totalCost > 0 && (
                      <CostBar>
                        <CostBarLabel>Cost</CostBarLabel>
                        <CostBarValue>
                          ${spentCost.toLocaleString()} / ${pg.totalCost.toLocaleString()}
                        </CostBarValue>
                        <CostBarTrack>
                          <CostBarFill $pct={pg.totalCost > 0 ? (spentCost / pg.totalCost) * 100 : 0} />
                        </CostBarTrack>
                      </CostBar>
                    )}
                  </PhaseHeader>

                  {/* Task Cards */}
                  <TaskCardsList>
                    {pg.tasks.map((task: any) => {
                      const isExpanded = expandedId === task.id;
                      const catColor = CAT_COLORS[task.category] || '#60C0F0';

                      return (
                        <TaskCard key={task.id} $catColor={catColor} $done={task.status === 'completed'}>
                          <TaskHeader type="button" onClick={() => toggleExpand(task.id)}>
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
                                  <CostAmount>{task.cost}</CostAmount>
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
                                  {task.resourceLabel || 'Open Resource'} {'\u2197'}
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

                  {/* Family Milestones */}
                  {phaseMilestones.length > 0 && (
                    <TaskCardsList>
                      {phaseMilestones.map((fm, fmIdx) => (
                        <FamilyMarker key={`fm-${pg.phase}-${fmIdx}`}>
                          <FamilyMarkerIcon>
                            {renderMilestoneIcon(fm.icon)}
                          </FamilyMarkerIcon>
                          <FamilyMarkerLabel>{fm.label}</FamilyMarkerLabel>
                          <FamilyMarkerTag>FAMILY</FamilyMarkerTag>
                        </FamilyMarker>
                      ))}
                    </TaskCardsList>
                  )}
                </PhaseLane>

                {/* Enhanced Today Indicator */}
                {showTodayAfter && idx < phaseGroups.length - 1 && (
                  <TodayMarker>
                    <TodayBadge>
                      <TodayText>TODAY</TodayText>
                      <TodayDate>{todayFormatted}</TodayDate>
                      {nextMilestone && (
                        <TodayCountdown>
                          {nextMilestone.daysUntil}d to: {nextMilestone.title}
                        </TodayCountdown>
                      )}
                    </TodayBadge>
                    <TodayLine />
                  </TodayMarker>
                )}
              </React.Fragment>
            );
          })}
        </TimelineWrapper>
      )}
    </Container>
  );
};

export default ImmigrationTimeline;
