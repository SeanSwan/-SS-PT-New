/**
 * CancelledSessionsWidget - Admin Dashboard Widget
 * Shows cancelled sessions with 24-hour policy tracking and charge buttons
 * Dynamically calculates charge amount based on client's package price
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AlertTriangle, DollarSign, Clock, User, Calendar, RefreshCw, X, Check, Ban } from 'lucide-react';
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
  // MindBody Parity: Decision tracking fields
  cancellationDecision: 'pending' | 'charged' | 'waived' | null;
  cancellationReviewReason: string | null;
  reviewerInfo?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PackagePriceInfo {
  pricePerSession: number | null;
  packageName: string | null;
  fallbackPrice: number;
  defaultChargeAmount: number;
  lateFeeAmount: number;
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
  const [priceCache, setPriceCache] = useState<Record<number, PackagePriceInfo>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  // MindBody Parity: Waive reason input
  const [waiveReasons, setWaiveReasons] = useState<Record<number, string>>({});
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'pending' | 'charged' | 'waived'>('all');

  const fetchCancelledSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // MindBody Parity: Include decision status filter
      const response = await authAxios.get('/api/sessions/admin/cancelled', {
        params: {
          limit: maxItems,
          decisionStatus: decisionFilter !== 'all' ? decisionFilter : undefined
        }
      });

      if (response.data.success) {
        setSessions(response.data.data);
        // Fetch package prices for sessions that haven't been charged yet
        const uncharged = response.data.data.filter(
          (s: CancelledSession) => !s.cancellationChargedAt && s.isLateCancellation
        );
        fetchPricesForSessions(uncharged);
      }
    } catch (err: any) {
      console.error('Error fetching cancelled sessions:', err);
      setError('Failed to load cancelled sessions');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, maxItems, decisionFilter]);

  const fetchPricesForSessions = async (sessions: CancelledSession[]) => {
    const newPriceCache: Record<number, PackagePriceInfo> = { ...priceCache };

    for (const session of sessions) {
      if (!newPriceCache[session.id]) {
        try {
          const response = await authAxios.get(`/api/sessions/${session.id}/client-package-price`);
          if (response.data.success) {
            newPriceCache[session.id] = response.data.data;
          }
        } catch (err) {
          console.warn(`Could not fetch price for session ${session.id}`);
          // Use default fallback values
          newPriceCache[session.id] = {
            pricePerSession: null,
            packageName: null,
            fallbackPrice: 175,
            defaultChargeAmount: 175,
            lateFeeAmount: 88
          };
        }
      }
    }

    setPriceCache(newPriceCache);
  };

  useEffect(() => {
    fetchCancelledSessions();
  }, [fetchCancelledSessions]);

  const handleCharge = async (
    sessionId: number,
    chargeType: 'late_fee' | 'full' | 'custom' | 'none',
    customAmount?: number
  ) => {
    try {
      setChargingId(sessionId);

      // MindBody Parity: Include decision and reason
      const decision = chargeType === 'none' ? 'waived' : 'charged';
      const reason = chargeType === 'none' ? waiveReasons[sessionId] : undefined;

      // Require reason for waived cancellations
      if (chargeType === 'none' && !reason?.trim()) {
        alert('Please provide a reason for waiving the charge');
        setChargingId(null);
        return;
      }

      const response = await authAxios.post(`/api/sessions/${sessionId}/charge-cancellation`, {
        chargeType,
        chargeAmount: chargeType === 'custom' ? customAmount : undefined,
        decision,
        reason
      });

      if (response.data.success) {
        // Refresh the list
        await fetchCancelledSessions();
        if (chargeType === 'none') {
          alert('Cancellation waived - no charge applied');
        } else {
          alert(`Charge of $${response.data.data.chargeAmount} applied successfully`);
        }
        setExpandedSession(null);
        setCustomAmounts((prev) => ({ ...prev, [sessionId]: '' }));
        setWaiveReasons((prev) => ({ ...prev, [sessionId]: '' }));
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

  const getPriceInfo = (sessionId: number): PackagePriceInfo => {
    return priceCache[sessionId] || {
      pricePerSession: null,
      packageName: null,
      fallbackPrice: 175,
      defaultChargeAmount: 175,
      lateFeeAmount: 88
    };
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
        <HeaderActions>
          <FilterButtons>
            <FilterButton
              $active={decisionFilter === 'all'}
              onClick={() => setDecisionFilter('all')}
            >
              All
            </FilterButton>
            <FilterButton
              $active={decisionFilter === 'pending'}
              onClick={() => setDecisionFilter('pending')}
              $variant="pending"
            >
              Pending
            </FilterButton>
            <FilterButton
              $active={decisionFilter === 'charged'}
              onClick={() => setDecisionFilter('charged')}
              $variant="charged"
            >
              Charged
            </FilterButton>
            <FilterButton
              $active={decisionFilter === 'waived'}
              onClick={() => setDecisionFilter('waived')}
              $variant="waived"
            >
              Waived
            </FilterButton>
          </FilterButtons>
          <RefreshButton onClick={fetchCancelledSessions}>
            <RefreshCw size={16} />
          </RefreshButton>
        </HeaderActions>
      </WidgetHeader>

      {sessions.length === 0 ? (
        <EmptyState>No cancelled sessions</EmptyState>
      ) : (
        <SessionsList>
          {sessions.map((session) => {
            const priceInfo = getPriceInfo(session.id);
            const isExpanded = expandedSession === session.id;

            return (
              <SessionCard key={session.id} $isLate={session.isLateCancellation}>
                <SessionHeader>
                  <ClientInfo>
                    <User size={16} />
                    <ClientName>{session.clientName}</ClientName>
                  </ClientInfo>
                  <BadgeGroup>
                    {session.isLateCancellation && (
                      <LateBadge>
                        <AlertTriangle size={14} />
                        Late Cancel
                      </LateBadge>
                    )}
                    {session.cancellationDecision && (
                      <DecisionBadge $decision={session.cancellationDecision}>
                        {session.cancellationDecision === 'pending' && <Clock size={12} />}
                        {session.cancellationDecision === 'charged' && <DollarSign size={12} />}
                        {session.cancellationDecision === 'waived' && <Check size={12} />}
                        {session.cancellationDecision.charAt(0).toUpperCase() + session.cancellationDecision.slice(1)}
                      </DecisionBadge>
                    )}
                  </BadgeGroup>
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

                  {/* Show package info for uncharged late cancellations */}
                  {!session.cancellationChargedAt && session.isLateCancellation && priceInfo && (
                    <PackageInfo>
                      <DollarSign size={14} />
                      <span>
                        {priceInfo.packageName
                          ? `Package: ${priceInfo.packageName} - $${priceInfo.pricePerSession}/session`
                          : `Standard rate: $${priceInfo.fallbackPrice}/session`}
                      </span>
                    </PackageInfo>
                  )}
                </SessionDetails>

                {session.cancellationChargedAt ? (
                  <ChargeResult>
                    <ChargedBadge $type={session.cancellationChargeType}>
                      {session.cancellationChargeType === 'none' ? (
                        <>
                          <Ban size={14} />
                          No Charge Applied
                        </>
                      ) : (
                        <>
                          <DollarSign size={14} />
                          Charged ${session.cancellationChargeAmount}
                        </>
                      )}
                    </ChargedBadge>
                    {session.cancellationReviewReason && (
                      <ReviewReasonDisplay>
                        <strong>Admin Note:</strong> {session.cancellationReviewReason}
                        {session.reviewerInfo && (
                          <ReviewerInfo>
                            - {session.reviewerInfo.firstName} {session.reviewerInfo.lastName}
                          </ReviewerInfo>
                        )}
                      </ReviewReasonDisplay>
                    )}
                  </ChargeResult>
                ) : (
                  showChargeButtons &&
                  session.isLateCancellation && (
                    <ChargeSection>
                      {!isExpanded ? (
                        <ChargeActions>
                          <ChargeButton
                            onClick={() => handleCharge(session.id, 'late_fee')}
                            disabled={chargingId === session.id}
                            $variant="fee"
                          >
                            {chargingId === session.id
                              ? 'Processing...'
                              : `Late Fee $${priceInfo.lateFeeAmount}`}
                          </ChargeButton>
                          <ChargeButton
                            onClick={() => handleCharge(session.id, 'full')}
                            disabled={chargingId === session.id}
                            $variant="full"
                          >
                            {chargingId === session.id
                              ? 'Processing...'
                              : `Full $${priceInfo.defaultChargeAmount}`}
                          </ChargeButton>
                          <ExpandButton
                            onClick={() => setExpandedSession(session.id)}
                            disabled={chargingId === session.id}
                          >
                            More
                          </ExpandButton>
                        </ChargeActions>
                      ) : (
                        <ExpandedChargeSection>
                          <ChargeOptionRow>
                            <ChargeButton
                              onClick={() => handleCharge(session.id, 'late_fee')}
                              disabled={chargingId === session.id}
                              $variant="fee"
                            >
                              Late Fee ${priceInfo.lateFeeAmount}
                            </ChargeButton>
                            <ChargeButton
                              onClick={() => handleCharge(session.id, 'full')}
                              disabled={chargingId === session.id}
                              $variant="full"
                            >
                              Full Session ${priceInfo.defaultChargeAmount}
                            </ChargeButton>
                          </ChargeOptionRow>

                          <CustomAmountSection>
                            <CustomAmountLabel>Custom Amount:</CustomAmountLabel>
                            <CustomAmountInput
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Enter amount"
                              value={customAmounts[session.id] || ''}
                              onChange={(e) =>
                                setCustomAmounts((prev) => ({
                                  ...prev,
                                  [session.id]: e.target.value
                                }))
                              }
                            />
                            <ChargeButton
                              onClick={() =>
                                handleCharge(
                                  session.id,
                                  'custom',
                                  parseFloat(customAmounts[session.id] || '0')
                                )
                              }
                              disabled={
                                chargingId === session.id ||
                                !customAmounts[session.id] ||
                                parseFloat(customAmounts[session.id]) <= 0
                              }
                              $variant="full"
                            >
                              <Check size={14} />
                              Apply
                            </ChargeButton>
                          </CustomAmountSection>

                          <WaiveSection>
                            <WaiveReasonLabel>Waive Reason (required):</WaiveReasonLabel>
                            <WaiveReasonInput
                              placeholder="e.g., Emergency situation, first-time client courtesy..."
                              value={waiveReasons[session.id] || ''}
                              onChange={(e) =>
                                setWaiveReasons((prev) => ({
                                  ...prev,
                                  [session.id]: e.target.value
                                }))
                              }
                            />
                          </WaiveSection>

                          <NoChargeRow>
                            <NoChargeButton
                              onClick={() => handleCharge(session.id, 'none')}
                              disabled={chargingId === session.id || !waiveReasons[session.id]?.trim()}
                            >
                              <Ban size={14} />
                              Waive Charge
                            </NoChargeButton>
                            <CancelButton onClick={() => setExpandedSession(null)}>
                              Cancel
                            </CancelButton>
                          </NoChargeRow>
                        </ExpandedChargeSection>
                      )}
                    </ChargeSection>
                  )
                )}
              </SessionCard>
            );
          })}
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

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const FilterButtons = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const FilterButton = styled.button<{ $active: boolean; $variant?: 'pending' | 'charged' | 'waived' }>`
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  ${({ $active, $variant }) => {
    if ($active) {
      switch ($variant) {
        case 'pending':
          return `
            background: rgba(251, 191, 36, 0.3);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.5);
          `;
        case 'charged':
          return `
            background: rgba(16, 185, 129, 0.3);
            color: #10b981;
            border-color: rgba(16, 185, 129, 0.5);
          `;
        case 'waived':
          return `
            background: rgba(96, 165, 250, 0.3);
            color: #60a5fa;
            border-color: rgba(96, 165, 250, 0.5);
          `;
        default:
          return `
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
          `;
      }
    }
    return `
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.5);
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
      }
    `;
  }}
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
  max-height: 600px;
  overflow-y: auto;
`;

const SessionCard = styled.div<{ $isLate: boolean }>`
  background: ${({ $isLate }) =>
    $isLate ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid
    ${({ $isLate }) => ($isLate ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
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

const BadgeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const DecisionBadge = styled.span<{ $decision: 'pending' | 'charged' | 'waived' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;

  ${({ $decision }) => {
    switch ($decision) {
      case 'pending':
        return `
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        `;
      case 'charged':
        return `
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        `;
      case 'waived':
        return `
          background: rgba(96, 165, 250, 0.2);
          color: #60a5fa;
        `;
      default:
        return `
          background: rgba(156, 163, 175, 0.2);
          color: #9ca3af;
        `;
    }
  }}
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

const PackageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #10b981;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
`;

const ReasonText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0.5rem 0 0 0;
  font-style: italic;
`;

const ChargeResult = styled.div`
  margin-top: 1rem;
`;

const ChargedBadge = styled.div<{ $type?: string | null }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ $type }) =>
    $type === 'none' ? 'rgba(100, 100, 100, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
  color: ${({ $type }) => ($type === 'none' ? '#9ca3af' : '#10b981')};
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  width: fit-content;
`;

const ReviewReasonDisplay = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(96, 165, 250, 0.1);
  border-left: 3px solid #60a5fa;
  border-radius: 0 6px 6px 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
`;

const ReviewerInfo = styled.span`
  display: block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
`;

const ChargeSection = styled.div`
  margin-top: 1rem;
`;

const ChargeActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ChargeButton = styled.button<{ $variant: 'fee' | 'full' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) =>
    $variant === 'fee'
      ? `
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
  `
      : `
    background: linear-gradient(135deg, #00ffff 0%, #00d4aa 100%);
    color: #0a0a1a;
    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 255, 255, 0.4);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ExpandButton = styled.button`
  padding: 0.625rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ExpandedChargeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const ChargeOptionRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const CustomAmountSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CustomAmountLabel = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
`;

const CustomAmountInput = styled.input`
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.875rem;
  min-width: 80px;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const WaiveSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const WaiveReasonLabel = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
`;

const WaiveReasonInput = styled.textarea`
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.8rem;
  resize: vertical;
  min-height: 60px;

  &:focus {
    outline: none;
    border-color: #60a5fa;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const NoChargeRow = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
`;

const NoChargeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: 0.625rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;
