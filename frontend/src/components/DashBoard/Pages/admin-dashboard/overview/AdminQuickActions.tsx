import React from 'react';
import { CommandCard } from '../AdminDashboardCards';
import { AdminQuickAction } from './AdminOverview.types';

interface AdminQuickActionsProps {
  actions: AdminQuickAction[];
}

const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({ actions }) => (
  <CommandCard style={{ padding: '2rem' }}>
    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Quick Actions</h3>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}
    >
      {actions.map((action) => (
        <CommandCard
          key={action.id}
          style={{
            padding: '1.5rem',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.action}
        >
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(0, 255, 255, 0.1)',
              color: '#00ffff',
              marginBottom: '0.75rem',
            }}
          >
            {action.icon}
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>{action.title}</h4>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            {action.description}
          </p>
        </CommandCard>
      ))}
    </div>
  </CommandCard>
);

export default AdminQuickActions;
