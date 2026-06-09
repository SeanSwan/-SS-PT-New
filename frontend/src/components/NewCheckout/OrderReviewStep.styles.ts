/**
 * FILE: OrderReviewStep.styles.ts
 * PURPOSE: Crystalline Swan styled-components for checkout order summaries.
 * LAST VALIDATED: 2026-06-09 via OrderReviewStep theme contract.
 */
import { motion } from 'framer-motion';
import styled, { css, keyframes } from 'styled-components';

const totalGlow = keyframes`
  0%, 100% {
    text-shadow: 0 0 10px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  }
  50% {
    text-shadow: 0 0 20px color-mix(in srgb, var(--accent-gold, #C6A84B) 45%, transparent);
  }
`;

const priceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const OrderSummaryContainer = styled(motion.div)`
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 7%, transparent);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 28%, transparent);
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 2rem;

  @media (max-width: 768px) {
    position: static;
    margin-bottom: 2rem;
    padding: 1.25rem;
  }
`;

export const SummaryHeader = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 1.25rem;
  }
`;

export const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
`;

export const ItemInfo = styled.div`
  flex: 1;
  margin-right: 1rem;
`;

export const ItemName = styled.h4`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  line-height: 1.3;
`;

export const ItemDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const ItemDetail = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent));
  margin: 0;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export const ItemDescription = styled(ItemDetail)`
  margin-top: 0.25rem;
  opacity: 0.8;
`;

export const ItemPrice = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  font-size: 0.9rem;
  text-align: right;
  min-width: 80px;
`;

export const PricingSection = styled.div`
  border-top: 2px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent);
  margin-top: 1.5rem;
  padding-top: 1.5rem;
`;

export const PriceRow = styled.div<{ $variant?: 'total' | 'sessions' }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: ${({ $variant }) => ($variant === 'total' ? '1rem 0 0' : '0.75rem 0')};
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent));
  font-size: ${({ $variant }) => ($variant === 'total' ? '1.25rem' : '0.9rem')};
  font-weight: ${({ $variant }) => ($variant === 'total' || $variant === 'sessions' ? 700 : 400)};
  ${({ $variant }) => $variant === 'total' && css`
    color: var(--accent-primary, #60C0F0);
    padding-top: 1rem;
    border-top: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 22%, transparent);
    animation: ${totalGlow} 2s ease-in-out infinite;
  `}
  ${({ $variant }) => $variant === 'sessions' && css`
    background: color-mix(in srgb, var(--success, #10B981) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--success, #10B981) 30%, transparent);
    border-radius: 8px;
    padding: 0.75rem;
    margin: 1rem 0;
    color: var(--success, #10B981);
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const SessionValueLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const SessionsSummary = styled.div`
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent);
  border-radius: 12px;
  padding: 1rem;
  margin: 1.5rem 0;
  text-align: center;
`;

export const SessionsTitle = styled.h4`
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

export const SessionsCount = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.5rem 0;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B));
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${priceShimmer} 3s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const SessionsDescription = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  margin: 0;
  font-size: 0.8rem;
`;

export const SecurityNote = styled.div`
  background: color-mix(in srgb, var(--success, #10B981) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--success, #10B981) 30%, transparent);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
`;

export const SecurityText = styled.span`
  color: var(--success, #10B981);
  font-size: 0.8rem;
  font-weight: 500;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
`;

export const EmptyStateIcon = styled.div`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 36%, transparent));
  display: flex;
  justify-content: center;
`;

export const EmptyStateTitle = styled.h4`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent));
  margin: 1rem 0 0.5rem;
`;

export const EmptyStateText = styled.p`
  margin: 0;
  font-size: 0.9rem;
`;
