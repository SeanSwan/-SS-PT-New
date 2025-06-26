/**
 * ThemeStatusIndicator.tsx
 * ========================
 * Development utility to verify Galaxy-Swan theme implementation
 * 
 * Master Prompt v28.6 Compliance:
 * ✅ Single Responsibility: Only checks theme status
 * ✅ Production-Ready: Can be conditionally rendered
 * ✅ Clean Implementation: Minimal, focused component
 */

import React from 'react';
import styled from 'styled-components';
import { galaxySwanTheme } from '../styles/galaxy-swan-theme';

const StatusContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${galaxySwanTheme.background.elevated};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  border-radius: 10px;
  padding: 1rem;
  z-index: 9999;
  backdrop-filter: blur(15px);
  font-size: 0.85rem;
  color: ${galaxySwanTheme.text.primary};
  box-shadow: ${galaxySwanTheme.shadows.swanGlow};
  max-width: 250px;
  
  @media (max-width: 768px) {
    display: none; /* Hide on mobile to avoid clutter */
  }
`;

const StatusTitle = styled.div`
  font-weight: 600;
  color: ${galaxySwanTheme.primary.main};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
`;

const StatusBadge = styled.span<{ status: 'success' | 'warning' | 'error' }>`
  color: ${props => {
    switch (props.status) {
      case 'success': return '#00ff88';
      case 'warning': return '#ffaa00';
      case 'error': return '#ff4466';
      default: return '#ffffff';
    }
  }};
  font-weight: 500;
`;

interface ThemeStatusIndicatorProps {
  enabled?: boolean;
}

const ThemeStatusIndicator: React.FC<ThemeStatusIndicatorProps> = ({ 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  if (!enabled) return null;

  // Check if theme elements are available
  const themeChecks = {
    'Theme Core': galaxySwanTheme ? 'success' : 'error',
    'Primary Colors': galaxySwanTheme?.primary?.main ? 'success' : 'error',
    'Gradients': galaxySwanTheme?.gradients?.swanCosmic ? 'success' : 'error',
    'Animations': galaxySwanTheme?.shadows?.swanGlow ? 'success' : 'error',
    'Typography': galaxySwanTheme?.text?.primary ? 'success' : 'error'
  } as const;

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
    }
  };

  return (
    <StatusContainer>
      <StatusTitle>
        🌌 Galaxy-Swan Theme
      </StatusTitle>
      {Object.entries(themeChecks).map(([check, status]) => (
        <StatusItem key={check}>
          <span>{check}</span>
          <StatusBadge status={status}>
            {getStatusIcon(status)} {status.toUpperCase()}
          </StatusBadge>
        </StatusItem>
      ))}
      <StatusItem style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
          🔗 <a 
            href="/theme-showcase" 
            style={{ color: galaxySwanTheme.primary.main, textDecoration: 'none' }}
          >
            View Theme Showcase
          </a>
        </span>
      </StatusItem>
    </StatusContainer>
  );
};

export default ThemeStatusIndicator;