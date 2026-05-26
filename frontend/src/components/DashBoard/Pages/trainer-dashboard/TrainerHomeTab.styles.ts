import styled, { keyframes } from 'styled-components';

const countUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const PageWrap = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 860px;

  @media (max-width: 414px) { padding: 1rem; gap: 0.875rem; }
  @media (max-width: 375px) { padding: 0.875rem; }
`;

export const KpiStrip = styled.div.attrs(() => ({ role: 'group' }))`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (min-width: 600px) { grid-template-columns: repeat(4, 1fr); }
`;

export const KpiCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border-radius: 14px;
  padding: 1rem;
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 60ms);

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const KpiValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
`;

export const KpiLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

export const SessionsCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border-radius: 16px;
  padding: 1.125rem 1.375rem;
`;

export const SessionsHeading = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.875rem;
`;

export const SessionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);

  &:last-child { border-bottom: none; }
`;

export const SessionClient = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  display: block;
`;

export const SessionTime = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

export const StatusBadge = styled.span<{ $status?: string }>`
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  white-space: nowrap;
  background: ${({ $status }) =>
    $status === 'completed'
      ? 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)'
      : $status === 'cancelled'
        ? 'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  color: ${({ $status }) =>
    $status === 'completed'
      ? 'var(--success, #22c55e)'
      : $status === 'cancelled'
        ? 'var(--danger, #C92A54)'
        : 'var(--accent-primary, #60C0F0)'};
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-size: 0.875rem;
  font-family: 'Sora', sans-serif;
`;

export const BookBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0.625rem 1.125rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const SectionHeading = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin: 0;
`;

export const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;

export const ActionCard = styled.button<{ $tone: string }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-height: 64px;
  padding: 1rem 1.125rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, ${({ $tone }) => $tone} 10%, transparent);
  border-radius: 14px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms);

  &:hover {
    border-color: color-mix(in srgb, ${({ $tone }) => $tone} 30%, transparent);
    background: color-mix(in srgb, ${({ $tone }) => $tone} 5%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px color-mix(in srgb, ${({ $tone }) => $tone} 12%, transparent);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ $tone }) => $tone} 70%, transparent);
    outline-offset: 2px;
  }

  &:active { transform: translateY(0); }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover { transform: none; }
  }
`;

export const ActionIcon = styled.span<{ $tone: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: color-mix(in srgb, ${({ $tone }) => $tone} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $tone }) => $tone} 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => $tone};
`;

export const ActionLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;
