/**
 * EmergencyDashboard.jsx
 *
 * Hooks-free admin fallback route for breaking out of dashboard render loops.
 * Kept as a class component on purpose: this screen must still mount if a hook
 * regression takes down the normal dashboard tree.
 */
import React from 'react';
import styled from 'styled-components';
import { logger } from '@/utils/logger';

const Page = styled.main`
  min-height: 100vh;
  padding: clamp(1rem, 4vw, 2rem);
  background:
    radial-gradient(circle at 20% 10%, var(--glow-cyan-20, rgba(96, 192, 240, 0.2)), transparent 34rem),
    var(--bg-base, #030712);
  color: var(--text-primary, #e0ecf4);
`;

const Card = styled.section`
  width: min(100%, 800px);
  margin: 2rem auto;
  padding: clamp(1.25rem, 4vw, 2rem);
  border: 1px solid var(--border-glow, rgba(96, 192, 240, 0.24));
  border-radius: 16px;
  background: var(--surface-elevated, rgba(0, 32, 96, 0.42));
  box-shadow: 0 24px 60px var(--shadow-primary, rgba(0, 0, 0, 0.35));
  text-align: center;
  backdrop-filter: blur(14px);
`;

const Title = styled.h1`
  margin: 0 0 1.5rem;
  color: var(--accent-primary, #60c0f0);
  font-size: clamp(1.75rem, 4vw, 2rem);
`;

const Description = styled.p`
  margin: 0 0 1.5rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.82));
  line-height: 1.7;
`;

const InfoPanel = styled.div`
  margin: 1.5rem 0;
  padding: 1rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.14));
  border-radius: 10px;
  background: var(--surface-dark, rgba(3, 7, 18, 0.58));
  text-align: left;
`;

const PanelTitle = styled.h2`
  margin: 0 0 0.5rem;
  color: var(--accent-primary, #60c0f0);
  font-size: 1rem;
`;

const ActionTitle = styled.h2`
  margin: 2rem 0 1rem;
  color: var(--accent-primary, #60c0f0);
  font-size: 1.1rem;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
`;

const ActionButton = styled.button`
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  border: 0;
  border-radius: 8px;
  background: var(--button-primary-bg, #002060);
  color: var(--button-primary-text, #e0ecf4);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 0 24px var(--button-primary-glow, rgba(139, 92, 246, 0.28));

  &:focus-visible {
    outline: 3px solid var(--focus-ring, #8b5cf6);
    outline-offset: 3px;
  }

  &:hover {
    background: var(--button-primary-hover, #003080);
  }
`;

const DangerButton = styled(ActionButton)`
  background: var(--danger-bg, #7f1d1d);
  color: var(--danger-text, #fff1f2);
  box-shadow: 0 0 24px var(--danger-glow, rgba(248, 113, 113, 0.24));

  &:hover {
    background: var(--danger-hover, #991b1b);
  }
`;

const FooterNote = styled.p`
  margin: 2rem 0 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.9rem;
`;

const emergencyFlags = [
  'bypass_admin_verification',
  'admin_emergency_mode',
  'use_emergency_admin_route',
  'fixing_hooks_error',
  'emergency_fallback_mode',
  'skip_hooks_verification',
  'hooks_recovery_active',
  'breaking_hooks_loop',
  'circuit_breaker_active',
  'emergency_dashboard_loaded',
];

class EmergencyDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAdmin: true,
      emergency: true,
    };

    // Deliberately writes NO localStorage flags. Until 2026-08-14 this constructor
    // set `bypass_admin_verification` and `admin_emergency_mode`; nothing has read
    // either since the bypass branch left protected-route.tsx in production, so
    // they were dead writes whose only remaining effect was to make a future
    // reader think an emergency bypass still existed and wire a consumer back up.
    // This component is already admin-gated at main-routes.tsx — see
    // routes/emergencyAdminGate.contract.test.ts — so it has no need to grant
    // itself anything. `resetEmergencyMode` below still CLEARS the legacy flags,
    // which matters for users whose browsers hold them from an older build.
    logger.log('[EMERGENCY DASHBOARD] Emergency Dashboard loaded');
  }

  resetEmergencyMode = () => {
    logger.log('[EMERGENCY DASHBOARD] Resetting emergency mode...');

    if (typeof localStorage !== 'undefined') {
      emergencyFlags.forEach((flag) => localStorage.removeItem(flag));
    }

    setTimeout(() => {
      window.location.assign('/');
    }, 1000);
  };

  goToAdminDashboard = () => {
    logger.log('[EMERGENCY DASHBOARD] Attempting to access admin dashboard...');

    // No flags written — see the constructor note. Navigation alone is the whole
    // behaviour: the admin dashboard authorizes from the session, never from
    // localStorage. `use_emergency_admin_route` had no reader either.
    window.location.assign('/dashboard/default');
  };

  render() {
    const runtimeEnvironment = import.meta.env?.MODE || 'unknown';

    return (
      <Page>
        <Card aria-labelledby="emergency-dashboard-title">
          <Title id="emergency-dashboard-title">Emergency Admin Dashboard</Title>

          <Description>
            This fallback interface is active because the normal admin dashboard failed to mount.
            It uses a simplified class component so admin recovery actions remain available.
          </Description>

          <InfoPanel>
            <PanelTitle>Emergency Status</PanelTitle>
            <p>
              <strong>Environment:</strong> {runtimeEnvironment}<br />
              <strong>Emergency Mode:</strong> ACTIVE<br />
              <strong>Admin Access:</strong> {this.state.isAdmin ? 'GRANTED' : 'DENIED'}<br />
              <strong>Fallback State:</strong> {this.state.emergency ? 'READY' : 'INACTIVE'}
            </p>
          </InfoPanel>

          <ActionTitle>Actions</ActionTitle>
          <ActionRow>
            <ActionButton type="button" onClick={this.goToAdminDashboard}>
              Try Admin Dashboard
            </ActionButton>

            <ActionButton type="button" onClick={() => window.location.assign('/')}>
              Return to Home
            </ActionButton>

            <DangerButton type="button" onClick={this.resetEmergencyMode}>
              Reset Emergency Mode
            </DangerButton>
          </ActionRow>

          <FooterNote>
            Emergency Dashboard v1.0. Use this screen only to recover admin access.
          </FooterNote>
        </Card>
      </Page>
    );
  }
}

export default EmergencyDashboard;
