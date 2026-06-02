/**
 * StoreDesignSystem.feedback.tsx - Store/Revenue loading and notice states.
 * Keeps admin order feedback surfaces dark-first and theme-aware while the
 * main control module remains bounded below the project line limit.
 */

import styled from 'styled-components';
import { shimmer, STORE_TOKENS } from './StoreDesignSystem.tokens';

export const ShimmerBlock = styled.div<{ $width?: string; $height?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
  border-radius: 8px;
  background: linear-gradient(
    -45deg,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 2%, transparent) 40%,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent) 50%,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 2%, transparent) 60%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 2s infinite;
`;

export const ErrorBanner = styled.div`
  background: color-mix(in srgb, ${STORE_TOKENS.color.inactive} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${STORE_TOKENS.color.inactive} 30%, transparent);
  border-radius: ${STORE_TOKENS.radius.button};
  padding: 1rem;
  color: var(--text-primary, #E0ECF4);
  border-left: 4px solid ${STORE_TOKENS.color.inactive};
  text-align: center;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
`;

export const DisclaimerBox = styled.div`
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, ${STORE_TOKENS.color.pending} 8%, transparent);
  border: 1px solid color-mix(in srgb, ${STORE_TOKENS.color.pending} 20%, transparent);
  border-radius: ${STORE_TOKENS.radius.button};
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 52%, transparent);
  line-height: 1.5;

  strong {
    color: ${STORE_TOKENS.color.pending};
  }
`;
