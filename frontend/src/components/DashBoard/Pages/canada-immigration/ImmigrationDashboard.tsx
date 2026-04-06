/**
 * ImmigrationDashboard.tsx — v2.0
 * ──────────────────────────────────────────────────────────────────
 * Module 1: Overview — at-a-glance progress dashboard
 *
 * Sections:
 *   1. Six Pathways Summary (NEW)
 *   2. Family Status Board (NEW)
 *   3. Progress Ring + Phase Cards (existing, preserved)
 *   4. 12-Month Scorecard (NEW)
 *   5. Cost Dashboard (NEW)
 *   6. CRS Quick View (NEW)
 *   7. Priority Actions + Milestones + Category Breakdown (existing)
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Zap,
  MapPin,
  GraduationCap,
  Languages,
  Briefcase,
  Shield,
  Users,
  Heart,
  Baby,
  User,
  DollarSign,
  TrendingUp,
  Target,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';
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
  { phase: 0, name: 'Immediate Actions', description: 'Marriage, tribal enrollment, initial research', months: 'This Week' },
  { phase: 1, name: 'Foundation', description: 'IELTS, GED, ECA, Express Entry profile', months: 'Months 1-3' },
  { phase: 2, name: 'Applications', description: 'MEd applications, PNP, certifications', months: 'Months 4-6' },
  { phase: 3, name: 'Transition', description: 'Permits, move to Canada, settle family', months: 'Months 7-12' },
  { phase: 4, name: 'Permanent Residency', description: 'Canadian experience, PR application', months: 'Months 13-24' },
];

const CATEGORIES = [
  { key: 'marriage', label: 'Marriage & Legal', color: '#ef4444' },
  { key: 'tribal', label: 'Tribal/Indigenous', color: '#f97316' },
  { key: 'language', label: 'Language', color: '#60C0F0' },
  { key: 'certification', label: 'Certifications', color: '#22c55e' },
  { key: 'immigration', label: 'Immigration', color: '#8B5CF6' },
  { key: 'pt_market', label: 'PT Market Prep', color: '#06b6d4' },
];

const PATHWAYS = [
  {
    title: 'Express Entry',
    icon: Zap,
    color: '#60C0F0',
    subtitle: 'Principal applicant + French bonus',
    status: 'Active \u2014 building CRS score',
    primary: false,
  },
  {
    title: 'Provincial Nominee (PNP)',
    icon: MapPin,
    color: '#8B5CF6',
    subtitle: '+600 points \u2014 guaranteed ITA',
    status: 'Researching Ontario HCP + BC Tech',
    primary: false,
  },
  {
    title: 'Wife Studies in Canada',
    icon: GraduationCap,
    color: '#22C55E',
    subtitle: 'MEd \u2192 spousal OWP \u2192 whole family moves',
    status: 'PRIMARY PATHWAY',
    primary: true,
  },
  {
    title: 'Francophone Mobility',
    icon: Languages,
    color: '#60C0F0',
    subtitle: 'NCLC 5+ = work permit, NO LMIA',
    status: 'French study in progress',
    primary: false,
  },
  {
    title: 'Self-Employed (2027)',
    icon: Briefcase,
    color: '#C6A84B',
    subtitle: '26yr PT experience, score 68-80/35',
    status: 'Program paused \u2014 preparing docs',
    primary: false,
  },
  {
    title: 'Indigenous Mobility',
    icon: Shield,
    color: '#F97316',
    subtitle: 'Chickasaw enrollment + APM SP52',
    status: 'Dawes Roll research pending',
    primary: false,
  },
];

const FAMILY_MEMBERS = [
  { name: 'Spouse A', icon: User, role: 'Personal Trainer / Developer', status: 'Spousal OWP (pending MEd)', color: '#60C0F0' },
  { name: 'Spouse B', icon: Heart, role: 'Teacher / MEd Student', status: 'Principal applicant \u2014 Express Entry', color: '#8B5CF6' },
  { name: 'Children', icon: Baby, role: 'Students', status: 'Free Canadian public school (K-12)', color: '#22C55E' },
  { name: 'Elder', icon: Users, role: 'Family Elder', status: 'Super Visa (5yr stays, 10yr validity)', color: '#C6A84B' },
];

const TWELVE_MONTH_PLAN = [
  { month: 1, task: 'Get married, CDIB app, book IELTS', status: 'active' as const },
  { month: 2, task: 'Take IELTS, submit ECA', status: 'pending' as const },
  { month: 3, task: 'Express Entry profile, research MEd', status: 'pending' as const },
  { month: 4, task: 'Wife applies MEd, Ontario HCP', status: 'pending' as const },
  { month: 5, task: 'iTalki French, Chickasaw citizenship', status: 'pending' as const },
  { month: 6, task: 'Azure AI-102, document PT business', status: 'pending' as const },
  { month: 7, task: 'Wife accepted \u2014 apply permits', status: 'pending' as const },
  { month: 8, task: 'Family applications submitted', status: 'pending' as const },
  { month: 9, task: 'MOVE TO CANADA', status: 'pending' as const },
  { month: 10, task: 'Start training clients, kids in school', status: 'pending' as const },
  { month: 11, task: 'Book TEF exam, intensive French', status: 'pending' as const },
  { month: 12, task: 'Take TEF, update Express Entry (+50 CRS)', status: 'pending' as const },
];

/* ────────── Animations ────────── */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const ringDraw = keyframes`
  from { stroke-dashoffset: 440; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.15); }
  50%      { box-shadow: 0 0 28px rgba(139, 92, 246, 0.30); }
`;

/* ────────── Glass Surface Mixin ────────── */

const glassSurface = css`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 16px;
`;

const glassSurfaceHover = css`
  &:hover {
    background: rgba(0, 32, 96, 0.30);
    backdrop-filter: blur(24px) saturate(200%);
    border-color: rgba(96, 192, 240, 0.4);
    box-shadow: 0 0 24px rgba(139, 92, 246, 0.15);
    transform: translateY(-2px);
  }
`;

/* ────────── Layout ────────── */

const DashboardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: ${fadeInUp} 0.4s ease-out;
`;

const SectionTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: #E0ECF4;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 480px) {
    font-size: 17px;
  }
`;

const SectionSubtitle = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #A0ABC0;
`;

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const FullWidthCard = styled.div`
  ${glassSurface}
  padding: 24px;
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.15);
  animation: ${fadeInUp} 0.4s ease-out both;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Card = styled.div`
  ${glassSurface}
  padding: 24px;
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.15);
  animation: ${fadeInUp} 0.4s ease-out both;
  animation-delay: calc(var(--index, 0) * 0.05s);

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 16px;
`;

/* ══════════════════════════════════════════════════════════════════
   1. SIX PATHWAYS SUMMARY
   ══════════════════════════════════════════════════════════════════ */

const PathwayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 768px)  { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px)  { grid-template-columns: 1fr; }
  @media (min-width: 1920px) { grid-template-columns: repeat(6, 1fr); }
`;

const PathwayCard = styled.div<{ $color: string; $primary: boolean }>`
  ${glassSurface}
  padding: 20px;
  transition: all 0.25s ease;
  cursor: default;
  animation: ${fadeInUp} 0.4s ease-out both;
  animation-delay: calc(var(--index, 0) * 0.05s);

  ${(p) =>
    p.$primary &&
    css`
      border-color: rgba(198, 168, 75, 0.4);
      box-shadow: 0 0 20px rgba(198, 168, 75, 0.12);
    `}

  ${glassSurfaceHover}
`;

const PathwayIconWrap = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => p.$color}18;
  margin-bottom: 12px;
  color: ${(p) => p.$color};
`;

const PathwayTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

const PathwaySubtitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: #A0ABC0;
  margin-bottom: 10px;
  line-height: 1.4;
`;

const PathwayStatus = styled.div<{ $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${(p) => p.$color};
  padding: 4px 8px;
  border-radius: 6px;
  background: ${(p) => p.$color}14;
  display: inline-block;
`;

const PrimaryBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #C6A84B;
  background: rgba(198, 168, 75, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

/* ══════════════════════════════════════════════════════════════════
   2. FAMILY STATUS BOARD
   ══════════════════════════════════════════════════════════════════ */

const FamilyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px)  { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px)  { grid-template-columns: 1fr; }
`;

const FamilyCard = styled.div<{ $color: string }>`
  ${glassSurface}
  padding: 20px;
  text-align: center;
  transition: all 0.25s ease;
  animation: ${fadeInUp} 0.4s ease-out both;
  animation-delay: calc(var(--index, 0) * 0.05s);

  ${glassSurfaceHover}
`;

const FamilyIconWrap = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => p.$color}18;
  color: ${(p) => p.$color};
  margin: 0 auto 12px;
`;

const FamilyName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 16px;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

const FamilyRole = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: #A0ABC0;
  margin-bottom: 8px;
`;

const FamilyStatus = styled.div<{ $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: ${(p) => p.$color};
  line-height: 1.4;
`;

/* ══════════════════════════════════════════════════════════════════
   3. PROGRESS RING + STATS (existing)
   ══════════════════════════════════════════════════════════════════ */

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
  ${(p) => p.$active && css`animation: ${pulseGlow} 3s ease-in-out infinite;`}
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

/* ══════════════════════════════════════════════════════════════════
   4. 12-MONTH SCORECARD
   ══════════════════════════════════════════════════════════════════ */

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 768px)  { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px)  { grid-template-columns: 1fr; }
`;

const MonthCell = styled.div<{ $status: 'complete' | 'active' | 'pending' }>`
  ${glassSurface}
  padding: 16px;
  min-height: 44px;
  transition: all 0.25s ease;
  animation: ${fadeInUp} 0.4s ease-out both;
  animation-delay: calc(var(--index, 0) * 0.05s);

  ${(p) =>
    p.$status === 'complete' &&
    css`
      border-color: rgba(96, 192, 240, 0.4);
    `}

  ${(p) =>
    p.$status === 'active' &&
    css`
      border-color: rgba(139, 92, 246, 0.5);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
    `}

  ${(p) =>
    p.$status === 'pending' &&
    css`
      opacity: 0.6;
    `}
`;

const MonthNumber = styled.div<{ $status: 'complete' | 'active' | 'pending' }>`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${(p) =>
    p.$status === 'complete' ? '#60C0F0' : p.$status === 'active' ? '#8B5CF6' : '#A0ABC0'};
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MonthTask = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: #E0ECF4;
  line-height: 1.4;
`;

/* ══════════════════════════════════════════════════════════════════
   5. COST DASHBOARD
   ══════════════════════════════════════════════════════════════════ */

const CostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CostMetric = styled.div`
  ${glassSurface}
  padding: 20px;
  text-align: center;
`;

const CostValue = styled.div<{ $color?: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 700;
  color: ${(p) => p.$color || '#C6A84B'};
  margin-bottom: 4px;
`;

const CostLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: #A0ABC0;
`;

const CostNote = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #A0ABC0;
  text-align: center;
  padding: 12px;
  background: rgba(198, 168, 75, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(198, 168, 75, 0.15);

  strong {
    color: #C6A84B;
    font-family: 'Fira Code', monospace;
  }
`;

const PhaseBreakdown = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 16px;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
`;

const PhaseBar = styled.div<{ $width: number; $color: string }>`
  width: ${(p) => p.$width}%;
  height: 100%;
  background: ${(p) => p.$color};
  transition: width 0.6s ease;
`;

/* ══════════════════════════════════════════════════════════════════
   6. CRS QUICK VIEW
   ══════════════════════════════════════════════════════════════════ */

const CRSRow = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 20px;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const CRSScoreBox = styled.div`
  ${glassSurface}
  padding: 24px 32px;
  text-align: center;
  flex-shrink: 0;
`;

const CRSScoreValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 42px;
  font-weight: 700;
  color: #C6A84B;
`;

const CRSScoreLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: #A0ABC0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const CRSTips = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CRSTipItem = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #E0ECF4;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 32, 96, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.08);

  strong {
    font-family: 'Fira Code', monospace;
    color: #60C0F0;
  }
`;

const CRSCutoffRow = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 4px;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const CRSCutoff = styled.div<{ $met: boolean }>`
  ${glassSurface}
  padding: 12px 16px;
  flex: 1;
  text-align: center;
  border-color: ${(p) => (p.$met ? 'rgba(34, 197, 94, 0.3)' : 'rgba(96, 192, 240, 0.15)')};

  .label {
    font-family: 'Sora', sans-serif;
    font-size: 11px;
    color: #A0ABC0;
    margin-bottom: 4px;
  }

  .value {
    font-family: 'Fira Code', monospace;
    font-size: 20px;
    font-weight: 700;
    color: ${(p) => (p.$met ? '#22C55E' : '#60C0F0')};
  }
`;

/* ══════════════════════════════════════════════════════════════════
   7. PRIORITY ACTIONS + MILESTONES + CATEGORY (existing)
   ══════════════════════════════════════════════════════════════════ */

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
    transform: translateY(-2px);
    box-shadow: 0 0 24px rgba(139, 92, 246, 0.15);
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

/* ── Milestones ── */

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
  /* ── Computed data (preserved from v1) ── */

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

  /* ── Cost calculations (NEW) ── */

  const costData = useMemo(() => {
    const totalBudget = 2500; // midpoint of $2k-$3k
    let spent = 0;
    tasks
      .filter((t) => t.status === 'completed' && t.cost)
      .forEach((t) => {
        const parsed = parseFloat((t.cost || '0').replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) spent += parsed;
      });
    return {
      totalBudget,
      spent: Math.round(spent),
      remaining: Math.round(totalBudget - spent),
    };
  }, [tasks]);

  /* ── CRS estimate (NEW) ── */

  const crsEstimate = useMemo(() => {
    // Base CRS for couple: age ~35 + education + language baseline
    // This is a rough working estimate; CRS Calculator sub-tab has detail
    let score = 340; // reasonable starting estimate for couple profile
    // Check if French tasks are in-progress or done
    const frenchTask = tasks.find(
      (t) => t.category === 'language' && t.title.toLowerCase().includes('tef'),
    );
    if (frenchTask?.status === 'completed') score += 50;
    if (frenchTask?.status === 'in_progress') score += 20;

    const ieltsTask = tasks.find(
      (t) => t.category === 'language' && t.title.toLowerCase().includes('ielts'),
    );
    if (ieltsTask?.status === 'completed') score += 30;

    return score;
  }, [tasks]);

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
    <DashboardWrapper>

      {/* ═══ 1. SIX PATHWAYS SUMMARY ═══ */}
      <section>
        <SectionTitle>
          <Target size={20} color="#8B5CF6" />
          Immigration Pathways
          <SectionSubtitle>6 parallel strategies to maximize success</SectionSubtitle>
        </SectionTitle>
        <PathwayGrid>
          {PATHWAYS.map((pw, i) => {
            const Icon = pw.icon;
            return (
              <PathwayCard
                key={pw.title}
                $color={pw.color}
                $primary={pw.primary}
                style={{ '--index': i } as React.CSSProperties}
              >
                <PathwayIconWrap $color={pw.color}>
                  <Icon size={22} />
                </PathwayIconWrap>
                <PathwayTitle>
                  {pw.title}
                  {pw.primary && <PrimaryBadge>Primary</PrimaryBadge>}
                </PathwayTitle>
                <PathwaySubtitle>{pw.subtitle}</PathwaySubtitle>
                <PathwayStatus $color={pw.color}>{pw.status}</PathwayStatus>
              </PathwayCard>
            );
          })}
        </PathwayGrid>
      </section>

      {/* ═══ 2. FAMILY STATUS BOARD ═══ */}
      <section>
        <SectionTitle>
          <Users size={20} color="#60C0F0" />
          Family Status Board
        </SectionTitle>
        <FamilyGrid>
          {FAMILY_MEMBERS.map((fm, i) => {
            const Icon = fm.icon;
            return (
              <FamilyCard
                key={fm.name}
                $color={fm.color}
                style={{ '--index': i } as React.CSSProperties}
              >
                <FamilyIconWrap $color={fm.color}>
                  <Icon size={22} />
                </FamilyIconWrap>
                <FamilyName>{fm.name}</FamilyName>
                <FamilyRole>{fm.role}</FamilyRole>
                <FamilyStatus $color={fm.color}>{fm.status}</FamilyStatus>
              </FamilyCard>
            );
          })}
        </FamilyGrid>
      </section>

      {/* ═══ 3. PROGRESS RING + PHASE CARDS ═══ */}
      <TwoColGrid>
        <Card style={{ '--index': 0 } as React.CSSProperties}>
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

        <Card style={{ '--index': 1 } as React.CSSProperties}>
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
      </TwoColGrid>

      {/* ═══ 4. 12-MONTH SCORECARD ═══ */}
      <section>
        <SectionTitle>
          <Clock size={20} color="#C6A84B" />
          12-Month Scorecard
          <SectionSubtitle>Key milestone per month</SectionSubtitle>
        </SectionTitle>
        <MonthGrid>
          {TWELVE_MONTH_PLAN.map((m, i) => (
            <MonthCell
              key={m.month}
              $status={m.status}
              style={{ '--index': i } as React.CSSProperties}
            >
              <MonthNumber $status={m.status}>
                {m.status === 'complete' && <Check size={12} />}
                {m.status === 'active' && <AlertCircle size={12} />}
                Month {m.month}
              </MonthNumber>
              <MonthTask>{m.task}</MonthTask>
            </MonthCell>
          ))}
        </MonthGrid>
      </section>

      {/* ═══ 5. COST DASHBOARD ═══ */}
      <section>
        <SectionTitle>
          <DollarSign size={20} color="#C6A84B" />
          Cost Dashboard
        </SectionTitle>
        <CostGrid>
          <CostMetric>
            <CostValue>$4-5.5K</CostValue>
            <CostLabel>Total Budget</CostLabel>
          </CostMetric>
          <CostMetric>
            <CostValue $color="#22C55E">${costData.spent.toLocaleString()}</CostValue>
            <CostLabel>Spent (completed tasks)</CostLabel>
          </CostMetric>
          <CostMetric>
            <CostValue $color="#60C0F0">${costData.remaining.toLocaleString()}</CostValue>
            <CostLabel>Remaining</CostLabel>
          </CostMetric>
        </CostGrid>
        <CostNote>
          Less than <strong>32 PT sessions</strong> at $175/hr covers the entire pre-move budget
        </CostNote>
        <PhaseBreakdown>
          {PHASES.map((ph, i) => (
            <PhaseBar
              key={ph.phase}
              $width={phasePcts[i] > 0 ? 25 : 25}
              $color={
                i === 0 ? '#ef4444' : i === 1 ? '#8B5CF6' : i === 2 ? '#60C0F0' : i === 3 ? '#C6A84B' : '#22C55E'
              }
            />
          ))}
        </PhaseBreakdown>
      </section>

      {/* ═══ 6. CRS QUICK VIEW ═══ */}
      <FullWidthCard>
        <CardTitle>
          <TrendingUp size={18} color="#C6A84B" style={{ marginRight: 8, verticalAlign: 'middle' }} />
          CRS Quick View
        </CardTitle>
        <CRSRow>
          <CRSScoreBox>
            <CRSScoreValue>{crsEstimate}</CRSScoreValue>
            <CRSScoreLabel>Est. CRS Score</CRSScoreLabel>
          </CRSScoreBox>
          <CRSTips>
            <CRSTipItem>
              <Zap size={14} color="#60C0F0" />
              <span>IELTS CLB 9+ across all bands: <strong>+30-50 pts</strong></span>
            </CRSTipItem>
            <CRSTipItem>
              <Languages size={14} color="#8B5CF6" />
              <span>TEF French NCLC 7+: <strong>+50 pts</strong> (bilingual bonus)</span>
            </CRSTipItem>
            <CRSTipItem>
              <MapPin size={14} color="#22C55E" />
              <span>PNP nomination: <strong>+600 pts</strong> (guaranteed ITA)</span>
            </CRSTipItem>
          </CRSTips>
        </CRSRow>
        <CRSCutoffRow>
          <CRSCutoff $met={crsEstimate >= 379}>
            <div className="label">French Stream Cutoff</div>
            <div className="value">379</div>
          </CRSCutoff>
          <CRSCutoff $met={crsEstimate >= 520}>
            <div className="label">General Draw Cutoff</div>
            <div className="value">~520</div>
          </CRSCutoff>
          <CRSCutoff $met={false}>
            <div className="label">With PNP (+600)</div>
            <div className="value">{crsEstimate + 600}</div>
          </CRSCutoff>
        </CRSCutoffRow>
      </FullWidthCard>

      {/* ═══ 7. PRIORITY ACTIONS + MILESTONES + CATEGORIES ═══ */}
      <TwoColGrid>
        <Card style={{ '--index': 0 } as React.CSSProperties}>
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

        <Card style={{ '--index': 1 } as React.CSSProperties}>
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
      </TwoColGrid>

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
    </DashboardWrapper>
  );
};

export default ImmigrationDashboard;
