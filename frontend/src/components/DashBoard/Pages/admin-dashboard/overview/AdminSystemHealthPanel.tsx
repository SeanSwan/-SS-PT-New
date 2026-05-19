import React from 'react';
import styled from 'styled-components';
import { CommandCard } from '../AdminDashboardCards';
import { CommandGrid, StatusIndicator, CommandButton } from './AdminOverview.styles';
import { SystemHealthMetric } from './AdminOverview.types';

interface AdminSystemHealthPanelProps {
  systemHealth: SystemHealthMetric[];
  onRefresh?: () => void;
}

const AdminSystemHealthPanel: React.FC<AdminSystemHealthPanelProps> = ({ systemHealth, onRefresh }) => {
  return (
    <PanelCard>
      <PanelHeader>
        <HeaderCopy>
          <PanelTitle>System Health</PanelTitle>
          <PanelDescription>
            Live infrastructure status and response metrics
          </PanelDescription>
        </HeaderCopy>
        <CommandButton onClick={onRefresh || (() => {})}>Refresh</CommandButton>
      </PanelHeader>

      <CommandGrid>
        {systemHealth.map((service) => (
          <ServiceCard key={service.service}>
            <ServiceHeader>
              <ServiceNameGroup>
                <StatusIndicator status={service.status} />
                <ServiceName>{service.service}</ServiceName>
              </ServiceNameGroup>
              <UptimeText>
                {service.uptime.toFixed(2)}% uptime
              </UptimeText>
            </ServiceHeader>
            <DetailsText>
              {service.details}
            </DetailsText>
            <MetricsRow>
              <span>Resp: {service.responseTime}ms</span>
              <span>Err: {service.errorRate}%</span>
              <span>Thr: {service.throughput}</span>
            </MetricsRow>
          </ServiceCard>
        ))}
      </CommandGrid>
    </PanelCard>
  );
};

const PanelCard = styled(CommandCard)`
  padding: 2rem;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const HeaderCopy = styled.div`
  min-width: 0;
`;

const PanelTitle = styled.h3`
  font-size: 1.2rem;
  margin: 0 0 0.25rem;
`;

const PanelDescription = styled.p`
  color: var(--text-muted, rgba(255, 255, 255, 0.6));
  font-size: 0.875rem;
  margin: 0;
`;

const ServiceCard = styled(CommandCard)`
  padding: 1.5rem;
`;

const ServiceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const ServiceNameGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const ServiceName = styled.span`
  font-weight: 600;
`;

const UptimeText = styled.span`
  color: var(--text-muted, rgba(255, 255, 255, 0.6));
  font-size: 0.75rem;
  white-space: nowrap;
`;

const DetailsText = styled.div`
  color: var(--text-muted, rgba(255, 255, 255, 0.6));
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
`;

const MetricsRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
`;

export default AdminSystemHealthPanel;
