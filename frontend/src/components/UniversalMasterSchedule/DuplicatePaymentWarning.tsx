/**
 * DuplicatePaymentWarning
 * =======================
 * Shown when a 409 DUPLICATE_IDEMPOTENCY_KEY response is received,
 * indicating the payment was already processed. Displays the existing
 * order info so the admin can confirm and close safely.
 *
 * Galaxy-Swan themed: glass-pane with amber glow.
 */

import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface DuplicatePaymentWarningProps {
  orderId: number;
  orderNumber?: string;
  newBalance: number;
  clientName?: string;
  onDismiss: () => void;
}

const DuplicatePaymentWarning: React.FC<DuplicatePaymentWarningProps> = ({
  orderId,
  orderNumber,
  newBalance,
  clientName,
  onDismiss
}) => {
  return (
    <WarningContainer>
      <WarningHeader>
        <AlertTriangle size={20} />
        <span>Payment Already Applied</span>
      </WarningHeader>

      <WarningBody>
        This payment was already processed successfully.
        {clientName && <> for <strong>{clientName}</strong></>}
      </WarningBody>

      <DetailGrid>
        <DetailRow>
          <DetailLabel>Order</DetailLabel>
          <DetailValue>{orderNumber || `#${orderId}`}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>Current Balance</DetailLabel>
          <DetailValue $highlight>{newBalance} credits</DetailValue>
        </DetailRow>
      </DetailGrid>

      <ConfirmRow>
        <CheckCircle size={16} />
        <span>No duplicate charge was created.</span>
      </ConfirmRow>

      <DismissButton onClick={onDismiss} type="button">
        OK, Close
      </DismissButton>
    </WarningContainer>
  );
};

export default DuplicatePaymentWarning;

/* ─── Styled Components ─── */

const WarningContainer = styled.div`
  padding: 1.25rem;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.35);
  margin-bottom: 1rem;
`;

const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  color: #f59e0b;
  margin-bottom: 0.5rem;
`;

const WarningBody = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

const DetailGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  margin-bottom: 0.75rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DetailLabel = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
`;

const DetailValue = styled.span<{ $highlight?: boolean }>`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ $highlight }) => $highlight ? '#00FF88' : 'rgba(255, 255, 255, 0.9)'};
`;

const ConfirmRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #10b981;
  margin-bottom: 0.75rem;
`;

const DismissButton = styled.button`
  width: 100%;
  padding: 0.6rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.6);
  }
`;
