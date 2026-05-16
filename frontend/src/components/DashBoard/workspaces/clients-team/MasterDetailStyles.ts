/**
 * ============================================================================
 * FILE: MasterDetailStyles.ts
 * PURPOSE: Styled components for the Clients & Team Master-Detail layout
 * AUTHOR: Claude Opus 4.6 (CEO) + Gemini 3.1 Pro (CTO) | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Contains all styled-components for the master-detail
 * layout including the master pane, detail pane, client cards, pillar navigation,
 * animations, and responsive breakpoints.
 *
 * HOW IT FITS IN THE APP: ClientsWorkspace -> ClientMiniCard / ClientDetailView -> these styles
 *
 * KEY DECISIONS: Dark-first design (Obsidian Black #0A0A0F bg), Crystalline Swan
 * dual-glow system (Wing Purple border + Ice Wing inner glow on selection),
 * 320px collapsible master pane, full-screen mobile overlay at <1024px
 */

import styled, { css, keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animation Keyframes
// PURPOSE: Premium motion choreography — surfaceRise, staggered list, tab fade
// WHY: Differentiate from generic SaaS — Apple Fitness+ meets luxury vault
// ─────────────────────────────────────────────────────────────

export const surfaceRise = keyframes`
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const staggerFadeIn = keyframes`
  0% { opacity: 0; transform: translateX(-10px); }
  100% { opacity: 1; transform: translateX(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout Containers
// PURPOSE: Main flex layout for master-detail split
// WHY: 320px collapsible left + flexible right is the consensus pattern
// ─────────────────────────────────────────────────────────────

export const MasterDetailContainer = styled.div`
  display: flex;
  width: 100%;
  height: calc(100vh - 64px);
  background-color: var(--bg-base, #0A0A0F);
  overflow: hidden;
  position: relative;
`;

export const MasterPane = styled.aside<{ $isCollapsed: boolean }>`
  width: ${({ $isCollapsed }) => ($isCollapsed ? '64px' : '320px')};
  min-width: ${({ $isCollapsed }) => ($isCollapsed ? '64px' : '320px')};
  background-color: var(--bg-surface, #141419);
  border-right: 1px solid rgba(224, 236, 244, 0.05);
  transition: width 300ms cubic-bezier(0.2, 0.8, 0.2, 1),
              min-width 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  z-index: 10;
  overflow: hidden;

  @media (max-width: 1023px) {
    width: 100%;
    min-width: 100%;
    border-right: none;
  }
`;

export const DetailPane = styled.main<{ $isOpenOnMobile: boolean }>`
  flex: 1;
  background-color: var(--bg-base, #0A0A0F);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: 1023px) {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--bg-surface, #141419);
    z-index: 20;
    transform: ${({ $isOpenOnMobile }) =>
      $isOpenOnMobile ? 'translateX(0)' : 'translateX(100%)'};
    transition: transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Master Pane Header & Search
// PURPOSE: Sticky header with micro-stats and search/filter
// ─────────────────────────────────────────────────────────────

export const MasterHeader = styled.header`
  position: sticky;
  top: 0;
  background: rgba(20, 20, 25, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 5;
  padding: 16px;
  border-bottom: 1px solid rgba(224, 236, 244, 0.05);

  @supports not (backdrop-filter: blur(12px)) {
    background: #141419;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
`;

export const CollapseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary, #4070C0);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  transition: all 200ms ease;

  &:hover {
    background: rgba(96, 192, 240, 0.1);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

export const MicroStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
`;

export const StatBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;

  span {
    font-family: 'Sora', sans-serif;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary, #E0ECF4);
    opacity: 0.6;
  }

  strong {
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent-primary, #50A0F0);
  }
`;

export const AttentionStat = styled(StatBlock)`
  strong {
    color: #C6A84B;
  }
`;

export const SearchRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

export const SearchInput = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid rgba(224, 236, 244, 0.08);
  border-radius: 8px;
  padding: 0 12px;
  height: 44px;
  transition: border-color 200ms ease;

  &:focus-within {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px rgba(96, 192, 240, 0.15);
  }

  svg {
    color: var(--text-secondary, #4070C0);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    outline: none;

    &::placeholder {
      color: rgba(224, 236, 244, 0.4);
    }
  }
`;

export const FilterButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid rgba(224, 236, 244, 0.08);
  border-radius: 8px;
  color: var(--text-secondary, #4070C0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Pillar Navigation (Segmented Control)
// PURPOSE: 4-pillar toggle replacing 11-tab strip
// WHY: Roster/Growth/Studio/Comms maps to trainer workflow
// ─────────────────────────────────────────────────────────────

export const PillarNav = styled.nav`
  display: flex;
  background: var(--bg-base, #0A0A0F);
  border-radius: 12px;
  padding: 4px;
  height: 44px;
  margin-bottom: 12px;
`;

export const PillarButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${({ $active }) => ($active ? 'var(--bg-elevated, #1A1A24)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #4070C0)')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 0 8px;
  transition: all 200ms ease;
  white-space: nowrap;
  overflow: hidden;

  ${({ $active }) => $active && css`
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  `}

  &:hover:not(:disabled) {
    color: var(--text-primary, #E0ECF4);
    background: ${({ $active }) => ($active ? 'var(--bg-elevated, #1A1A24)' : 'rgba(96, 192, 240, 0.05)')};
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
  }

  @media (max-width: 767px) {
    span { display: none; }
    gap: 0;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Client List & Cards
// PURPOSE: Scrollable client list with compact cards
// ─────────────────────────────────────────────────────────────

export const ClientList = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px 8px;

  /* Custom scrollbar for dark theme */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(96, 192, 240, 0.15);
    border-radius: 4px;
  }
`;

export const ClientCardButton = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  min-height: 72px;
  padding: 12px 16px;
  background-color: ${({ $isSelected }) => ($isSelected ? '#1A1A24' : 'transparent')};
  border: none;
  border-left: 3px solid ${({ $isSelected }) => ($isSelected ? '#8B5CF6' : 'transparent')};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  border-radius: 0 8px 8px 0;
  margin-bottom: 2px;
  transition: all 200ms ease;
  opacity: 0;
  animation: ${staggerFadeIn} 300ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-delay: calc(var(--stagger-idx, 0) * 30ms);

  /* Dual-Glow: Wing Purple border + Ice Wing inner glow */
  ${({ $isSelected }) => $isSelected && css`
    box-shadow: inset 12px 0 24px -12px rgba(96, 192, 240, 0.15);
  `}

  &:hover {
    background-color: #1A1A24;
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: -2px;
  }
`;

export const ClientAvatar = styled.div<{ $tier?: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $tier }) => {
    switch ($tier) {
      case 'premium': return 'linear-gradient(135deg, #C6A84B, #8B5CF6)';
      case 'elite': return 'linear-gradient(135deg, #8B5CF6, #60C0F0)';
      default: return 'linear-gradient(135deg, #002060, #003080)';
    }
  }};
`;

export const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ClientName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ClientMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, #4070C0);
  margin-top: 2px;
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const StatusDot = styled.span<{ $status: 'active' | 'inactive' | 'pending' }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $status }) => {
    switch ($status) {
      case 'active': return '#60C0F0';
      case 'pending': return '#C6A84B';
      case 'inactive': return '#64748b';
      default: return '#64748b';
    }
  }};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Quick Action Buttons (on client card)
// PURPOSE: 3 icon buttons — Message, Log Workout, View Workouts
// ─────────────────────────────────────────────────────────────

export const QuickActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`;

export const QuickActionBtn = styled.button<{ $alert?: boolean }>`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(96, 192, 240, 0.05);
  color: var(--text-secondary, #4070C0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 200ms ease;

  &:hover {
    background: rgba(96, 192, 240, 0.15);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }

  /* Alert dot for overdue weigh-in */
  ${({ $alert }) => $alert && css`
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #C6A84B;
      border: 2px solid #141419;
    }
  `}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Engagement Progress Bar
// PURPOSE: Cosmic Nebula gradient horizontal bar (Sprint 1)
// ─────────────────────────────────────────────────────────────

export const EngagementTrack = styled.div`
  width: 100%;
  height: 4px;
  background-color: var(--bg-base, #0A0A0F);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 6px;
`;

export const EngagementFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => Math.min(Math.max($progress, 0), 100)}%;
  background: linear-gradient(90deg, #8B5CF6 0%, #60C0F0 100%);
  border-radius: 2px;
  transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 6px rgba(96, 192, 240, 0.3);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Detail Pane Components
// PURPOSE: Content wrapper, tab bar, empty state for right pane
// ─────────────────────────────────────────────────────────────

export const DetailContentWrapper = styled.div`
  animation: ${surfaceRise} 350ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

export const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

export const DetailClientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const DetailAvatar = styled(ClientAvatar)`
  width: 56px;
  height: 56px;
  min-width: 56px;
  font-size: 20px;
`;

export const DetailName = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const DetailSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, #4070C0);
  margin: 4px 0 0;
`;

export const DetailTabBar = styled.nav`
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(224, 236, 244, 0.08);
  margin-bottom: 24px;
`;

export const DetailTabButton = styled.button<{ $active: boolean }>`
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#60C0F0' : 'transparent')};
  color: ${({ $active }) => ($active ? '#60C0F0' : 'var(--text-secondary, #4070C0)')};
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 200ms ease;
  min-height: 44px;

  ${({ $active }) => $active && css`
    box-shadow: 0 2px 8px rgba(96, 192, 240, 0.2);
  `}

  &:hover:not(:disabled) {
    color: var(--text-primary, #E0ECF4);
    border-bottom-color: ${({ $active }) => ($active ? '#60C0F0' : 'rgba(96, 192, 240, 0.3)')};
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Empty State (Apex Command Center)
// PURPOSE: Displayed when no client is selected
// ─────────────────────────────────────────────────────────────

export const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 48px;
  text-align: center;
`;

export const EmptyStateTitle = styled.h2`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 32px;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 16px;
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

export const EmptyStateSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-secondary, #4070C0);
  max-width: 400px;
  line-height: 1.6;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Mobile Back Button
// PURPOSE: Back to Roster navigation on mobile detail overlay
// ─────────────────────────────────────────────────────────────

export const MobileBackButton = styled.button`
  display: none;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;

  @media (max-width: 1023px) {
    display: flex;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Pillar Content Views (sub-tab lists)
// PURPOSE: List views for non-client pillars (Growth, Studio, Comms)
// ─────────────────────────────────────────────────────────────

export const PillarContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
`;

export const PillarSubTab = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.08)' : 'transparent')};
  border: none;
  border-left: 2px solid ${({ $active }) => ($active ? '#60C0F0' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #4070C0)')};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  transition: all 200ms ease;
  border-radius: 0 8px 8px 0;

  &:hover {
    background: rgba(96, 192, 240, 0.05);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
  }

  svg {
    flex-shrink: 0;
    opacity: 0.7;
  }
`;
