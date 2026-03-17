/**
 * WorkoutLoggerHeader — Client info, date, session count, stats
 * Extracted from WorkoutLogger monolith
 */
import React from 'react';
import styled from 'styled-components';
import { User, Calendar, Activity, Clock, BarChart3 } from 'lucide-react';
import { CS } from './WorkoutLoggerCS';

interface WorkoutLoggerHeaderProps {
  clientFirstName: string;
  clientLastName: string;
  availableSessions: number;
  totalSets: number;
  estimatedDuration: number;
}

const WorkoutLoggerHeader: React.FC<WorkoutLoggerHeaderProps> = React.memo(({
  clientFirstName,
  clientLastName,
  availableSessions,
  totalSets,
  estimatedDuration,
}) => (
  <Header>
    <ClientInfo>
      <h2>
        <User size={24} />
        Logging Workout for: {clientFirstName} {clientLastName}
      </h2>
      <SessionInfo>
        <InfoBadge type="info">
          <Calendar size={16} />
          Date: {new Date().toLocaleDateString()}
        </InfoBadge>
        <InfoBadge type={availableSessions > 3 ? 'success' : 'warning'}>
          <Activity size={16} />
          Sessions Remaining: {availableSessions}
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
));

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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(96, 192, 240, 0.03);
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
    background: linear-gradient(180deg, rgba(96, 192, 240, 0.04) 0%, transparent 100%);
    pointer-events: none;
  }

  @media (max-width: 430px) {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    border-radius: 1rem;
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
    props.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' :
    props.type === 'success' ? 'rgba(16, 185, 129, 0.12)' :
    'rgba(80, 160, 240, 0.12)'
  };
  border: 1px solid ${props =>
    props.type === 'warning' ? 'rgba(245, 158, 11, 0.35)' :
    props.type === 'success' ? 'rgba(16, 185, 129, 0.35)' :
    'rgba(80, 160, 240, 0.35)'
  };
  color: ${props =>
    props.type === 'warning' ? '#fbbf24' :
    props.type === 'success' ? '#34d399' :
    CS.glowLight
  };
  svg { flex-shrink: 0; }
`;
