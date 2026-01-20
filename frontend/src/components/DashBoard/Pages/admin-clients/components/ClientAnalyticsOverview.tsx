import React from 'react';
import styled from 'styled-components';
import theme from '../../../../../theme/tokens';

interface ClientAnalyticsOverviewProps {
  stats: {
    totalClients: number;
    activeClients: number;
    newThisMonth: number;
    totalRevenue: number;
    sessionsBooked: number;
    averageSessionsPerClient: number;
  };
}

const Card = styled.div`
  background: rgba(12, 14, 24, 0.75);
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 16px;
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const Title = styled.h3`
  margin: 0;
  color: ${theme.colors.brand.cyan};
  font-size: ${theme.typography.scale.lg};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${theme.spacing.md};
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const StatValue = styled.div`
  font-size: ${theme.typography.scale.xl};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.scale.sm};
  color: ${theme.colors.text.secondary};
`;

const ClientAnalyticsOverview: React.FC<ClientAnalyticsOverviewProps> = ({ stats }) => {
  return (
    <Card>
      <Title>Client Analytics Overview</Title>
      <StatGrid>
        <Stat>
          <StatValue>{stats.totalClients}</StatValue>
          <StatLabel>Total Clients</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{stats.activeClients}</StatValue>
          <StatLabel>Active Clients</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{stats.newThisMonth}</StatValue>
          <StatLabel>New This Month</StatLabel>
        </Stat>
        <Stat>
          <StatValue>${stats.totalRevenue.toLocaleString()}</StatValue>
          <StatLabel>Revenue</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{stats.sessionsBooked}</StatValue>
          <StatLabel>Sessions Booked</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{stats.averageSessionsPerClient.toFixed(1)}</StatValue>
          <StatLabel>Avg Sessions</StatLabel>
        </Stat>
      </StatGrid>
    </Card>
  );
};

export default ClientAnalyticsOverview;
