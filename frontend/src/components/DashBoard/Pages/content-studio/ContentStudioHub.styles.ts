/**
 * ============================================================================
 * FILE: ContentStudioHub.styles.ts
 * PURPOSE: Styled components for ContentStudioHub layout, tabs, service cards
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-06
 * ============================================================================
 */

import styled from 'styled-components';

export const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0;
  gap: 16px;
  flex-wrap: wrap;
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
`;

export const Title = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

export const StudioBrief = styled.p`
  flex: 1 1 360px;
  max-width: 720px;
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

export const TierBadge = styled.span<{ $tier: 'bootstrap' | 'full' }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 6px;
  color: ${({ $tier }) => ($tier === 'full' ? '#C6A84B' : '#60C0F0')};
  background: ${({ $tier }) =>
    $tier === 'full' ? 'rgba(198, 168, 75, 0.15)' : 'rgba(96, 192, 240, 0.12)'};
  border: 1px solid ${({ $tier }) =>
    $tier === 'full' ? 'rgba(198, 168, 75, 0.3)' : 'rgba(96, 192, 240, 0.2)'};
`;

export const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 16px 24px;
`;

export const ServiceCard = styled.div<{ $configured: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $configured }) =>
    $configured ? 'rgba(96, 192, 240, 0.25)' : 'rgba(96, 192, 240, 0.08)'};
  transition: all 0.2s ease;
  &:hover { background: var(--bg-surface, #1A1A24); }
`;

export const ServiceIcon = styled.div<{ $configured: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $configured }) =>
    $configured ? 'rgba(96, 192, 240, 0.12)' : 'rgba(139, 92, 246, 0.12)'};
  color: ${({ $configured }) => ($configured ? '#60C0F0' : '#8B5CF6')};
  flex-shrink: 0;
`;

export const ServiceInfo = styled.div` min-width: 0; `;

export const ServiceLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const ServiceMeta = styled.div<{ $configured: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: ${({ $configured }) => ($configured ? '#60C0F0' : 'rgba(224, 236, 244, 0.6)')};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 2px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

export const Tab = styled.button<{ $active: boolean; $locked?: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: ${({ $locked }) => ($locked ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  min-height: 44px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active, $locked }) =>
    $locked ? 'rgba(224, 236, 244, 0.3)'
    : $active ? 'var(--text-primary, #E0ECF4)'
    : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  border-bottom: 2px solid ${({ $active }) => ($active ? '#8B5CF6' : 'transparent')};
  white-space: nowrap;
  transition: all 0.2s ease;
  opacity: ${({ $locked }) => ($locked ? 0.5 : 1)};

  &:hover:not([disabled]) { color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: -2px; }
  svg { flex-shrink: 0; }
`;

export const TabContent = styled.div` min-height: 400px; `;

export const LoadingFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: rgba(224, 236, 244, 0.6);
  font-size: 0.9rem;
`;
