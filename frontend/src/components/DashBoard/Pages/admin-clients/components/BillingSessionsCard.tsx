/**
 * BillingSessionsCard - P0 Admin Billing & Sessions Management
 * ============================================================
 *
 * Displays session credits, pending orders, and upcoming sessions
 * Provides quick actions for booking sessions, adding credits, and applying payments
 *
 * Features:
 * - Session credits display (prominent)
 * - Last purchase info with PAID badge
 * - Pending orders list with Apply Payment action
 * - Next upcoming session
 * - Quick action buttons (Book Session, Add Sessions, Apply Payment)
 * - Mobile-friendly (44px touch targets)
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  CreditCard,
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  RefreshCw
} from 'lucide-react';

import { useClientBillingOverview } from '../../../../../hooks/useClientBillingOverview';
import BookSessionDialog from './BookSessionDialog';
import AddSessionsDialog from './AddSessionsDialog';
import ApplyPaymentDialog from './ApplyPaymentDialog';

/* ------------------------------------------------------------------ */
/*  Styled Components                                                  */
/* ------------------------------------------------------------------ */

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const StyledCard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  margin-bottom: 24px;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderTitle = styled.h3`
  color: white;
  font-weight: 600;
  font-size: 1.25rem;
  margin: 0;
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const SessionsBox = styled.div`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.15));
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  border: 1px solid rgba(0, 255, 255, 0.3);
`;

const SessionCount = styled.h2`
  color: #00ffff;
  font-weight: 700;
  font-size: 3.75rem;
  line-height: 1;
  margin: 0;
`;

const SessionLabel = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin: 8px 0 0 0;
`;

const InfoBox = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
`;

const InfoBoxLabel = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 8px 0;
`;

const InfoText = styled.p<{ $muted?: boolean; $small?: boolean }>`
  color: ${({ $muted }) => ($muted ? 'rgba(255, 255, 255, 0.5)' : 'white')};
  font-weight: ${({ $muted }) => ($muted ? 400 : 500)};
  font-size: ${({ $small }) => ($small ? '0.75rem' : '1rem')};
  margin: 0;
`;

const InfoSecondary = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  margin: 4px 0 0 0;
`;

const InfoCaption = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
`;

const InlineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InlineRowSpaced = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const Chip = styled.span<{ $variant?: 'error' | 'success' | 'info' | 'cyan' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 8px;

  ${({ $variant }) => {
    switch ($variant) {
      case 'error':
        return `
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        `;
      case 'success':
        return `
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        `;
      case 'info':
        return `
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        `;
      case 'cyan':
        return `
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
        `;
    }
  }}
`;

const ChipInline = styled(Chip)`
  margin-top: 0;
  margin-left: 8px;
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 24px 0;
`;

const PendingHeader = styled.p`
  color: #fbbf24;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PendingOrderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 8px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  flex-wrap: wrap;
  gap: 12px;
`;

const PendingOrderInfo = styled.div`
  min-width: 0;
`;

const PendingOrderName = styled.p`
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
  margin: 0;
`;

const PendingOrderCaption = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
`;

const ActionButton = styled.button<{ $variant?: 'blue' | 'purple' | 'green-outline' | 'green' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  min-width: 120px;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, background 0.2s, filter 0.2s;
  flex: 1 1 auto;

  ${({ $variant }) => {
    switch ($variant) {
      case 'blue':
        return `
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
        `;
      case 'purple':
        return `
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
        `;
      case 'green-outline':
        return `
          background: transparent;
          color: #10b981;
          border: 1px solid #10b981;
        `;
      case 'green':
        return `
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
        `;
      default:
        return `
          background: rgba(14, 165, 233, 0.2);
          color: #0ea5e9;
          border: 1px solid rgba(14, 165, 233, 0.3);
        `;
    }
  }}

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    ${({ $variant }) =>
      $variant === 'green-outline'
        ? `
          border-color: #059669;
          background: rgba(16, 185, 129, 0.1);
        `
        : ''}
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: none;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

const RecentHeader = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RecentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RecentRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 12px;
`;

const RecentRowInfo = styled.div`
  min-width: 0;
`;

const RecentDate = styled.p`
  color: white;
  font-size: 0.875rem;
  margin: 0;
`;

const RecentTrainer = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
`;

const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const SpinnerWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 32px 0;
`;

const AlertBox = styled.div`
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  padding: 12px 16px;
  color: #fca5a5;
  font-size: 0.875rem;
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface BillingSessionsCardProps {
  clientId: number | string;
  clientName?: string;
  onUpdate?: () => void;
}

const BillingSessionsCard: React.FC<BillingSessionsCardProps> = ({
  clientId,
  clientName,
  onUpdate
}) => {
  const { data, isLoading, error, refetch } = useClientBillingOverview(clientId);

  // Dialog states
  const [bookSessionOpen, setBookSessionOpen] = useState(false);
  const [addSessionsOpen, setAddSessionsOpen] = useState(false);
  const [applyPaymentOpen, setApplyPaymentOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const handleDialogSuccess = () => {
    refetch();
    onUpdate?.();
  };

  const handleApplyPaymentClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setApplyPaymentOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${Number(amount).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <StyledCard>
        <CardBody>
          <SpinnerWrapper>
            <Spinner />
          </SpinnerWrapper>
        </CardBody>
      </StyledCard>
    );
  }

  if (error) {
    return (
      <StyledCard>
        <CardBody>
          <AlertBox>
            Failed to load billing overview. Please try again.
          </AlertBox>
        </CardBody>
      </StyledCard>
    );
  }

  return (
    <>
      <StyledCard>
        <CardBody>
          {/* Header */}
          <Header>
            <HeaderLeft>
              <CreditCard size={20} color="#00ffff" />
              <HeaderTitle>Billing &amp; Sessions</HeaderTitle>
            </HeaderLeft>
            <RefreshButton onClick={() => refetch()} title="Refresh">
              <RefreshCw size={20} />
            </RefreshButton>
          </Header>

          <GridContainer>
            {/* Sessions Remaining - Prominent Display */}
            <SessionsBox>
              <SessionCount>
                {data?.sessionsRemaining ?? 0}
              </SessionCount>
              <SessionLabel>
                Sessions Remaining
              </SessionLabel>
              {data?.sessionsRemaining === 0 && (
                <Chip $variant="error">
                  <AlertTriangle size={14} />
                  No Credits
                </Chip>
              )}
            </SessionsBox>

            {/* Last Purchase */}
            <InfoBox>
              <InfoBoxLabel>Last Purchase</InfoBoxLabel>
              {data?.lastPurchase ? (
                <>
                  <InfoText>
                    {data.lastPurchase.packageName}
                  </InfoText>
                  <InfoSecondary>
                    {data.lastPurchase.sessions} sessions &bull; {formatCurrency(data.lastPurchase.amount)}
                  </InfoSecondary>
                  <InfoCaption>
                    {formatDate(data.lastPurchase.grantedAt)}
                  </InfoCaption>
                  {data.lastPurchase.paymentAppliedAt && (
                    <ChipInline $variant="success">
                      <CheckCircle size={14} />
                      PAID
                    </ChipInline>
                  )}
                </>
              ) : (
                <InfoText $muted>No purchases yet</InfoText>
              )}
            </InfoBox>

            {/* Next Session */}
            <InfoBox>
              <InfoBoxLabel>Next Session</InfoBoxLabel>
              {data?.nextSession ? (
                <>
                  <InlineRow>
                    <Clock size={18} color="#00ffff" />
                    <InfoText>
                      {formatDateTime(data.nextSession.date)}
                    </InfoText>
                  </InlineRow>
                  {data.nextSession.trainer && (
                    <InlineRowSpaced>
                      <User size={16} color="rgba(255,255,255,0.5)" />
                      <InfoSecondary style={{ margin: 0 }}>
                        with {data.nextSession.trainer.name}
                      </InfoSecondary>
                    </InlineRowSpaced>
                  )}
                  <Chip $variant={data.nextSession.status === 'confirmed' ? 'success' : 'info'}>
                    {data.nextSession.status}
                  </Chip>
                </>
              ) : (
                <InfoText $muted>No upcoming sessions</InfoText>
              )}
            </InfoBox>
          </GridContainer>

          {/* Pending Orders Section */}
          {data?.pendingOrders && data.pendingOrders.length > 0 && (
            <>
              <StyledDivider />
              <PendingHeader>
                <AlertTriangle size={18} />
                Pending Payment ({data.pendingOrders.length})
              </PendingHeader>
              {data.pendingOrders.map((order) => (
                <PendingOrderRow key={order.id}>
                  <PendingOrderInfo>
                    <PendingOrderName>
                      {order.packageName}
                    </PendingOrderName>
                    <PendingOrderCaption>
                      {order.sessions} sessions &bull; {formatCurrency(order.amount)} &bull; Created {formatDate(order.createdAt)}
                    </PendingOrderCaption>
                  </PendingOrderInfo>
                  <ActionButton
                    $variant="green"
                    onClick={() => handleApplyPaymentClick(order.id)}
                    style={{ minWidth: 120, flex: '0 0 auto' }}
                  >
                    <CreditCard size={16} />
                    Apply Payment
                  </ActionButton>
                </PendingOrderRow>
              ))}
            </>
          )}

          {/* Action Buttons */}
          <StyledDivider />
          <ButtonRow>
            <ActionButton
              $variant="blue"
              onClick={() => setBookSessionOpen(true)}
              disabled={!data?.sessionsRemaining || data.sessionsRemaining === 0}
              style={{ minWidth: 150 }}
            >
              <CalendarCheck size={18} />
              Book Session
            </ActionButton>
            <ActionButton
              $variant="purple"
              onClick={() => setAddSessionsOpen(true)}
              style={{ minWidth: 150 }}
            >
              <Plus size={18} />
              Add Sessions
            </ActionButton>
            {data?.pendingOrders && data.pendingOrders.length > 0 && (
              <ActionButton
                $variant="green-outline"
                onClick={() => handleApplyPaymentClick(data.pendingOrders[0].id)}
                style={{ minWidth: 150 }}
              >
                <CreditCard size={18} />
                Apply Payment
              </ActionButton>
            )}
          </ButtonRow>

          {/* Recent Sessions */}
          {data?.recentSessions && data.recentSessions.length > 0 && (
            <>
              <StyledDivider />
              <RecentHeader>
                <Clock size={18} />
                Recent Sessions
              </RecentHeader>
              <RecentList>
                {data.recentSessions.slice(0, 3).map((session) => (
                  <RecentRow key={session.id}>
                    <RecentRowInfo>
                      <RecentDate>
                        {formatDate(session.date)}
                      </RecentDate>
                      {session.trainer && (
                        <RecentTrainer>
                          with {session.trainer.name}
                        </RecentTrainer>
                      )}
                    </RecentRowInfo>
                    <Chip $variant="cyan" style={{ marginTop: 0 }}>
                      {session.duration} min
                    </Chip>
                  </RecentRow>
                ))}
              </RecentList>
            </>
          )}
        </CardBody>
      </StyledCard>

      {/* Dialogs */}
      <BookSessionDialog
        open={bookSessionOpen}
        onClose={() => setBookSessionOpen(false)}
        clientId={clientId}
        clientName={clientName || data?.client?.name}
        onSuccess={handleDialogSuccess}
      />

      <AddSessionsDialog
        open={addSessionsOpen}
        onClose={() => setAddSessionsOpen(false)}
        clientId={clientId}
        clientName={clientName || data?.client?.name}
        onSuccess={handleDialogSuccess}
      />

      <ApplyPaymentDialog
        open={applyPaymentOpen}
        onClose={() => {
          setApplyPaymentOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
        pendingOrders={data?.pendingOrders || []}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
};

export default BillingSessionsCard;
