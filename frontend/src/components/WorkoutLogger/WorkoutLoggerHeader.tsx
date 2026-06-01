/**
 * ┌─── SUB-COMPONENT: WorkoutLoggerHeader ─────────────────────┐
 * │ PARENT: WorkoutLogger                                       │
 * │ PURPOSE: Displays client name, date, session count, quick   │
 * │          stats (sets, duration), and OPT phase selector     │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ 👤 Client: Jane Doe    📅 Mar 21, 2026  │                │
 * │ │ Sessions: 12  |  Sets: 18  |  ~45 min    │                │
 * │ │ [OPTPhaseIndicator ─── Phase 2 ▼]        │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: {                                                    │
 * │   clientFirstName, clientLastName,                          │
 * │   availableSessions, totalSets, estimatedDuration,          │
 * │   currentOPTPhase?, onOPTPhaseChange?                       │
 * │ }                                                           │
 * │ Children: OPTPhaseIndicator                                 │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { User, Calendar, Activity, Clock, BarChart3 } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';
import OPTPhaseIndicator from './OPTPhaseIndicator';
import { getClientSessionSignal } from '../DashBoard/workspaces/clients-team/clientSessionSignal';

interface WorkoutLoggerHeaderProps {
  clientFirstName: string;
  clientLastName: string;
  availableSessions: number;
  clientSource?: string | null;
  totalSets: number;
  estimatedDuration: number;
  workoutDate?: string | null;
  /** Current NASM OPT phase (1-5). Defaults to 1 if not provided. */
  currentOPTPhase?: number;
  /** Called when trainer changes the OPT phase */
  onOPTPhaseChange?: (newPhase: number) => void;
}

const WorkoutLoggerHeader: React.FC<WorkoutLoggerHeaderProps> = React.memo(({
  clientFirstName,
  clientLastName,
  availableSessions,
  clientSource,
  totalSets,
  estimatedDuration,
  workoutDate,
  currentOPTPhase = 1,
  onOPTPhaseChange,
}) => {
  const sessionSignal = getClientSessionSignal({ clientSource: clientSource || undefined, availableSessions });
  const sessionBadgeType = sessionSignal.tone === 'warning' ? 'warning' : 'success';
  const parsedWorkoutDate = workoutDate ? new Date(`${workoutDate}T00:00:00`) : null;
  const displayDate = parsedWorkoutDate && !Number.isNaN(parsedWorkoutDate.getTime())
    ? parsedWorkoutDate.toLocaleDateString()
    : new Date().toLocaleDateString();

  return (
    <Header>
      <ClientInfo>
        <HeaderRow>
          <h2>
            <User size={24} />
            Logging Workout for: {clientFirstName} {clientLastName}
          </h2>
          {onOPTPhaseChange && (
            <OPTPhaseIndicator
              currentPhase={currentOPTPhase}
              onPhaseChange={onOPTPhaseChange}
              clientName={`${clientFirstName} ${clientLastName}`}
            />
          )}
        </HeaderRow>
        <SessionInfo>
          <InfoBadge type="info">
            <Calendar size={16} />
            Date: {displayDate}
          </InfoBadge>
          <InfoBadge
            type={sessionBadgeType}
            aria-live="polite"
            aria-atomic="true"
            title={sessionSignal.note}
          >
            <Activity size={16} />
            {sessionSignal.label}
          </InfoBadge>
          <InfoBadge type="info">
            <Clock size={16} />
            Est. Duration: {estimatedDuration} min
          </InfoBadge>
          <InfoBadge type="info">
            <BarChart3 size={16} />
            Total Sets: {totalSets}
          </InfoBadge>
        </SessionInfo>
      </ClientInfo>
    </Header>
  );
});

WorkoutLoggerHeader.displayName = 'WorkoutLoggerHeader';
export default WorkoutLoggerHeader;

// ── Styled Components ──

const Header = styled.div`
  background: ${CS.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid ${CS.glassBorder};
  box-shadow: 0 8px 32px ${withAlpha(CS.bgDeep, 0.4)}, 0 0 80px ${withAlpha(CS.gaming, 0.03)};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${CS.glow}, ${CS.gaming}, ${CS.accent});
  }

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(180deg, ${withAlpha(CS.gaming, 0.04)} 0%, transparent 100%);
    pointer-events: none;
  }

  @media (max-width: 430px) {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    border-radius: 1rem;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ClientInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${CS.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.02em;

    svg { color: ${CS.gaming}; }
  }
`;

const SessionInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  font-size: 0.85rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const InfoBadge = styled.div<{ type: 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  min-height: 44px;
  backdrop-filter: blur(8px);
  background: ${props =>
    props.type === 'warning' ? CS.warningBg :
    props.type === 'success' ? CS.successBg :
    CS.infoBg
  };
  border: 1px solid ${props =>
    props.type === 'warning' ? CS.warningBorder :
    props.type === 'success' ? CS.successBorder :
    CS.infoBorder
  };
  color: ${props =>
    props.type === 'warning' ? CS.warningText :
    props.type === 'success' ? CS.successText :
    CS.glowLight
  };
  svg { flex-shrink: 0; }
`;
