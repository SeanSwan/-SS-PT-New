import React from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import {
  PrimaryHeading,
  GridContainer,
  Card,
  Caption,
  SmallText
} from '../ui';

interface ScheduleStatsProps {
  mode: 'admin' | 'trainer' | 'client';
  sessions: any[];
  creditsDisplay: string | number;
  lowCredits: boolean;
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({
  mode,
  sessions,
  creditsDisplay,
  lowCredits
}) => {
  return (
    <StatsPanel>
      <PrimaryHeading style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Schedule Overview
      </PrimaryHeading>
      {mode === 'client' && lowCredits && (
        <CreditWarning>
          <AlertTriangle size={18} />
          <div>
            <SmallText>
              Low credits: {creditsDisplay} sessions remaining. Visit the store to purchase more.
            </SmallText>
          </div>
        </CreditWarning>
      )}
      <GridContainer columns={mode === 'client' ? 5 : 4} gap="1rem">
        <StatCard>
          <div className="stat-value">{sessions.length}</div>
          <Caption secondary>Total Sessions</Caption>
        </StatCard>
        <StatCard>
          <div className="stat-value" style={{ color: galaxySwanTheme.primary.blue }}>
            {sessions.filter(s => s.status === 'available').length}
          </div>
          <Caption secondary>Available</Caption>
        </StatCard>
        <StatCard>
          <div className="stat-value" style={{ color: galaxySwanTheme.secondary.main }}>
            {sessions.filter(s => s.status === 'scheduled').length}
          </div>
          <Caption secondary>Scheduled</Caption>
        </StatCard>
        <StatCard>
          <div className="stat-value" style={{ color: galaxySwanTheme.text.muted }}>
            {sessions.filter(s => s.status === 'completed').length}
          </div>
          <Caption secondary>Completed</Caption>
        </StatCard>
        {mode === 'client' && (
          <StatCard>
            <div className="stat-value" style={{ color: galaxySwanTheme.primary.main }}>
              {creditsDisplay}
            </div>
            <Caption secondary>Credits Remaining</Caption>
          </StatCard>
        )}
      </GridContainer>
    </StatsPanel>
  );
};

export default ScheduleStats;

const StatsPanel = styled.div`
  margin: 1rem 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
  /* NOTE: GPU layer promotion removed - only scroll containers should have this */

  @media (max-width: 1024px) {
    margin: 0.75rem 1.5rem;
    padding: 1.25rem;
  }

  @media (max-width: 768px) {
    margin: 0.5rem 1rem;
    padding: 1rem;
    border-radius: 10px;
    /* Disable backdrop-filter on mobile for better scroll performance */
    backdrop-filter: none;
    background: rgba(20, 20, 40, 0.85);
  }

  @media (max-width: 480px) {
    margin: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    margin: 1.25rem 2.5rem;
    padding: 2rem;
    border-radius: 16px;
  }

  @media (min-width: 3840px) {
    margin: 1.5rem 3rem;
    padding: 2.5rem;
  }
`;

const CreditWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fef3c7;

  @media (max-width: 480px) {
    padding: 0.625rem 0.75rem;
    gap: 0.5rem;
    font-size: 0.875rem;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
`;

const StatCard = styled(Card)`
  text-align: center;
  padding: 1.5rem;

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: ${galaxySwanTheme.primary.main};
    margin-bottom: 0.5rem;
    line-height: 1;
  }

  @media (max-width: 768px) {
    padding: 1.25rem;

    .stat-value {
      font-size: 1.75rem;
    }
  }

  @media (max-width: 480px) {
    padding: 1rem;

    .stat-value {
      font-size: 1.5rem;
    }
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    padding: 2rem;

    .stat-value {
      font-size: 2.5rem;
    }
  }

  @media (min-width: 3840px) {
    padding: 2.5rem;

    .stat-value {
      font-size: 3rem;
    }
  }
`;
