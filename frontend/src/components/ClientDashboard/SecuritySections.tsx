/**
 * SecuritySections.tsx — placeholder for future client security dashboard
 */
import React from 'react';
import styled from 'styled-components';
import { Shield } from 'lucide-react';

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
  background: rgba(96, 192, 240, 0.1);
  color: var(--accent-primary, #60C0F0);
`;

export const SecurityOverview: React.FC = () => (
  <Placeholder>
    <IconWrap><Shield size={24} /></IconWrap>
    <span>Security overview coming soon.</span>
  </Placeholder>
);

export const SecurityOpsCenter: React.FC = () => (
  <Placeholder>
    <IconWrap><Shield size={24} /></IconWrap>
    <span>Security operations center coming soon.</span>
  </Placeholder>
);

const SecuritySections: React.FC = () => (
  <Placeholder>
    <IconWrap><Shield size={24} /></IconWrap>
    <span>Security sections coming soon.</span>
  </Placeholder>
);

export default SecuritySections;
