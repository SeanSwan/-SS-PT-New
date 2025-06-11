/**
 * Contact Notifications Component - EMERGENCY PRODUCTION FIX
 * =========================================================
 * Fixed all styled-components prop forwarding issues for production stability
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Mail, 
  Clock, 
  User, 
  CheckCircle, 
  Bell, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X
} from 'lucide-react';
import apiService from '../../../../../services/api.service';

// === ANIMATIONS ===
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const slideIn = keyframes`
  from { 
    transform: translateX(100%); 
    opacity: 0; 
  }
  to { 
    transform: translateX(0); 
    opacity: 1; 
  }
`;

// === SAFE STYLED COMPONENTS (PRODUCTION-READY) ===
const NotificationContainer = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  margin-bottom: 1rem;
  min-height: 200px;
  
  &:hover {
    background: rgba(30, 58, 138, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.2);
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  
  h3 {
    color: #00ffff;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
`;

// SAFE: Basic div with conditional styling via CSS classes
const NotificationBadgeBase = styled.div`
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &.urgent {
    background: #ef4444;
    animation: ${pulse} 2s infinite;
  }
  
  &.normal {
    background: #f59e0b;
  }
`;

// SAFE: Use regular div with dynamic styling instead of styled components with props
const ContactCardBase = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  position: relative;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &.unviewed {
    animation: ${slideIn} 0.5s ease-out;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 8px;
      height: 8px;
      background: #00ffff;
      border-radius: 50%;
      box-shadow: 0 0 12px #00ffff;
    }
  }
  
  &.priority-urgent {
    border-left: 4px solid #ef4444;
  }
  
  &.priority-high {
    border-left: 4px solid #f59e0b;
  }
  
  &.priority-normal {
    border-left: 4px solid #3b82f6;
  }
  
  &.priority-low {
    border-left: 4px solid #6b7280;
  }
`;

const ContactHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const ContactInfo = styled.div`
  flex: 1;
  
  .name {
    font-weight: 600;
    font-size: 1rem;
    color: #ffffff;
    margin-bottom: 0.25rem;
  }
  
  .email {
    color: #00ffff;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }
  
  .time {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
`;

const ContactMessage = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  margin: 0.75rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  line-height: 1.4;
  max-height: 80px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 2px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

// SAFE: Use CSS classes instead of props for variants
const ActionButtonBase = styled(motion.button)`
  border-radius: 8px;
  color: #ffffff;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  &.primary {
    background: linear-gradient(45deg, #3b82f6 0%, #00ffff 100%);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  
  &.success {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.refresh {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    
    &:hover {
      background: rgba(59, 130, 246, 0.3);
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
  
  .icon {
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: rgba(255, 255, 255, 0.8);
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
  }
`;

// === INTERFACES ===
interface Contact {
  id: number;
  name: string;
  email: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  viewedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContactNotificationsProps {
  autoRefresh?: boolean;
  maxContacts?: number;
  showActions?: boolean;
}

// === SAFE COMPONENT (NO PROP FORWARDING ISSUES) ===
const ContactNotifications: React.FC<ContactNotificationsProps> = ({
  autoRefresh = true,
  maxContacts = 10,
  showActions = true
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  // === API FUNCTIONS ===
  const fetchContacts = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.get('/api/admin/contacts/recent');

      if (response.data && response.data.success) {
        setContacts(response.data.contacts.slice(0, maxContacts));
        setLastFetch(new Date());
      } else {
        throw new Error(response.data?.message || 'Failed to fetch contacts');
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [maxContacts]);

  const markAsViewed = useCallback(async (contactId: number) => {
    try {
      const response = await apiService.patch(`/api/admin/contacts/${contactId}/viewed`);

      if (response.data && response.data.success) {
        setContacts(prev => 
          prev.map(contact => 
            contact.id === contactId 
              ? { ...contact, viewedAt: new Date().toISOString() }
              : contact
          )
        );
      } else {
        throw new Error('Failed to mark contact as viewed');
      }
    } catch (err) {
      console.error('Error marking contact as viewed:', err);
    }
  }, []);

  // === EFFECTS ===
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchContacts, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchContacts]);

  // === UTILITY FUNCTIONS ===
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getUnviewedCount = (): number => {
    return contacts.filter(contact => !contact.viewedAt).length;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'normal': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // === RENDER ===
  if (loading) {
    return (
      <NotificationContainer>
        <NotificationHeader>
          <h3>
            <MessageSquare size={20} />
            Loading Contact Notifications...
          </h3>
        </NotificationHeader>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading...
        </div>
      </NotificationContainer>
    );
  }

  if (error) {
    return (
      <NotificationContainer>
        <NotificationHeader>
          <h3>
            <AlertCircle size={20} />
            Contact Notifications Error
          </h3>
        </NotificationHeader>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
          <p>{error}</p>
          <ActionButtonBase 
            className="refresh" 
            onClick={fetchContacts} 
            style={{ marginTop: '1rem' }}
          >
            <RefreshCw size={16} />
            Retry
          </ActionButtonBase>
        </div>
      </NotificationContainer>
    );
  }

  return (
    <NotificationContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <NotificationHeader>
        <h3>
          <Bell size={20} />
          Contact Notifications
          {getUnviewedCount() > 0 && (
            <NotificationBadgeBase className={getUnviewedCount() > 3 ? 'urgent' : 'normal'}>
              <AlertCircle size={12} />
              {getUnviewedCount()} new
            </NotificationBadgeBase>
          )}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Last updated: {formatTimeAgo(lastFetch.toISOString())}
          </span>
          <ActionButtonBase className="refresh" onClick={fetchContacts}>
            <RefreshCw size={16} />
          </ActionButtonBase>
        </div>
      </NotificationHeader>

      {contacts.length === 0 ? (
        <EmptyState>
          <div className="icon">
            <MessageSquare size={48} />
          </div>
          <h4>No Recent Contacts</h4>
          <p>All caught up! No new consultation requests in the last 24 hours.</p>
        </EmptyState>
      ) : (
        <AnimatePresence mode="popLayout">
          {contacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ContactCardBase
                className={`
                  priority-${contact.priority} 
                  ${!contact.viewedAt ? 'unviewed' : ''}
                `}
              >
                <ContactHeader>
                  <ContactInfo>
                    <div className="name">
                      <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                      {contact.name}
                    </div>
                    <div className="email">
                      <Mail size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                      {contact.email}
                    </div>
                    <div className="time">
                      <Clock size={12} />
                      {formatTimeAgo(contact.createdAt)}
                      {contact.priority !== 'normal' && (
                        <span style={{ 
                          color: getPriorityColor(contact.priority),
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          • {contact.priority}
                        </span>
                      )}
                    </div>
                  </ContactInfo>
                  
                  {showActions && (
                    <ActionButtons>
                      {!contact.viewedAt && (
                        <ActionButtonBase
                          className="success"
                          onClick={() => markAsViewed(contact.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <CheckCircle size={14} />
                          Mark Viewed
                        </ActionButtonBase>
                      )}
                      <ActionButtonBase
                        className="primary"
                        onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ExternalLink size={14} />
                        Reply
                      </ActionButtonBase>
                    </ActionButtons>
                  )}
                </ContactHeader>

                <ContactMessage>
                  {contact.message}
                </ContactMessage>
              </ContactCardBase>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {contacts.length > 0 && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '1rem', 
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <ActionButtonBase
            className="primary"
            onClick={() => {/* Navigate to full contacts management */}}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ExternalLink size={16} />
            View All Contacts ({contacts.length})
          </ActionButtonBase>
        </div>
      )}
    </NotificationContainer>
  );
};

export default ContactNotifications;
