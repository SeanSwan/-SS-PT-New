/**
 * CancelledSessionsWidget - Admin Dashboard Widget
 * Shows cancelled sessions with 24-hour policy tracking and charge buttons
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AlertTriangle, DollarSign, Clock, User, Calendar, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

interface CancelledSession {
  id: number;
  sessionDate: string;
  cancellationDate: string;
  cancellationReason: string;
  clientName: string;
  trainerName: string;
  isLateCancellation: boolean;
  hoursUntilSession: number;
  chargePending: boolean;
  cancellationChargeType: string | null;
  cancellationChargeAmount: number | null;
  cancellationChargedAt: string | null;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface CancelledSessionsWidgetProps {
  maxItems?: number;
  showChargeButtons?: boolean;
}

const CancelledSessionsWidget: React.FC<CancelledSessionsWidgetProps> = ({
  maxItems = 10,
  showChargeButtons = true
}) => {
  const { authAxios } = useAuth();
  const [sessions, setSessions] = useState<CancelledSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chargingId, setChargingId] = useState<number | null>(null);

  const fetchCancelledSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAxios.get('/api/sessions/admin/cancelled', {
        params: { limit: maxItems }
      });

      if (response.data.success) {
        setSessions(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching cancelled sessions:', err);
      setError('Failed to load cancelled sessions');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, maxItems]);

  useEffect(() => {
    fetchCancelledSessions();
  }, [fetchCancelledSessions]);

  const handleCharge = async (sessionId: number, chargeType: 'late_fee' | 'full') => {
    try {
      setChargingId(sessionId);

      const response = await authAxios.post(`/api/sessions/${sessionId}/charge-cancellation`, {
        chargeType
      });

      if (response.data.success) {
        // Refresh the list
        await fetchCancelledSessions();
        alert(`Charge of $${response.data.data.chargeAmount} applied successfully`);
      }
    } catch (err: any) {
      console.error('Error charging cancellation:', err);
      alert(err.response?.data?.message || 'Failed to apply charge');
    } finally {
      setChargingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <WidgetContainer>
        <WidgetHeader>
          <HeaderTitle>
            <X size={20} />
            Cancelled Sessions
          </HeaderTitle>
        </WidgetHeader>
        <LoadingState>Loading cancelled sessions...</LoadingState>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetHeader>
          <HeaderTitle>
            <X size={20} />
            Cancelled Sessions
          </HeaderTitle>
        </WidgetHeader>
        <ErrorState>{error}</ErrorState>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer>
      <WidgetHeader>
        <HeaderTitle>
          <X size={20} />
          Cancelled Sessions
        </HeaderTitle>
        <RefreshButton onClick={fetchCancelledSessions}>
          <RefreshCw size={16} />
        </RefreshButton>
      </WidgetHeader>

      {sessions.length === 0 ? (
        <EmptyState>No cancelled sessions</EmptyState>
      ) : (
        <SessionsList>
          {sessions.map((session) => (
            <SessionCard key={session.id} $isLate={session.isLateCancellation}>
              <SessionHeader>
                <ClientInfo>
                  <User size={16} />
                  <ClientName>{session.clientName}</ClientName>
                </ClientInfo>
                {session.isLateCancellation && (
                  <LateBadge>
                    <AlertTriangle size={14} />
                    Late Cancel
                  </LateBadge>
                )}
              </SessionHeader>

              <SessionDetails>
                <DetailRow>
                  <Calendar size={14} />
                  <span>Session: {formatDate(session.sessionDate)}</span>
                </DetailRow>
                <DetailRow>
                  <X size={14} />
                  <span>Cancelled: {formatDate(session.cancellationDate)}</span>
                </DetailRow>
                {session.isLateCancellation && (
                  <DetailRow $highlight>
                    <Clock size={14} />
                    <span>
                      {session.hoursUntilSession < 1
                        ? 'Less than 1 hour notice'
                        : `${Math.round(session.hoursUntilSession)} hours notice`}
                    </span>
                  </DetailRow>
                )}
                {session.cancellationReason && (
                  <ReasonText>Reason: {session.cancellationReason}</ReasonText>
                )}
              </SessionDetails>

              {session.cancellationChargedAt ? (
                <ChargedBadge>
                  <DollarSign size={14} />
                  Charged ${session.cancellationChargeAmount}
                </ChargedBadge>
              ) : (
                showChargeButtons && session.isLateCancellation && (
                  <ChargeActions>
                    <ChargeButton
                      onClick={() => handleCharge(session.id, 'late_fee')}
                      disabled={chargingId === session.id}
                      $variant="fee"
                    >
                      {chargingId === session.id ? 'Processing...' : 'Charge $25 Fee'}
                    </ChargeButton>
                    <ChargeButton
                      onClick={() => handleCharge(session.id, 'full')}
                      disabled={chargingId === session.id}
                      $variant="full"
                    >
                      {chargingId === session.id ? 'Processing...' : 'Charge Full $75'}
                    </ChargeButton>
                  </ChargeActions>
                )
              )}
            </SessionCard>
          ))}
        </SessionsList>
      )}
    </WidgetContainer>
  );
};

export default CancelledSessionsWidget;

// Styled Components
const WidgetContainer = styled.div`
  background: rgba(30, 41, 59, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const HeaderTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ef4444;
  margin: 0;
`;

const RefreshButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #ef4444;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 500px;
  overflow-y: auto;
`;

const SessionCard = styled.div<{ $isLate: boolean }>`
  background: ${({ $isLate }) =>
    $isLate ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${({ $isLate }) =>
    $isLate ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 1rem;
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const ClientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
`;

const ClientName = styled.span`
  font-weight: 600;
`;

const LateBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DetailRow = styled.div<{ $highlight?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ $highlight }) => ($highlight ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)')};
`;

const ReasonText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0.5rem 0 0 0;
  font-style: italic;
`;

const ChargedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 1rem;
  width: fit-content;
`;

const ChargeActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ChargeButton = styled.button<{ $variant: 'fee' | 'full' }>`
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) =>
    $variant === 'fee'
      ? `
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
  `
      : `
    background: linear-gradient(135deg, #00ffff 0%, #00d4aa 100%);
    color: #0a0a1a;
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 255, 255, 0.4);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
