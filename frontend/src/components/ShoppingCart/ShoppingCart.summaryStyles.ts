/**
 * ShoppingCart.summaryStyles.ts — cart footer summary + state styles
 * ====================================================================
 * Order summary rows (with the gilded total beat), action buttons grid,
 * status message, and loading states for the cart modal footer/body.
 * Chrome styles live in ShoppingCart.styles.ts.
 */
import styled, { keyframes, css } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const CartSummary = styled.div`
  background: color-mix(in srgb, var(--midnight-sapphire, #002060) 45%, transparent);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;

  &.sessions {
    background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 20%, transparent);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    margin: 0.5rem 0;
  }

  &.total {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 1rem 0 0;
    padding-top: 1rem;
    border-top: 2px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent);

    /* Gilded total — the luxury beat of the purchase moment */
    .total-value {
      font-size: 1.4rem;
      background: linear-gradient(
        135deg,
        var(--accent-gold, #C6A84B),
        var(--text-primary, #E0ECF4)
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
`;

export const SummaryLabel = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  font-weight: 500;
`;

export const SummaryValue = styled.span<{ $accent?: boolean }>`
  color: ${({ $accent }) => ($accent ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)')};
  font-weight: ${({ $accent }) => ($accent ? 700 : 600)};
`;

export const ButtonsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  margin-top: 1.5rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

export const StatusMessage = styled.div<{ $isError?: boolean }>`
  padding: 12px 15px;
  border-radius: 8px;
  margin: 10px 0;
  background: ${({ $isError }) => ($isError
    ? 'color-mix(in srgb, var(--danger, #ff6b6b) 12%, transparent)'
    : 'color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent)')};
  border: 1px solid ${({ $isError }) => ($isError
    ? 'color-mix(in srgb, var(--danger, #ff6b6b) 30%, transparent)'
    : 'color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent)')};
  color: ${({ $isError }) => ($isError ? 'var(--danger, #ff6b6b)' : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.9rem;
`;

export const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 2rem;
`;

export const LoadingSpinner = styled.div`
  border: 3px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  border-radius: 50%;
  border-top: 3px solid var(--accent-primary, #60C0F0);
  border-right: 3px solid var(--wing-purple, #8B5CF6);
  width: 50px;
  height: 50px;
  animation: ${css`${spin}`} 1.2s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2.4s;
  }
`;
