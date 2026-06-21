import styled, { keyframes } from 'styled-components';

export const countUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;
export const PageWrap = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  align-items: center;

  @media (max-width: 414px) { padding: 1rem; gap: 0.875rem; }
  @media (max-width: 375px) { padding: 0.875rem; }
`;
export const KpiStrip = styled.div.attrs(() => ({ role: 'group' }))`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (min-width: 600px) { grid-template-columns: repeat(4, 1fr); }
`;

export const KpiCard = styled.div<{ $index?: number }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border-radius: 14px;
  padding: 1rem;
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${({ $index = 0 }) => `${$index * 60}ms`};

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
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
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
  gap: 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);

  &:last-child { border-bottom: none; }

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
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
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
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
        ? 'color-mix(in srgb, var(--danger, #ff416c) 12%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  color: ${({ $status }) =>
    $status === 'completed'
      ? 'var(--success, #22c55e)'
      : $status === 'cancelled'
        ? 'var(--danger, #ff416c)'
        : 'var(--accent-primary, #60C0F0)'};
`;

export const SessionActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 560px) {
    justify-content: flex-start;
  }

  @media (max-width: 430px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));

    > span {
      grid-column: 1 / -1;
      justify-self: flex-start;
    }

    > button {
      width: 100%;
    }
  }
`;

export const SessionLogButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.45rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
  font-size: 0.875rem;
  font-family: 'Sora', sans-serif;
`;

export const SessionsOverflow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.875rem;
  margin-top: 0.25rem;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);

  @media (max-width: 430px) {
    align-items: stretch;
    flex-direction: column;

    button {
      justify-content: center;
    }
  }
`;

export const SessionsOverflowNote = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, var(--bg-elevated, #141419)));
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
  transition:
    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const sessionShimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const SessionRowSkeleton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);

  &:last-child { border-bottom: none; }

  &::before,
  &::after {
    content: '';
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--surface-graphite, #1A1A24) 0%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--surface-graphite, #1A1A24)) 50%,
      var(--surface-graphite, #1A1A24) 100%
    );
    background-size: 200% 100%;
    animation: ${sessionShimmer} 1.5s linear infinite;
  }

  &::before { width: 42%; height: 1.05rem; }
  &::after { width: 4.75rem; height: 1.6rem; border-radius: 999px; }

  @media (prefers-reduced-motion: reduce) {
    &::before,
    &::after { animation: none; }
  }
`;
