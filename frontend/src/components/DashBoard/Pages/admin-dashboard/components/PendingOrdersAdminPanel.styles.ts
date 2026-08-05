/**
 * PendingOrdersAdminPanel.styles — page-specific styled components,
 * extracted in SWA-138 S6 (Rule 4: the panel was 588 lines).
 * TaxBadge was removed with the unconditional CA-tax display.
 */
import styled from 'styled-components';
import { GlassCard, STORE_TOKENS } from '../../store-shared/StoreDesignSystem';

export const OrdersWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const ControlsRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

export const FilterSelect = styled.select`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  min-height: 44px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${STORE_TOKENS.color.cyan};
  }

  option {
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const OrdersGrid = styled.div`
  display: grid;
  gap: 20px;
`;

export const OrderCardWrapper = styled(GlassCard)<{ $priority?: string }>`
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $priority }) => {
      switch ($priority) {
        case 'high': return `linear-gradient(90deg, ${STORE_TOKENS.color.inactive}, ${STORE_TOKENS.color.pending})`;
        case 'medium': return `linear-gradient(90deg, ${STORE_TOKENS.color.pending}, ${STORE_TOKENS.color.completed})`;
        default: return `linear-gradient(90deg, ${STORE_TOKENS.color.cyan}, ${STORE_TOKENS.color.purple})`;
      }
    }};
  }
`;

export const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const OrderId = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${STORE_TOKENS.color.cyan};
  margin-bottom: 0.5rem;
`;

export const OrderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
`;

export const AmountDisplay = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${STORE_TOKENS.color.completed};
`;

export const CustomerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

export const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #B6C2CC);

  svg { color: ${STORE_TOKENS.color.muted}; flex-shrink: 0; }
`;

export const OrderItemsBox = styled.div`
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 64%, transparent);
  border-radius: ${STORE_TOKENS.radius.button};
  padding: 1rem;
  margin-top: 0.5rem;
`;

export const OrderItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
  font-size: 0.875rem;

  &:last-child { border-bottom: none; }
`;

export const EmptyOrders = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${STORE_TOKENS.color.muted};

  svg { margin-bottom: 1rem; opacity: 0.3; }
  h3 { color: var(--text-primary, #E0ECF4); margin-bottom: 0.5rem; }
`;
