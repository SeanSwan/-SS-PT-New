/**
 * ============================================================================
 * FILE: WorkoutsTabStyles.ts
 * PURPOSE: Styled components for WorkoutsTab Overwatch-style exercise chart
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: All styled-components for the WorkoutsTab exercise usage
 * chart, themed with Crystalline Swan palette and CSS variable fallbacks.
 *
 * HOW IT FITS IN THE APP: WorkoutsTab.tsx imports these for its layout.
 * KEY DECISIONS: Extracted to keep WorkoutsTab under 300 lines.
 */

import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

export const SectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const MockBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  color: #C6A84B;
  background: rgba(198, 168, 75, 0.15);
  border: 1px solid rgba(198, 168, 75, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
`;

export const LogButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  border: none;
  color: #FFFFFF;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  min-height: 44px;
  min-width: 44px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 4px; }
`;

export const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

export const StatCard = styled.div`
  background: var(--bg-elevated, rgba(20, 20, 25, 0.8));
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

export const StatIcon = styled.div`color: #60C0F0;`;

export const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const StatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: rgba(224, 236, 244, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const CategorySection = styled.div`
  background: var(--bg-elevated, rgba(20, 20, 25, 0.7));
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 12px;
  overflow: hidden;
`;

export const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
`;

export const CategoryIcon = styled.span`font-size: 1.1rem;`;

export const CategoryName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  letter-spacing: 1.5px;
  flex: 1;
`;

export const CategoryCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.5);
`;

export const ChartScroll = styled.div`
  max-height: 180px; /* ~5 bars visible, scroll for more */
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(96, 192, 240, 0.2) transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(96, 192, 240, 0.2); border-radius: 2px; }
`;

export const ChartContainer = styled.div`
  width: 100%;
  svg { overflow: visible; }
`;

export const ErrorCard = styled.div`
  background: rgba(26, 26, 36, 0.95);
  border-left: 4px solid #C92A54;
  border-radius: 8px;
  padding: 16px 20px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  p { margin: 0 0 12px; }
`;

export const RetryButton = styled.button`
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.3);
  color: #60C0F0;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  font-family: 'Sora', sans-serif;
  &:hover { background: rgba(96, 192, 240, 0.2); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 4px; }
`;

export const ShimmerCard = styled.div`
  height: 72px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(20,20,25,0.6) 0%, rgba(80,160,240,0.08) 50%, rgba(20,20,25,0.6) 100%);
  background-size: 200px 100%;
  @keyframes shimmerAnim { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } }
  animation: shimmerAnim 1.5s ease-in-out infinite;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Empty State
// PURPOSE: Shown when no workouts have been logged yet
// ─────────────────────────────────────────────────────────────
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
  text-align: center;
  min-height: 300px;
`;

export const EmptyTitle = styled.h4`
  color: var(--text-heading, #E0ECF4);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const EmptyText = styled.p`
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  max-width: 360px;
`;
