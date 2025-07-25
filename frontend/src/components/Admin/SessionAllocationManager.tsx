/**
 * Session Allocation Manager
 * =========================
 * 
 * CRITICAL COMPONENT: Manages client session counts and allocation
 * Integrates with the Universal Master Schedule for proper session tracking
 * 
 * Features:
 * - View client session balances
 * - Add sessions to client accounts (Admin)
 * - Track session usage and deduction
 * - Monitor session allocation from orders
 * - Real-time session count updates
 * 
 * This ensures proper session flow: Purchase → Allocation → Scheduling → Deduction
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  Users, UserPlus, CreditCard, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle, Plus, Minus, RefreshCw,
  Search, Filter, Download, Eye, Edit, Clock
} from 'lucide-react';

// Import services
import sessionService from '../../services/sessionService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

// ==================== INTERFACES ====================

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  totalSessionsPurchased: number;
  sessionsUsed: number;
  lastSessionDate?: string;
  createdAt: string;
}

interface SessionSummary {
  userId: number;
  available: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  total: number;
}

interface SessionAllocationManagerProps {
  onSessionCountChange?: () => void;
}

// ==================== STYLED COMPONENTS ====================

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
  min-height: 600px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h2 {
    color: white;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.5rem;
    font-weight: 600;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'success' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  background: ${props => {
    switch (props.variant) {
      case 'primary': return '#3b82f6';
      case 'success': return '#10b981';
      case 'danger': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  
  color: white;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div<{ type: 'primary' | 'success' | 'warning' | 'info' }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${props => {
    switch (props.type) {
      case 'primary': return 'rgba(59, 130, 246, 0.3)';
      case 'success': return 'rgba(16, 185, 129, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      default: return 'rgba(6, 182, 212, 0.3)';
    }
  }};
  border-radius: 8px;
  padding: 1.5rem;
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const ClientsTable = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 120px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  .header-cell {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const TableRow = styled(motion.div)`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 120px;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .cell {
    color: white;
    display: flex;
    align-items: center;
    font-size: 0.9rem;
  }
  
  .client-info {
    flex-direction: column;
    align-items: flex-start;
    
    .name {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .email {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
    }
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    
    .cell {
      justify-content: space-between;
    }
    
    .cell::before {
      content: attr(data-label);
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
    }
  }
`;

const SessionBadge = styled.span<{ type: 'good' | 'low' | 'none' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  
  background: ${props => {
    switch (props.type) {
      case 'good': return 'rgba(16, 185, 129, 0.2)';
      case 'low': return 'rgba(245, 158, 11, 0.2)';
      default: return 'rgba(239, 68, 68, 0.2)';
    }
  }};
  
  color: ${props => {
    switch (props.type) {
      case 'good': return '#10b981';
      case 'low': return '#f59e0b';
      default: return '#ef4444';
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.type) {
      case 'good': return 'rgba(16, 185, 129, 0.3)';
      case 'low': return 'rgba(245, 158, 11, 0.3)';
      default: return 'rgba(239, 68, 68, 0.3)';
    }
  }};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.3);
    transform: scale(1.1);
  }
  
  &.success {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    
    &:hover {
      background: rgba(16, 185, 129, 0.3);
    }
  }
  
  &.danger {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    
    &:hover {
      background: rgba(239, 68, 68, 0.3);
    }
  }
`;

const Modal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  border: 1px solid rgba(59, 130, 246, 0.3);
  
  h3 {
    color: white;
    margin: 0 0 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
    
    label {
      display: block;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    input, textarea {
      width: 100%;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 0.9rem;
      
      &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      &::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
    }
    
    textarea {
      resize: vertical;
      min-height: 80px;
    }
  }
  
  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
`;

// ==================== MAIN COMPONENT ====================

const SessionAllocationManager: React.FC<SessionAllocationManagerProps> = ({ onSessionCountChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [addSessionCount, setAddSessionCount] = useState(1);
  const [addSessionReason, setAddSessionReason] = useState('');
  
  // Load data on mount
  useEffect(() => {
    loadClientSessionData();
  }, []);
  
  const loadClientSessionData = async () => {
    try {
      setLoading(true);
      
      // Get all clients first
      const clientsResponse = await sessionService.getClients();
      
      // Get session summaries for each client
      const clientsWithSessions = await Promise.all(
        clientsResponse.map(async (client: any) => {
          try {
            // Get session summary from backend
            const sessionSummaryResponse = await fetch(`/api/sessions/user-summary/${client.id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            let summary: SessionSummary = {
              userId: client.id,
              available: 0,
              scheduled: 0,
              completed: 0,
              cancelled: 0,
              total: 0
            };
            
            if (sessionSummaryResponse.ok) {
              const summaryData = await sessionSummaryResponse.json();
              summary = summaryData.data || summary;
            }
            
            return {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email,
              availableSessions: client.availableSessions || 0, // 🚨 CRITICAL: Use client field directly
              totalSessionsPurchased: summary.total,
              sessionsUsed: summary.completed,
              lastSessionDate: null, // TODO: Get from backend
              createdAt: client.createdAt || new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error fetching sessions for client ${client.id}:`, error);
            return {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email,
              availableSessions: client.availableSessions || 0,
              totalSessionsPurchased: 0,
              sessionsUsed: 0,
              lastSessionDate: null,
              createdAt: client.createdAt || new Date().toISOString()
            };
          }
        })
      );
      
      setClients(clientsWithSessions);
    } catch (error) {
      console.error('Error loading client session data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client session data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddSessions = async () => {
    if (!selectedClient) return;
    
    try {
      const response = await fetch('/api/sessions/add-to-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: selectedClient.id,
          sessionCount: addSessionCount,
          reason: addSessionReason || 'Admin added sessions'
        })
      });
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Added ${addSessionCount} sessions to ${selectedClient.firstName} ${selectedClient.lastName}`,
          variant: 'default'
        });
        
        // Refresh data
        await loadClientSessionData();
        onSessionCountChange?.();
        
        // Close modal
        setShowAddModal(false);
        setSelectedClient(null);
        setAddSessionCount(1);
        setAddSessionReason('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add sessions');
      }
    } catch (error: any) {
      console.error('Error adding sessions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add sessions',
        variant: 'destructive'
      });
    }
  };
  
  const filteredClients = clients.filter(client => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      client.firstName.toLowerCase().includes(searchTerm) ||
      client.lastName.toLowerCase().includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm)
    );
  });
  
  const getSessionBadgeType = (available: number): 'good' | 'low' | 'none' => {
    if (available === 0) return 'none';
    if (available <= 3) return 'low';
    return 'good';
  };
  
  // Calculate stats
  const stats = {
    totalClients: clients.length,
    totalAvailableSessions: clients.reduce((sum, client) => sum + client.availableSessions, 0),
    totalCompletedSessions: clients.reduce((sum, client) => sum + client.sessionsUsed, 0),
    clientsNeedingSessions: clients.filter(client => client.availableSessions === 0).length
  };
  
  if (loading) {
    return (
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
        </div>
      </Container>
    );
  }
  
  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Header>
        <h2>
          <CreditCard size={24} />
          Session Allocation Manager
        </h2>
        <Button variant="primary" onClick={loadClientSessionData}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </Header>
      
      {/* Stats Grid */}
      <StatsGrid>
        <StatCard type="primary">
          <div className="stat-value">{stats.totalClients}</div>
          <div className="stat-label">
            <Users size={16} />
            Total Clients
          </div>
        </StatCard>
        <StatCard type="success">
          <div className="stat-value">{stats.totalAvailableSessions}</div>
          <div className="stat-label">
            <Calendar size={16} />
            Available Sessions
          </div>
        </StatCard>
        <StatCard type="info">
          <div className="stat-value">{stats.totalCompletedSessions}</div>
          <div className="stat-label">
            <CheckCircle size={16} />
            Completed Sessions
          </div>
        </StatCard>
        <StatCard type="warning">
          <div className="stat-value">{stats.clientsNeedingSessions}</div>
          <div className="stat-label">
            <AlertTriangle size={16} />
            Need Sessions
          </div>
        </StatCard>
      </StatsGrid>
      
      {/* Action Bar */}
      <ActionBar>
        <SearchInput
          type="text"
          placeholder="Search clients by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="secondary">
          <Filter size={16} />
          Filter
        </Button>
        <Button variant="secondary">
          <Download size={16} />
          Export
        </Button>
      </ActionBar>
      
      {/* Clients Table */}
      <ClientsTable>
        <TableHeader>
          <div className="header-cell">Client</div>
          <div className="header-cell">Available</div>
          <div className="header-cell">Total Purchased</div>
          <div className="header-cell">Completed</div>
          <div className="header-cell">Status</div>
          <div className="header-cell">Actions</div>
        </TableHeader>
        
        {filteredClients.map((client) => (
          <TableRow
            key={client.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="cell client-info">
              <div className="name">{client.firstName} {client.lastName}</div>
              <div className="email">{client.email}</div>
            </div>
            <div className="cell" data-label="Available">
              {client.availableSessions}
            </div>
            <div className="cell" data-label="Total Purchased">
              {client.totalSessionsPurchased}
            </div>
            <div className="cell" data-label="Completed">
              {client.sessionsUsed}
            </div>
            <div className="cell" data-label="Status">
              <SessionBadge type={getSessionBadgeType(client.availableSessions)}>
                {client.availableSessions === 0 ? 'No Sessions' : 
                 client.availableSessions <= 3 ? 'Low' : 'Good'}
              </SessionBadge>
            </div>
            <div className="cell" data-label="Actions">
              <ActionButtons>
                <IconButton
                  className="success"
                  onClick={() => {
                    setSelectedClient(client);
                    setShowAddModal(true);
                  }}
                  title="Add Sessions"
                >
                  <Plus size={14} />
                </IconButton>
                <IconButton
                  onClick={() => {
                    // TODO: Implement view client details
                  }}
                  title="View Details"
                >
                  <Eye size={14} />
                </IconButton>
              </ActionButtons>
            </div>
          </TableRow>
        ))}
        
        {filteredClients.length === 0 && (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.6)' 
          }}>
            {searchQuery ? 'No clients match your search' : 'No clients found'}
          </div>
        )}
      </ClientsTable>
      
      {/* Add Sessions Modal */}
      <AnimatePresence>
        {showAddModal && selectedClient && (
          <Modal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>
                <Plus size={20} />
                Add Sessions to {selectedClient.firstName} {selectedClient.lastName}
              </h3>
              
              <div className="form-group">
                <label>Number of Sessions</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={addSessionCount}
                  onChange={(e) => setAddSessionCount(parseInt(e.target.value) || 1)}
                  placeholder="Enter number of sessions"
                />
              </div>
              
              <div className="form-group">
                <label>Reason (Optional)</label>
                <textarea
                  value={addSessionReason}
                  onChange={(e) => setAddSessionReason(e.target.value)}
                  placeholder="Reason for adding sessions (e.g., Promotional bonus, Refund, etc.)"
                />
              </div>
              
              <div className="modal-actions">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleAddSessions}
                >
                  <Plus size={16} />
                  Add {addSessionCount} Session{addSessionCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default SessionAllocationManager;