/**
 * SocialClientDashboard.tsx — placeholder for future social client dashboard
 * Renders a coming-soon message instead of null to prevent blank UI holes.
 */
import React from 'react';
import styled from 'styled-components';
import { Users, AlertTriangle } from 'lucide-react';

const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted, #94a3b8);
  font-size: 0.9rem;
`;

const IconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.1);
  color: var(--accent-secondary, #8B5CF6);
`;

export const HighRiskClientsWidget: React.FC = () => (
  <Placeholder>
    <IconWrap><AlertTriangle size={24} /></IconWrap>
    <span>High-risk client monitoring coming soon.</span>
  </Placeholder>
);

const SocialClientDashboard: React.FC = () => (
  <Placeholder>
    <IconWrap><Users size={24} /></IconWrap>
    <span>Social client dashboard coming soon.</span>
  </Placeholder>
);

export default SocialClientDashboard;
