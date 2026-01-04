/**
 * ClientSessionHistory.tsx
 *
 * Modal component displaying session history for a client
 * - Brand-consistent styling with SwanStudios design tokens
 * - Animated modal with Framer Motion
 * - Displays session details (date, duration, status, trainer)
 * - Sortable and filterable session list
 * - Responsive design for mobile/tablet/desktop
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, MapPin, FileText, Filter, TrendingUp, Award } from 'lucide-react';
import moment from 'moment';
import { theme, prefersReducedMotion } from '../../../../../theme/tokens';
import type { Session } from '../../../../../components/UniversalMasterSchedule/types';

// ==================== TYPES ====================

interface ClientSessionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
}

// ==================== STYLED COMPONENTS ====================

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: ${theme.spacing.md};
`;

const ModalContainer = styled(motion.div)`
  background: linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%);
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  max-width: 900px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  /* Subtle gradient border */
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    border-radius: 16px;
    background: linear-gradient(
      135deg,
      ${theme.colors.brand.cyan} 0%,
      ${theme.colors.brand.purple} 100%
    );
    z-index: -1;
    opacity: 0.3;
  }
`;

const ModalHeader = styled.div`
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  min-height: 60px;

  /* Gradient underline */
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${theme.colors.brand.cyan} 25%,
      ${theme.colors.brand.purple} 75%,
      transparent 100%
    );
  }

  @media (max-width: 768px) {
    padding: ${theme.spacing.md};
  }
`;

const ModalTitle = styled.h2`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  @media (max-width: 768px) {
    font-size: ${theme.typography.fontSize.xl};
  }
`;

const CloseButton = styled.button`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #ef4444;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ModalContent = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.3);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 255, 255, 0.5);
    }
  }

  @media (max-width: 768px) {
    padding: ${theme.spacing.md};
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: ${theme.spacing.sm};
  }
`;

const StatCard = styled.div`
  flex: 1;
  min-width: 140px;
  padding: ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  @media (max-width: 768px) {
    min-width: 100px;
    padding: ${theme.spacing.sm};
  }
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.brand.cyan};

  @media (max-width: 768px) {
    font-size: ${theme.typography.fontSize.xl};
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${props => props.active ? theme.colors.brand.cyan : 'rgba(0, 255, 255, 0.2)'};
  background: ${props => props.active ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'};
  color: ${props => props.active ? theme.colors.brand.cyan : theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: ${theme.colors.brand.cyan};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SessionCard = styled(motion.div)`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 8px;
  padding: ${theme.spacing.md};
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${theme.spacing.md};
  align-items: start;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(0, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.sm};
  }
`;

const SessionDate = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
  min-width: 80px;

  @media (max-width: 768px) {
    flex-direction: row;
    gap: ${theme.spacing.sm};
    min-width: unset;
    justify-content: flex-start;
  }
`;

const SessionMonth = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.brand.cyan};
  text-transform: uppercase;
  font-weight: ${theme.typography.fontWeight.semibold};
`;

const SessionDay = styled.div`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  line-height: 1;

  @media (max-width: 768px) {
    font-size: ${theme.typography.fontSize.xl};
  }
`;

const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const SessionTime = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const SessionInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xs};

  @media (max-width: 768px) {
    gap: ${theme.spacing.sm};
  }
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};

  svg {
    width: 14px;
    height: 14px;
    color: ${theme.colors.brand.cyan};
  }
`;

const StatusBadge = styled.div<{ status: Session['status'] }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 6px;
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.semibold};
  text-transform: capitalize;
  white-space: nowrap;
  align-self: start;

  ${props => {
    switch (props.status) {
      case 'completed':
        return `
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        `;
      case 'confirmed':
        return `
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #3b82f6;
        `;
      case 'scheduled':
        return `
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.3);
          color: #a855f7;
        `;
      case 'cancelled':
        return `
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        `;
      case 'requested':
        return `
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        `;
      case 'available':
      default:
        return `
          background: rgba(156, 163, 175, 0.1);
          border: 1px solid rgba(156, 163, 175, 0.3);
          color: #9ca3af;
        `;
    }
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.text.secondary};

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: ${theme.spacing.md};
    color: rgba(0, 255, 255, 0.3);
  }

  p {
    font-size: ${theme.typography.fontSize.base};
    margin: ${theme.spacing.sm} 0 0;
  }
`;

// ==================== COMPONENT ====================

const ClientSessionHistory: React.FC<ClientSessionHistoryProps> = ({
  isOpen,
  onClose,
  sessions
}) => {
  const [statusFilter, setStatusFilter] = useState<Session['status'] | 'all'>('all');

  // Calculate statistics
  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const upcoming = sessions.filter(s =>
      (s.status === 'scheduled' || s.status === 'confirmed') &&
      moment(s.sessionDate).isAfter(moment())
    ).length;
    const totalHours = sessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.duration || 60), 0) / 60;

    return { total, completed, upcoming, totalHours };
  }, [sessions]);

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) =>
      moment(b.sessionDate).valueOf() - moment(a.sessionDate).valueOf()
    );
  }, [sessions, statusFilter]);

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3
      }
    })
  };

  // Handle ESC key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <ModalContainer
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <ModalHeader>
              <ModalTitle>
                <Calendar size={24} />
                Session History
              </ModalTitle>
              <CloseButton onClick={onClose} title="Close">
                <X size={20} />
              </CloseButton>
            </ModalHeader>

            {/* Content */}
            <ModalContent>
              {/* Stats Bar */}
              <StatsBar>
                <StatCard>
                  <StatLabel>
                    <TrendingUp size={14} />
                    Total Sessions
                  </StatLabel>
                  <StatValue>{stats.total}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>
                    <Award size={14} />
                    Completed
                  </StatLabel>
                  <StatValue>{stats.completed}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>
                    <Calendar size={14} />
                    Upcoming
                  </StatLabel>
                  <StatValue>{stats.upcoming}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>
                    <Clock size={14} />
                    Total Hours
                  </StatLabel>
                  <StatValue>{stats.totalHours.toFixed(1)}</StatValue>
                </StatCard>
              </StatsBar>

              {/* Filter Bar */}
              <FilterBar>
                <FilterButton
                  active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </FilterButton>
                <FilterButton
                  active={statusFilter === 'completed'}
                  onClick={() => setStatusFilter('completed')}
                >
                  Completed
                </FilterButton>
                <FilterButton
                  active={statusFilter === 'confirmed'}
                  onClick={() => setStatusFilter('confirmed')}
                >
                  Confirmed
                </FilterButton>
                <FilterButton
                  active={statusFilter === 'scheduled'}
                  onClick={() => setStatusFilter('scheduled')}
                >
                  Scheduled
                </FilterButton>
                <FilterButton
                  active={statusFilter === 'cancelled'}
                  onClick={() => setStatusFilter('cancelled')}
                >
                  Cancelled
                </FilterButton>
              </FilterBar>

              {/* Session List */}
              {filteredSessions.length === 0 ? (
                <EmptyState>
                  <Calendar />
                  <p>No sessions found matching this filter.</p>
                </EmptyState>
              ) : (
                <SessionList>
                  {filteredSessions.map((session, index) => {
                    const sessionMoment = moment(session.sessionDate);
                    const trainerName = session.trainer
                      ? `${session.trainer.firstName} ${session.trainer.lastName}`
                      : 'No trainer assigned';

                    return (
                      <SessionCard
                        key={session.id}
                        custom={index}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {/* Date Column */}
                        <SessionDate>
                          <SessionMonth>{sessionMoment.format('MMM')}</SessionMonth>
                          <SessionDay>{sessionMoment.format('DD')}</SessionDay>
                        </SessionDate>

                        {/* Details Column */}
                        <SessionDetails>
                          <SessionTime>
                            <Clock size={16} />
                            {sessionMoment.format('h:mm A')} ({session.duration || 60} min)
                          </SessionTime>
                          <SessionInfo>
                            <InfoItem>
                              <User size={14} />
                              {trainerName}
                            </InfoItem>
                            {session.location && (
                              <InfoItem>
                                <MapPin size={14} />
                                {session.location}
                              </InfoItem>
                            )}
                            {session.notes && (
                              <InfoItem>
                                <FileText size={14} />
                                {session.notes}
                              </InfoItem>
                            )}
                          </SessionInfo>
                        </SessionDetails>

                        {/* Status Badge */}
                        <StatusBadge status={session.status}>
                          {session.status}
                        </StatusBadge>
                      </SessionCard>
                    );
                  })}
                </SessionList>
              )}
            </ModalContent>
          </ModalContainer>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default ClientSessionHistory;
