/**
 * COMPONENT: ClientProgressDashboardPage.styles
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Theme-connected shell styles for the canonical client progress page.
 */

import styled, { keyframes } from 'styled-components';
import { ChevronRight, Star } from 'lucide-react';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const countUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const PageWrap = styled.div`
  width: min(100%, 1100px);
  padding: clamp(1rem, 2vw, 1.5rem);
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

export const PageTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.25rem, 2vw, 1.5rem);
  font-weight: 700;
`;

export const StatsStrip = styled.div<{ $bottom?: string }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: ${({ $bottom }) => $bottom ?? '1.25rem'};
`;

export const StatCard = styled.div<{ $accent?: string; $delay?: number }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: var(--world-panel-radius, 12px);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${({ $delay = 0 }) => `${$delay * 60}ms`};

  &:hover {
    border-color: ${({ $accent }) => $accent || 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const StatLabel = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const StatValue = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || 'var(--text-primary, #E0ECF4)'};
  font-family: 'Fira Code', monospace;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
`;

export const StatSub = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-size: 0.7rem;
`;

export const XpBarWrap = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const XpBarLabel = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
`;

export const XpBarTrack = styled.div`
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: var(--bg-surface, #1A1A24);
  overflow: hidden;
`;

export const XpBarFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 5px;
  width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
  background: linear-gradient(
    90deg,
    var(--accent-secondary, #8B5CF6),
    var(--accent-primary, #60C0F0)
  );
  box-shadow: 0 0 12px var(--glow-cyan, color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent));
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const XpBarPct = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  white-space: nowrap;
`;

export const SplitRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.div<{ $bottom?: string }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: var(--world-panel-radius, 12px);
  padding: 1.25rem;
  margin-bottom: ${({ $bottom }) => $bottom ?? 0};
`;

export const CardTitle = styled.h3<{ $bottom?: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: ${({ $bottom }) => `0 0 ${$bottom ?? '0.75rem'}`};
  color: var(--accent-primary, #60C0F0);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
`;

export const LabelStar = styled(Star)`
  margin-right: 4px;
  vertical-align: middle;
`;

export const TrailingChevron = styled(ChevronRight)`
  margin-left: auto;
`;

export const ChartsLoading = styled.div`
  padding: 2rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  text-align: center;
`;

export const RecapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
`;

export const RecapItem = styled.div`
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: var(--bg-surface, #1A1A24);
  border-radius: 8px;
`;

export const RecapEmptyState = styled.div`
  padding: 1rem;
  border-radius: 8px;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  background: var(--bg-surface, #1A1A24);
  border: 1px dashed var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  font-size: 0.85rem;
  text-align: center;
`;

export const RecapValue = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
`;

export const RecapLabel = styled.div`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  margin-top: 0.25rem;
  text-transform: uppercase;
`;

export const ChartsSection = styled.div`
  margin-bottom: 1.25rem;
`;

export const ChartsSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

export const DetailedLink = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 44px;
  padding: 1rem;
  color: var(--accent-primary, #60C0F0);
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
    transform: translateX(4px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Skeleton = styled.div<{ $w?: string; $h?: string }>`
  width: ${({ $w }) => $w || '100%'};
  height: ${({ $h }) => $h || '16px'};
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--skeleton-start, color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent)) 0%,
    var(--skeleton-mid, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)) 50%,
    var(--skeleton-start, color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent)) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.8s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
