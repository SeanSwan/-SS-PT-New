import React from 'react';
import { CommandCard } from '../AdminDashboardCards';
import { CommandGrid, StatusIndicator, CommandButton } from './AdminOverview.styles';
import { SystemHealthMetric } from './AdminOverview.types';

interface AdminSystemHealthPanelProps {
  systemHealth: SystemHealthMetric[];
  onRefresh?: () => void;
}

const AdminSystemHealthPanel: React.FC<AdminSystemHealthPanelProps> = ({ systemHealth, onRefresh }) => (
  <CommandCard style={{ padding: '2rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>System Health</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
          Live infrastructure status and response metrics
        </p>
      </div>
      <CommandButton onClick={onRefresh || (() => {})}>Refresh</CommandButton>
    </div>

    <CommandGrid>
      {systemHealth.map((service) => (
        <CommandCard key={service.service} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StatusIndicator status={service.status} />
              <span style={{ fontWeight: 600 }}>{service.service}</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
              {service.uptime.toFixed(2)}% uptime
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
            {service.details}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span>Resp: {service.responseTime}ms</span>
            <span>Err: {service.errorRate}%</span>
            <span>Thr: {service.throughput}</span>
          </div>
        </CommandCard>
      ))}
    </CommandGrid>
  </CommandCard>
);

export default AdminSystemHealthPanel;
