import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const PageShell = styled.main`
  min-height: 100vh;
  padding: clamp(1rem, 3vw, 2rem);
  color: var(--text-primary, #E0ECF4);
  background: radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent 34%),
    var(--bg-base, #030712);
`;

export const HeroBand = styled.section`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.25rem;

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const HeroCopy = styled.div`
  h1 {
    margin: 0.25rem 0;
    font: 700 clamp(2rem, 6vw, 4.5rem) / 0.95 'Plus Jakarta Sans', sans-serif;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    max-width: 42rem;
    color: var(--text-secondary, #94a3b8);
  }
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent-primary, #60C0F0);
  font: 700 0.8rem 'Sora', sans-serif;
  text-transform: uppercase;
`;

export const HeroActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const ActionLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent));
  color: var(--text-primary, #E0ECF4);
  text-decoration: none;
  background: var(--bg-elevated, #141419);
`;

export const StatusBanner = styled.div`
  margin-bottom: 1rem;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--error-accent, #C92A54);
  background: color-mix(in srgb, var(--error-accent, #C92A54) 14%, transparent);
`;

export const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Shimmer = styled.div`
  min-height: 9rem;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCard = styled.article`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-height: 7.5rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent));
  background: var(--bg-elevated, #141419);
`;

export const IconSlot = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

export const StatText = styled.div`
  span {
    display: block;
    color: var(--text-secondary, #94a3b8);
    font-size: 0.8rem;
  }

  strong {
    display: block;
    margin-top: 0.2rem;
    font: 800 1.55rem 'Plus Jakarta Sans', sans-serif;
  }
`;

export const ProgressPanel = styled.section`
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-secondary, #C6A84B) 18%, transparent));
  background: var(--bg-surface, #1A1A24);
`;

export const PanelHeading = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;

  span {
    color: var(--text-secondary, #94a3b8);
    font-size: 0.8rem;
  }

  h2 {
    margin: 0.1rem 0 0;
    font-size: 1.15rem;
  }
`;

export const ProgressValue = styled.strong`
  font-family: 'Fira Code', monospace;
  color: var(--accent-secondary, #C6A84B);
`;

export const ProgressTrack = styled.div`
  height: 12px;
  margin-top: 0.875rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bg-base, #030712);
`;

export const ProgressFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  height: 100%;
  background: linear-gradient(90deg, var(--accent-secondary, #C6A84B), var(--accent-primary, #60C0F0));
  transition: width 0.35s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const SectionPanel = styled.section`
  min-height: 14rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  background: var(--bg-elevated, #141419);
`;

export const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.875rem;
  font-size: 1rem;
`;

export const ListRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0;
  border-top: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));

  strong,
  span {
    display: block;
  }

  span {
    color: var(--text-secondary, #94a3b8);
    font-size: 0.78rem;
  }
`;

export const MiniBadge = styled.div`
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--accent-secondary, #C6A84B);
  background: color-mix(in srgb, var(--accent-secondary, #C6A84B) 12%, transparent);
`;

export const RankBadge = styled(MiniBadge)`
  font: 800 0.9rem 'Fira Code', monospace;
`;

export const EmptyText = styled.p`
  margin: 0;
  padding: 1rem 0;
  color: var(--text-secondary, #94a3b8);
  line-height: 1.5;
`;
