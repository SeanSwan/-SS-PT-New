/**
 * ============================================================================
 * FILE: TrainerStellarSidebar.tsx
 * PURPOSE: Trainer dashboard navigation sidebar — Crystalline Swan theme
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the trainer dashboard sidebar navigation.
 * Collapsible on desktop (64px/280px), full-screen overlay on mobile.
 * Uses CSS custom properties matching the admin MasterDetail layout theme.
 *
 * HOW IT FITS IN THE APP: UniversalDashboardLayout → TrainerStellarSidebar
 *
 * KEY DECISIONS: Rebuilt from scratch to match AdminStellarSidebar pattern.
 * CSS custom properties (var(--bg-base, ...)) for theme changer compatibility.
 * Dark-first design with Wing Purple primary accent for trainer identity.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GlobalClientSelector from '../../../Shared/GlobalClientSelector';
import {
  Users, ClipboardCheck, BarChart3,
  Video, Brain, Apple, Calendar, MessageSquare, Dumbbell,
  ChevronRight, ChevronLeft, Menu, X, Flame,
  Zap, Home,
} from 'lucide-react';
import {
  Overlay,
  MobileMenuBtn,
  SidebarWrap,
  SidebarHeader,
  LogoBrand,
  LogoMark,
  LogoLabel,
  CollapseBtn,
  MobileCloseBtn,
  SectionLabel,
  NavScroll,
  NavItem,
  NavIcon,
  NavLabel,
  NavTooltip,
  SidebarFooter,
  FooterVersion,
} from './TrainerStellarSidebar.styles';
import { TRAINER_HOME_COACH_PATH } from './TrainerHomeQuickActions.config';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

export const trainerNavConfig = [
  {
    section: 'HOME',
    items: [
      { label: 'Home', path: '/dashboard/trainer/overview', icon: Home },
    ],
  },
  {
    section: 'CLIENTS',
    items: [
      { label: 'My Clients', path: '/dashboard/trainer/clients', icon: Users },
      { label: 'Log Workout', path: '/dashboard/trainer/clients?intent=log_workout', icon: ClipboardCheck },
      { label: 'Client Progress', path: '/dashboard/trainer/client-progress', icon: BarChart3 },
      { label: 'Messages', path: '/dashboard/trainer/messages', icon: MessageSquare },
    ],
  },
  {
    section: 'BUILD',
    items: [
      { label: 'Build Plan', path: '/dashboard/trainer/build-plan', icon: Zap },
      { label: 'PLAUD Intake', path: '/dashboard/trainer/plaud', icon: Brain },
      { label: 'Plan Library', path: '/dashboard/trainer/workout-planner', icon: Dumbbell },
      { label: 'Bootcamp Creator', path: '/dashboard/trainer/bootcamp', icon: Flame },
      { label: 'Nutrition Intelligence', path: '/dashboard/trainer/meal-planner', icon: Apple },
    ],
  },
  {
    section: 'SCHEDULE',
    items: [
      { label: 'My Schedule', path: '/dashboard/trainer/schedule', icon: Calendar },
    ],
  },
  {
    section: 'STUDIO',
    items: [
      { label: 'Training Videos', path: '/dashboard/trainer/videos', icon: Video },
      { label: 'Swan Coach', path: TRAINER_HOME_COACH_PATH, icon: Brain },
      { label: 'My Home', path: '/dashboard/trainer/my-home', icon: Home },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface TrainerStellarSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onToggleMobile?: () => void;
}

const TrainerStellarSidebar: React.FC<TrainerStellarSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onToggleMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  );

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen && isMobile) {
      document.body.classList.add('mobile-sidebar-open');
    } else {
      document.body.classList.remove('mobile-sidebar-open');
    }
    return () => document.body.classList.remove('mobile-sidebar-open');
  }, [isMobileOpen, isMobile]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onToggleMobile) onToggleMobile();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobileOpen, onToggleMobile]);

  const handleNav = useCallback((route: string) => {
    navigate(route);
    if (isMobile && onToggleMobile) onToggleMobile();
  }, [navigate, isMobile, onToggleMobile]);

  const isActive = useCallback((path: string) => {
    const [basePath, query = ''] = path.split('?');
    const matchesPath = location.pathname === basePath || location.pathname.startsWith(basePath + '/');

    if (!matchesPath) return false;
    if (!query) return !location.search;

    return location.search === `?${query}`;
  }, [location.pathname, location.search]);

  const collapsed = isMobile ? false : isCollapsed;
  const showLabel = !collapsed;

  return (
    <>
      {isMobile && !isMobileOpen && (
        <MobileMenuBtn
          onClick={onToggleMobile}
          aria-label="Open trainer menu"
        >
          <Menu size={22} />
        </MobileMenuBtn>
      )}

      <Overlay $visible={isMobileOpen && isMobile} onClick={onToggleMobile} />

      <SidebarWrap
        ref={sidebarRef}
        $collapsed={collapsed}
        $mobileOpen={isMobileOpen}
        role="navigation"
        aria-label="Trainer navigation"
      >
        <SidebarHeader $collapsed={collapsed}>
          <LogoBrand>
            <LogoMark>SS</LogoMark>
            <LogoLabel $visible={showLabel}>Trainer</LogoLabel>
          </LogoBrand>

          {onToggleCollapse && (
            <CollapseBtn
              $collapsed={isCollapsed}
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </CollapseBtn>
          )}

          <MobileCloseBtn
            onClick={onToggleMobile}
            aria-label="Close trainer menu"
          >
            <X size={18} />
          </MobileCloseBtn>
        </SidebarHeader>

        {/* Global Client Selector — only when sidebar is expanded */}
        {!collapsed && (
          <GlobalClientSelector closeKey={`${location.pathname}:${isMobileOpen}`} />
        )}

        <NavScroll>
          {trainerNavConfig.map((group) => (
            <React.Fragment key={group.section}>
              <SectionLabel $visible={showLabel}>{group.section}</SectionLabel>
              {group.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <NavItem
                    key={item.path}
                    $active={isActive(item.path)}
                    $collapsed={collapsed}
                    onClick={() => handleNav(item.path)}
                    role="menuitem"
                    aria-label={item.label}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <NavIcon><Icon size={20} /></NavIcon>
                    <NavLabel $visible={showLabel}>{item.label}</NavLabel>
                    {collapsed && <NavTooltip>{item.label}</NavTooltip>}
                  </NavItem>
                );
              })}
            </React.Fragment>
          ))}
        </NavScroll>

        <SidebarFooter $collapsed={collapsed}>
          {showLabel && <FooterVersion>SwanStudios v2.1</FooterVersion>}
        </SidebarFooter>
      </SidebarWrap>
    </>
  );
};

export default TrainerStellarSidebar;
