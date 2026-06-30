/**
 * ChallengesView status styled-components.
 *
 * Loading and demo state primitives split out to keep the main challenge style
 * module inside the project file-health limit.
 */
import styled from 'styled-components';
import { Loader2 } from 'lucide-react';

export const DemoBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 32%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-luxury, #C6A84B) 12%, transparent);
  color: var(--accent-luxury, #C6A84B);
  font: 700 0.85rem/1.4 var(--font-ui, 'Sora', sans-serif);
  padding: 10px 16px;
`;

export const LoadingContainer = styled.div`
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
`;

export const Spinner = styled(Loader2)`
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  animation: spin 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
export const EmptyState = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: clamp(170px, 24vw, 240px);
  align-content: center;
  border: 1px dashed color-mix(in srgb, var(--accent-luxury, #C6A84B) 28%, transparent);
  border-radius: 8px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);
  padding: clamp(24px, 4vw, 42px);
  text-align: center;
`;

export const EmptyIcon = styled.div`
  color: var(--accent-luxury, #C6A84B);
  opacity: 0.62;
`;

export const EmptyTitle = styled.h3`
  margin: 0 0 2px;
  color: var(--text-primary, #E0ECF4);
  font: 800 1.05rem/1.25 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;