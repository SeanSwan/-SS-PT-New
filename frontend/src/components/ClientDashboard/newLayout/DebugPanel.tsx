import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Bug, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * MINIMAL DEBUG PANEL - Placeholder for Development
 * 
 * This is a simplified version created to unblock MUI removal.
 * The full debug panel with comprehensive diagnostics has been archived.
 * 
 * Current functionality:
 * - Displays current user role
 * - Shows basic API connection status
 * 
 * Future enhancements can be added after successful deployment.
 */

const DebugContainer = styled.div`
  padding: 1.5rem;
  margin-bottom: 2rem;
  background-color: rgba(20, 20, 40, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const DebugHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  svg {
    width: 28px;
    height: 28px;
    color: #00ffff;
  }
`;

const DebugTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #00ffff;
  font-weight: 600;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const InfoCard = styled.div`
  padding: 1rem;
  background-color: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const InfoLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoValue = styled.div<{ $status?: 'success' | 'warning' | 'error' }>`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ $status }) => {
    switch ($status) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ffc107';
      case 'error':
        return '#f44336';
      default:
        return 'rgba(255, 255, 255, 0.9)';
    }
  }};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const StatusBadge = styled.div<{ $status: 'online' | 'offline' | 'unknown' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${({ $status }) => {
    switch ($status) {
      case 'online':
        return 'rgba(76, 175, 80, 0.2)';
      case 'offline':
        return 'rgba(244, 67, 54, 0.2)';
      default:
        return 'rgba(158, 158, 158, 0.2)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'online':
        return '#4caf50';
      case 'offline':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }};
  border: 1px solid ${({ $status }) => {
    switch ($status) {
      case 'online':
        return 'rgba(76, 175, 80, 0.3)';
      case 'offline':
        return 'rgba(244, 67, 54, 0.3)';
      default:
        return 'rgba(158, 158, 158, 0.3)';
    }
  }};
`;

const StatusIndicator = styled.div<{ $online: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $online }) => $online ? '#4caf50' : '#f44336'};
  box-shadow: 0 0 8px ${({ $online }) => $online ? '#4caf50' : '#f44336'};
`;

const Note = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: rgba(0, 217, 255, 0.1);
  border-left: 3px solid #00d9ff;
  border-radius: 4px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

/**
 * DebugPanel Component - Minimal Version
 * 
 * Displays essential development information without complex dependencies.
 */
const DebugPanel: React.FC = () => {
  const [userRole, setUserRole] = useState<string>('Loading...');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [userFound, setUserFound] = useState<boolean>(false);

  useEffect(() => {
    // Check for user authentication
    const checkAuth = () => {
      try {
        // Check localStorage for auth data
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
        
        if (userString) {
          try {
            const user = JSON.parse(userString);
            setUserRole(user.role || 'Unknown');
            setUserFound(true);
          } catch (e) {
            setUserRole('Parse Error');
          }
        } else if (token) {
          // Try to decode JWT token
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const decodedToken = JSON.parse(window.atob(base64));
            setUserRole(decodedToken.role || 'Token Valid');
            setUserFound(true);
          } catch (e) {
            setUserRole('Invalid Token');
          }
        } else {
          setUserRole('Not Authenticated');
          setUserFound(false);
        }
      } catch (error) {
        setUserRole('Error');
        setUserFound(false);
      }
    };

    // Check API connectivity
    const checkAPI = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`
          }
        });
        
        if (response.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (error) {
        setApiStatus('offline');
      }
    };

    checkAuth();
    checkAPI();
    
    // Recheck every 30 seconds
    const interval = setInterval(() => {
      checkAuth();
      checkAPI();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DebugContainer>
      <DebugHeader>
        <Bug />
        <DebugTitle>Development Diagnostics</DebugTitle>
      </DebugHeader>

      <InfoGrid>
        <InfoCard>
          <InfoLabel>User Role</InfoLabel>
          <InfoValue $status={userFound ? 'success' : 'warning'}>
            {userFound ? <CheckCircle /> : <AlertCircle />}
            {userRole}
          </InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>API Status</InfoLabel>
          <InfoValue>
            <StatusBadge $status={apiStatus}>
              <StatusIndicator $online={apiStatus === 'online'} />
              {apiStatus === 'online' ? 'Connected' : apiStatus === 'offline' ? 'Disconnected' : 'Checking...'}
            </StatusBadge>
          </InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Environment</InfoLabel>
          <InfoValue>
            {import.meta.env.DEV ? '🔧 Development' : '🚀 Production'}
          </InfoValue>
        </InfoCard>
      </InfoGrid>

      <Note>
        <strong>📝 Note:</strong> This is a simplified debug panel created during MUI removal. 
        The full diagnostic panel with comprehensive testing tools has been archived and can be 
        restored after successful deployment. Current focus: production stability.
      </Note>
    </DebugContainer>
  );
};

export default DebugPanel;
