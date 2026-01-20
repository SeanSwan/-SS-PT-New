import React from 'react';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';

interface SessionCountDisplayProps {
  clientId?: number;
  sessionData?: {
    availableSessions?: number;
    sessionsUsed?: number;
    totalSessionsPurchased?: number;
  };
  onSessionCountUpdate?: () => void;
}

const Container = styled.div`
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(16, 185, 129, 0.1) 100%
  );
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 10px;
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  color: #ffffff;
  font-weight: 600;
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  color: #00ffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
`;

const Stat = styled.div`
  text-align: center;
  padding: 0.5rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
`;

const StatValue = styled.div`
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const EmptyState = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
`;

const SessionCountDisplay: React.FC<SessionCountDisplayProps> = ({
  sessionData,
  onSessionCountUpdate
}) => {
  const available = sessionData?.availableSessions;
  const used = sessionData?.sessionsUsed;
  const total = sessionData?.totalSessionsPurchased;

  const hasData =
    typeof available === 'number' ||
    typeof used === 'number' ||
    typeof total === 'number';

  return (
    <Container>
      <Header>
        <span>Session Balance</span>
        {onSessionCountUpdate && (
          <RefreshButton type="button" onClick={onSessionCountUpdate}>
            <RefreshCw size={16} />
          </RefreshButton>
        )}
      </Header>

      {hasData ? (
        <Grid>
          <Stat>
            <StatValue>{available ?? 0}</StatValue>
            <StatLabel>Available</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{used ?? 0}</StatValue>
            <StatLabel>Used</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{total ?? 0}</StatValue>
            <StatLabel>Total</StatLabel>
          </Stat>
        </Grid>
      ) : (
        <EmptyState>Session counts are not available yet.</EmptyState>
      )}
    </Container>
  );
};

export default SessionCountDisplay;
