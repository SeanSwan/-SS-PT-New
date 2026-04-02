/**
 * ============================================================================
 * FILE: WorkoutsWorkspace.tsx
 * PURPOSE: Global Studio Library — admin/trainer tools (no client-specific content)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the Workouts workspace with 4 admin/trainer tabs:
 *   Boot Camp Builder, Equipment Manager, Nutrition, and Global Session Calendar.
 *   Client-specific tools (Planner, Logger, Body Map, Assessments, Form Analysis)
 *   have been moved to the Client Detail View Training/Biometrics tabs.
 *
 * HOW IT FITS IN THE APP:
 *   UnifiedAdminDashboard → WorkoutsWorkspace → Outlet (tab content)
 *
 * KEY DECISIONS:
 *   Removed client-drawer dependency — all remaining tabs are admin/trainer
 *   tools that operate globally, not on a specific client.
 *   AI Command Bar embedded at top for context-aware AI assistance.
 */

import React, { Suspense } from 'react';
import styled from 'styled-components';
import { Users, Camera, Apple, Calendar, Zap } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import { AICommandBar } from '../../Shared/AICommandBar';

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Configuration
// PURPOSE: 4 global admin/trainer tabs (no client-specific tools)
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'bootcamp', label: 'Boot Camp', icon: <Users size={16} />, path: '/dashboard/workouts/bootcamp' },
  { id: 'sprint-planner', label: 'Sprint Planner', icon: <Zap size={16} />, path: '/dashboard/workouts/sprint-planner' },
  { id: 'equipment', label: 'Equipment', icon: <Camera size={16} />, path: '/dashboard/workouts/equipment' },
  { id: 'nutrition', label: 'Nutrition', icon: <Apple size={16} />, path: '/dashboard/workouts/nutrition' },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} />, path: '/dashboard/workouts/calendar' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const WorkoutsWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTabId = TABS.find((t) =>
    location.pathname === t.path || location.pathname.startsWith(t.path + '/')
  )?.id || 'bootcamp';

  return (
    <WorkspaceRoot>
      {/* AI Command Bar */}
      <AICommandBarWrapper>
        <AICommandBar context="workout_generation" />
      </AICommandBarWrapper>

      {/* Tab Navigation */}
      <TabBar>
        <TabBarInner role="tablist" aria-label="Workouts workspace tabs">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              $active={activeTabId === tab.id}
              onClick={() => navigate(tab.path)}
              aria-selected={activeTabId === tab.id}
              role="tab"
            >
              {tab.icon}
              <span>{tab.label}</span>
            </TabButton>
          ))}
        </TabBarInner>
      </TabBar>

      {/* Content Area */}
      <ContentArea>
        <Suspense fallback={<CosmicSuspenseLoader />}>
          <Outlet />
        </Suspense>
      </ContentArea>
    </WorkspaceRoot>
  );
};

export default WorkoutsWorkspace;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const WorkspaceRoot = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
`;

const AICommandBarWrapper = styled.div`
  padding: 12px 16px 0;
  flex-shrink: 0;
`;

const TabBar = styled.div`
  padding: 0 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.1));
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex-shrink: 0;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabBarInner = styled.div`
  display: flex;
  gap: 4px;
  min-width: max-content;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent')};
  background: transparent;
  color: ${(p) => (p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-muted, #94a3b8)')};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  min-height: 48px;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    color: ${(p) => (p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)')};
    background: rgba(255, 255, 255, 0.02);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 12px;
    min-height: 44px;
    gap: 5px;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  @media (max-width: 375px) {
    padding: 6px 8px;
    font-size: 11px;

    span {
      display: none;
    }
  }
`;

const ContentArea = styled.div`
  flex: 1;
  position: relative;
  overflow-y: auto;
  padding: 16px;
`;
