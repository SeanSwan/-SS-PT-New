import styled, { keyframes } from 'styled-components';

export const countUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const KpiStrip = styled.div.attrs(() => ({ role: 'group' }))`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const KpiCard = styled.div<{ $index?: number }>`
  min-width: 0; /* shrink inside the 4-up KPI grid instead of overflowing */
  min-height: 88px;
  display: grid;
  align-content: center;
  gap: 0.35rem;
  padding: 0.95rem;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface-royal-depth, #003080) 28%, transparent), transparent 62%),
    var(--bg-elevated, #141419);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${({ $index = 0 }) => `${$index * 60}ms`};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const KpiValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0; /* long monospace value must not push the KPI card past its track */
  max-width: 100%;
  color: var(--text-primary, #E0ECF4);
  font: 900 1.25rem/1 'Fira Code', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  svg { flex: 0 0 auto; }
`;

export const KpiLabel = styled.div`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 800 0.68rem/1.25 'Sora', sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const SessionsCard = styled.section`
  min-width: 0;
  min-height: 260px;
  padding: 1.1rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface-royal-depth, #003080) 24%, transparent), transparent 62%),
    var(--bg-elevated, #141419);
  box-shadow: 0 18px 42px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
`;

export const SessionsHeading = styled.h2`
  margin: 0 0 0.9rem;
  color: var(--text-primary, #E0ECF4);
  font: 850 0.95rem/1.2 'Plus Jakarta Sans', sans-serif;
`;

export const SessionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);

  &:last-child { border-bottom: none; }

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SessionClient = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.9rem/1.3 'Sora', sans-serif;
`;

export const SessionTime = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 750 0.75rem/1.3 'Fira Code', monospace;
`;

export const StatusBadge = styled.span<{ $status?: string }>`
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  border-radius: 999px;
  padding: 0.25rem 0.62rem;
  background: ${({ $status }) => ($status === 'completed'
    ? 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)'
    : $status === 'cancelled'
      ? 'color-mix(in srgb, var(--danger, #ff416c) 12%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)')};
  color: ${({ $status }) => ($status === 'completed'
    ? 'var(--success, #22c55e)'
    : $status === 'cancelled'
      ? 'var(--danger, #ff416c)'
      : 'var(--accent-primary, #60C0F0)')};
  font: 850 0.68rem/1 'Sora', sans-serif;
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
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  font: 800 0.75rem/1 'Sora', sans-serif;
  cursor: pointer;
  transition:
    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
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
    transition: none;
    &:hover { transform: none; }
  }
`;

export const EmptyState = styled.div`
  min-height: 150px;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
  font: 750 0.88rem/1.45 'Sora', sans-serif;
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

    button { justify-content: center; }
  }
`;

export const SessionsOverflowNote = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 700 0.75rem/1.35 'Sora', sans-serif;
`;

export const BookBtn = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.625rem 1.125rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent);
  color: var(--accent-primary, #60C0F0);
  font: 800 0.8rem/1 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const sessionShimmer = keyframes`
  0% { background-position: -200% 0; }
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
