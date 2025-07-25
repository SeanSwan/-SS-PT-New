/**
 * Session Count Integration for Universal Master Schedule
 * =====================================================
 * 
 * This enhancement integrates real-time session count display
 * into the Universal Master Schedule interface.
 * 
 * Features:
 * - Real-time session count display in session details
 * - Client session balance indicators
 * - Low session count warnings
 * - Integration with SessionAllocationManager
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { CreditCard, AlertTriangle, CheckCircle, RefreshCw, Users } from 'lucide-react';

// ==================== INTERFACES ====================

interface SessionCountDisplayProps {
  clientId?: number;
  sessionData?: any;
  onSessionCountUpdate?: () => void;
}

interface ClientSessionInfo {
  id: number;
  firstName: string;
  lastName: string;
  availableSessions: number;
  totalSessionsPurchased: number;
  sessionsUsed: number;
  lastSessionDate?: string;
}

// ==================== STYLED COMPONENTS ====================

const SessionCountContainer = styled(motion.div)`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin: 0.5rem 0;
`;

const SessionCountHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  
  .title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .refresh-btn {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(59, 130, 246, 0.2);
    }
  }
`;

const SessionCountGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
`;

const SessionCountItem = styled.div<{ type: 'available' | 'used' | 'total' }>`
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: ${props => {
    switch (props.type) {
      case 'available': return 'rgba(16, 185, 129, 0.2)';
      case 'used': return 'rgba(59, 130, 246, 0.2)';
      default: return 'rgba(156, 163, 175, 0.2)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.type) {
      case 'available': return 'rgba(16, 185, 129, 0.3)';
      case 'used': return 'rgba(59, 130, 246, 0.3)';
      default: return 'rgba(156, 163, 175, 0.3)';
    }
  }};
  border-radius: 6px;
  
  .count {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.25rem;
  }
  
  .label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const SessionWarning = styled(motion.div)<{ type: 'low' | 'none' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-top: 0.75rem;
  border-radius: 6px;
  
  background: ${props => 
    props.type === 'none' 
      ? 'rgba(239, 68, 68, 0.2)' 
      : 'rgba(245, 158, 11, 0.2)'
  };
  
  border: 1px solid ${props => 
    props.type === 'none' 
      ? 'rgba(239, 68, 68, 0.3)' 
      : 'rgba(245, 158, 11, 0.3)'
  };
  
  color: ${props => 
    props.type === 'none' 
      ? '#ef4444' 
      : '#f59e0b'
  };
  
  font-size: 0.8rem;
  font-weight: 500;
`;

const QuickActionButton = styled.button`
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
  border-radius: 6px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  width: 100%;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const ClientInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  
  .client-name {
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .client-email {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
  }
`;

// ==================== MAIN COMPONENT ====================

const SessionCountDisplay: React.FC<SessionCountDisplayProps> = ({
  clientId,
  sessionData,
  onSessionCountUpdate
}) => {
  const [clientInfo, setClientInfo] = useState<ClientSessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load client session information
  const loadClientInfo = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get client information
      const clientResponse = await fetch(`/api/sessions/clients`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (clientResponse.ok) {
        const clients = await clientResponse.json();
        const client = clients.find((c: any) => c.id === clientId);
        
        if (client) {
          // Get session summary
          const summaryResponse = await fetch(`/api/sessions/user-summary/${clientId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          let sessionSummary = {
            available: client.availableSessions || 0,
            scheduled: 0,
            completed: 0,
            cancelled: 0,
            total: 0
          };
          
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            sessionSummary = summaryData.data || sessionSummary;
          }
          
          setClientInfo({
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            availableSessions: client.availableSessions || 0, // 🚨 CRITICAL: Use client field directly
            totalSessionsPurchased: sessionSummary.total,
            sessionsUsed: sessionSummary.completed,
            lastSessionDate: null // TODO: Get from summary
          });
        }
      }
    } catch (error) {
      console.error('Error loading client info:', error);
      setError('Failed to load client session information');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data when clientId changes
  useEffect(() => {
    loadClientInfo();
  }, [clientId]);
  
  // Handle refresh
  const handleRefresh = () => {
    loadClientInfo();
    onSessionCountUpdate?.();
  };
  
  // Navigate to Session Allocation Manager
  const handleManageSessions = () => {
    window.open('/dashboard/admin/session-allocation', '_blank');
  };
  
  if (!clientId) {
    return (
      <SessionCountContainer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SessionCountHeader>
          <div className=\"title\">
            <Users size={16} />
            Session Information
          </div>
        </SessionCountHeader>
        <div style={{ 
          textAlign: 'center', 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '0.8rem',
          padding: '1rem'
        }}>
          Select a session with an assigned client to view session counts
        </div>
      </SessionCountContainer>
    );
  }
  
  if (loading) {
    return (
      <SessionCountContainer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SessionCountHeader>
          <div className=\"title\">
            <CreditCard size={16} />
            Loading Session Info...
          </div>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
        </SessionCountHeader>
      </SessionCountContainer>
    );
  }
  
  if (error || !clientInfo) {
    return (
      <SessionCountContainer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SessionCountHeader>
          <div className=\"title\">
            <AlertTriangle size={16} />
            Session Info Error
          </div>
          <button className=\"refresh-btn\" onClick={handleRefresh}>
            <RefreshCw size={14} />
          </button>
        </SessionCountHeader>
        <div style={{ 
          color: 'rgba(239, 68, 68, 0.8)', 
          fontSize: '0.8rem',
          textAlign: 'center'
        }}>
          {error || 'Failed to load session information'}
        </div>
      </SessionCountContainer>
    );
  }
  
  const getWarningType = (): 'low' | 'none' | null => {
    if (clientInfo.availableSessions === 0) return 'none';
    if (clientInfo.availableSessions <= 3) return 'low';
    return null;
  };
  
  const warningType = getWarningType();
  
  return (
    <SessionCountContainer
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <SessionCountHeader>
        <div className=\"title\">
          <CreditCard size={16} />
          Session Balance
        </div>
        <button className=\"refresh-btn\" onClick={handleRefresh}>
          <RefreshCw size={14} />
        </button>
      </SessionCountHeader>
      
      <ClientInfoRow>
        <Users size={16} style={{ color: '#3b82f6' }} />
        <div>
          <div className=\"client-name\">
            {clientInfo.firstName} {clientInfo.lastName}
          </div>
          <div className=\"client-email\">ID: {clientInfo.id}</div>
        </div>
      </ClientInfoRow>
      
      <SessionCountGrid>
        <SessionCountItem type=\"available\">
          <div className=\"count\">{clientInfo.availableSessions}</div>
          <div className=\"label\">Available</div>
        </SessionCountItem>
        <SessionCountItem type=\"used\">
          <div className=\"count\">{clientInfo.sessionsUsed}</div>
          <div className=\"label\">Completed</div>
        </SessionCountItem>
        <SessionCountItem type=\"total\">
          <div className=\"count\">{clientInfo.totalSessionsPurchased}</div>
          <div className=\"label\">Total</div>
        </SessionCountItem>
      </SessionCountGrid>
      
      {warningType && (
        <SessionWarning
          type={warningType}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertTriangle size={16} />
          {warningType === 'none' 
            ? 'Client has no available sessions. Add sessions to enable booking.'
            : 'Client has low session count. Consider adding more sessions.'
          }
        </SessionWarning>
      )}
      
      <QuickActionButton onClick={handleManageSessions}>
        <CreditCard size={14} />
        Manage Sessions
      </QuickActionButton>
    </SessionCountContainer>
  );
};

export default SessionCountDisplay;