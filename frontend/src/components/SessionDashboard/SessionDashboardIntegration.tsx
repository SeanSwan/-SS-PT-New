/**
 * SessionDashboardIntegration.tsx
 * Universal component that shows appropriate session management UI based on user role
 * This can be dropped into any dashboard to instantly add session functionality
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSessionManager from './AdminSessionManager';
import TrainerClientSessions from './TrainerClientSessions';
import SessionDashboard from './SessionDashboard';
import styled from 'styled-components';

const IntegrationContainer = styled.div`
  width: 100%;
  min-height: 400px;
`;

const AccessDenied = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  .message {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  .submessage {
    font-size: 0.9rem;
    opacity: 0.7;
  }
`;

interface SessionDashboardIntegrationProps {
  /** Force a specific view regardless of user role (useful for testing) */
  forceView?: 'admin' | 'trainer' | 'client' | 'user';
  /** Additional CSS class for styling */
  className?: string;
  /** Whether to show the full dashboard or a compact version */
  compact?: boolean;
}

/**
 * SessionDashboardIntegration Component
 * 
 * This component automatically detects the user's role and shows the appropriate
 * session management interface:
 * 
 * - Admin: Full session manager with all user oversight
 * - Trainer: Client session monitoring and progress tracking
 * - Client/User: Personal session dashboard and controls
 * 
 * Usage in any dashboard:
 * ```tsx
 * import SessionDashboardIntegration from '../components/SessionDashboard/SessionDashboardIntegration';
 * 
 * const MyDashboard = () => (
 *   <div>
 *     <h1>My Dashboard</h1>
 *     <SessionDashboardIntegration />
 *   </div>
 * );
 * ```
 */
const SessionDashboardIntegration: React.FC<SessionDashboardIntegrationProps> = ({
  forceView,
  className,
  compact = false
}) => {
  const { user, isAuthenticated } = useAuth();

  // Check authentication
  if (!isAuthenticated || !user) {
    return (
      <IntegrationContainer className={className}>
        <AccessDenied>
          <div className="icon">🔒</div>
          <div className="message">Please log in to access session management</div>
          <div className="submessage">Session tracking requires authentication</div>
        </AccessDenied>
      </IntegrationContainer>
    );
  }

  // Determine which view to show
  const viewType = forceView || user.role;

  return (
    <IntegrationContainer className={className}>
      {viewType === 'admin' && <AdminSessionManager />}
      {viewType === 'trainer' && <TrainerClientSessions />}
      {(viewType === 'client' || viewType === 'user') && <SessionDashboard />}
    </IntegrationContainer>
  );
};

export default SessionDashboardIntegration;