/**
 * PriceMismatchModal — Gilded Intervention for price changes
 * ===========================================================
 * Shown when server-side price validation detects cart changes.
 * Displays old vs new pricing with Crystalline Swan luxury styling.
 * Two-button layout: "Review Cart" (secondary) + "Continue" (primary).
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';

interface ChangedItem {
  id: number;
  name: string;
  expectedPrice: number;
  actualPrice: number;
  delta: number;
  status: 'PRICE_CHANGED' | 'REMOVED';
}

interface PriceMismatchModalProps {
  expectedTotal: number;
  updatedTotal: number;
  changedItems?: ChangedItem[];
  onAccept: () => void;
  onCancel: () => void;
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 16, 48, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  animation: ${fadeIn} 0.2s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Container = styled.div`
  background: #003080;
  border: 1px solid #C6A84B;
  border-radius: 12px;
  padding: 40px;
  max-width: 560px;
  width: 90%;
  animation: ${slideUp} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Heading = styled.h2`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 28px;
  color: #E0ECF4;
  margin: 0 0 16px;
`;

const Description = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #E0ECF4;
  line-height: 1.6;
  margin: 0 0 24px;
  font-size: 0.9rem;
`;

const PriceComparison = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  margin: 24px 0;
  padding: 20px;
  background: rgba(0, 32, 96, 0.5);
  border-radius: 8px;
`;

const PriceLabel = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  color: #50A0F0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const PriceValue = styled.code`
  font-family: 'Fira Code', monospace;
  font-size: 24px;
  color: #E0ECF4;
  display: block;
  margin-top: 8px;
`;

const Arrow = styled.span`
  color: #60C0F0;
  font-size: 24px;
`;

const ItemList = styled.div`
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 32, 96, 0.3);
  border-radius: 6px;
  font-size: 0.85rem;
`;

const ItemName = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #E0ECF4;
`;

const ItemDelta = styled.span<{ $positive: boolean }>`
  font-family: 'Fira Code', monospace;
  color: ${p => p.$positive ? '#C6A84B' : '#60C0F0'};
`;

const StatusBadge = styled.span<{ $removed: boolean }>`
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${p => p.$removed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(198, 168, 75, 0.15)'};
  color: ${p => p.$removed ? '#ef4444' : '#C6A84B'};
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const Actions = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 32px;
`;

const PrimaryButton = styled.button`
  flex: 1;
  background: #002060;
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #003080;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.45);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.6);
  }
`;

const SecondaryButton = styled.button`
  flex: 1;
  background: transparent;
  color: #60C0F0;
  border: 1px solid #60C0F0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(96, 192, 240, 0.1);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.6);
  }
`;

const PriceMismatchModal: React.FC<PriceMismatchModalProps> = ({
  expectedTotal,
  updatedTotal,
  changedItems,
  onAccept,
  onCancel,
}) => (
  <Overlay>
    <Container>
      <Heading>Itinerary Update</Heading>
      <Description>
        Live market conditions have adjusted your total.
      </Description>

      <PriceComparison>
        <div>
          <PriceLabel>Previous</PriceLabel>
          <PriceValue>${expectedTotal.toFixed(2)}</PriceValue>
        </div>
        <Arrow>&rarr;</Arrow>
        <div>
          <PriceLabel>Updated</PriceLabel>
          <PriceValue>${updatedTotal.toFixed(2)}</PriceValue>
        </div>
      </PriceComparison>

      {changedItems && changedItems.length > 0 && (
        <ItemList>
          {changedItems.map(item => (
            <ItemRow key={item.id}>
              <ItemName>{item.name}</ItemName>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge $removed={item.status === 'REMOVED'}>
                  {item.status === 'REMOVED' ? 'Removed' : 'Updated'}
                </StatusBadge>
                <ItemDelta $positive={item.delta > 0}>
                  {item.delta > 0 ? '+' : ''}${item.delta.toFixed(2)}
                </ItemDelta>
              </div>
            </ItemRow>
          ))}
        </ItemList>
      )}

      <Actions>
        <SecondaryButton onClick={onCancel}>
          Review Cart
        </SecondaryButton>
        <PrimaryButton onClick={onAccept}>
          Continue with New Total
        </PrimaryButton>
      </Actions>
    </Container>
  </Overlay>
);

export default PriceMismatchModal;
