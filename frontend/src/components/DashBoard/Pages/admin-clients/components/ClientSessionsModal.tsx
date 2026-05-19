/**
 * ClientSessionsModal.tsx
 * Shows training session history for a specific client.
 * Fetches from GET /api/admin/clients/:id/workout-stats
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { X, Calendar, Clock, Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ModalOverlay,
  ModalPanel,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  CenterContent,
  Spinner,
} from './copilot-shared-styles';

interface Props {
  open: boolean;
  clientId: number;
  clientName: string;
  onClose: () => void;
}

interface SessionStat {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  avgDuration: number;
  recentSessions: Array<{
    id: number;
    date: string;
    type: string;
    duration: number;
    status: string;
    notes?: string;
  }>;
}

const SessionsModalPanel = styled(ModalPanel)`
  max-width: 700px;
`;

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.5rem;
`;

const ErrorBox = styled.div`
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #fca5a5;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RetryButton = styled.button`
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 44px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
`;

const StatIconSlot = styled.div`
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #60C0F0;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionHeading = styled.h3`
  color: #e2e8f0;
  font-size: 1rem;
  margin-bottom: 0.75rem;
`;

const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SessionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
`;

const SessionTitle = styled.div`
  color: #e2e8f0;
  font-weight: 500;
  font-size: 0.875rem;
`;

const SessionMeta = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
`;

const StatusPill = styled.span<{ $completed: boolean }>`
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $completed }) => ($completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)')};
  color: ${({ $completed }) => ($completed ? '#10b981' : '#f59e0b')};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const EmptyIcon = styled(Calendar)`
  opacity: 0.4;
  margin-bottom: 0.5rem;
`;

const ClientSessionsModal: React.FC<Props> = ({ open, clientId, clientName, onClose }) => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<SessionStat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await authAxios.get(`/api/admin/clients/${clientId}/workout-stats`);
      if (resp.data.success) {
        setData(resp.data.data);
      } else {
        setError(resp.data.message || 'Failed to load session data');
      }
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(responseMessage || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, [authAxios, clientId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  if (!open) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <SessionsModalPanel>
        <ModalHeader>
          <ModalTitle>
            <Calendar size={20} />
            Sessions — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          {loading && (
            <CenterContent>
              <Spinner />
              <LoadingText>Loading sessions...</LoadingText>
            </CenterContent>
          )}

          {error && (
            <ErrorBox>
              <span>{error}</span>
              <RetryButton
                onClick={fetchData}
              >
                <RefreshCw size={14} /> Retry
              </RetryButton>
            </ErrorBox>
          )}

          {!loading && !error && data && (
            <>
              {/* Summary Stats */}
              <StatsGrid>
                {[
                  { label: 'Total Sessions', value: data.totalSessions, icon: <Calendar size={16} /> },
                  { label: 'Completed', value: data.completedSessions, icon: <Activity size={16} /> },
                  { label: 'Cancelled', value: data.cancelledSessions, icon: <X size={16} /> },
                  { label: 'Avg Duration', value: `${data.avgDuration || 0}m`, icon: <Clock size={16} /> },
                ].map((stat, i) => (
                  <StatCard key={i}>
                    <StatIconSlot>{stat.icon}</StatIconSlot>
                    <StatValue>{stat.value}</StatValue>
                    <StatLabel>{stat.label}</StatLabel>
                  </StatCard>
                ))}
              </StatsGrid>

              {/* Recent Sessions List */}
              <SectionHeading>Recent Sessions</SectionHeading>
              {data.recentSessions && data.recentSessions.length > 0 ? (
                <SessionList>
                  {data.recentSessions.map((session) => (
                    <SessionRow key={session.id}>
                      <div>
                        <SessionTitle>
                          {session.type || 'Training Session'}
                        </SessionTitle>
                        <SessionMeta>
                          {new Date(session.date).toLocaleDateString()} • {session.duration}min
                        </SessionMeta>
                      </div>
                      <StatusPill $completed={session.status === 'completed'}>
                        {session.status}
                      </StatusPill>
                    </SessionRow>
                  ))}
                </SessionList>
              ) : (
                <EmptyState>
                  <EmptyIcon size={32} />
                  <p>No sessions recorded yet</p>
                </EmptyState>
              )}
            </>
          )}

          {!loading && !error && !data && (
            <EmptyState>
              <EmptyIcon size={32} />
              <p>No session data available</p>
            </EmptyState>
          )}
        </ModalBody>
      </SessionsModalPanel>
    </ModalOverlay>
  );
};

export default ClientSessionsModal;
