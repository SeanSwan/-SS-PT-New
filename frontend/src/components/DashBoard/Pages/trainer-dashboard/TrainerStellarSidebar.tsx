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
import styled, { keyframes } from 'styled-components';
import GlobalClientSelector from '../../../Shared/GlobalClientSelector';
import {
  Users, ClipboardCheck, BarChart3,
  Video, Brain, Apple, Calendar, MessageSquare, Dumbbell,
  ChevronRight, ChevronLeft, Menu, X, Flame,
  Zap, Home,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const surfaceRise = keyframes`
  0% { opacity: 0; transform: translateX(-12px); }
  100% { opacity: 1; transform: translateX(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components — CSS Custom Properties (dark-first)
// WHY: Matches AdminStellarSidebar aesthetic exactly
// ─────────────────────────────────────────────────────────────

const Overlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: opacity 300ms ease;

  @media (min-width: 1025px) {
    display: none;
  }
`;

const MobileMenuBtn = styled.button`
  position: fixed;
  top: 68px;
  left: 12px;
  z-index: 1002;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  background: var(--bg-surface, #141419);
  color: var(--accent-secondary, #8B5CF6);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 200ms ease, border-color 200ms ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);

  &:hover {
    background: var(--bg-elevated, #1A1A24);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  @media (max-width: 1024px) {
    display: flex;
  }

  @media (max-width: 375px) {
    top: 62px;
    left: 8px;
  }
`;

const SidebarWrap = styled.aside<{ $collapsed: boolean; $mobileOpen: boolean }>`
  position: fixed;
  top: 56px;
  left: 0;
  bottom: 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  background: var(--bg-base, #0A0A0F);
  border-right: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  width: ${({ $collapsed }) => ($collapsed ? '64px' : '280px')};
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  overflow-y: ${({ $collapsed }) => ($collapsed ? 'visible' : 'hidden')};

  @media (max-width: 1024px) {
    top: 0;
    width: 85vw;
    max-width: 360px;
    border-right: none;
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.5);
    border-radius: 0 16px 16px 0;
    transform: translateX(${({ $mobileOpen }) => ($mobileOpen ? '0' : '-100%')});
  }

  @media (max-width: 375px) {
    width: 100vw;
    max-width: 100vw;
    border-radius: 0;
  }
`;

const SidebarHeader = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'space-between')};
  padding: 16px;
  min-height: 56px;
  border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  flex-shrink: 0;

  @media (max-width: 375px) {
    padding: 12px;
    min-height: 48px;
  }
`;

const LogoBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  white-space: nowrap;
`;

const LogoMark = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  /* Premium Vault Emblem — Midnight Sapphire with Ice Wing border */
  background: var(--bg-primary, #002060);
  border: 1px solid rgba(96, 192, 240, 0.3);
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  font-weight: 700;
  font-size: 14px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  text-shadow: 0 0 6px rgba(96, 192, 240, 0.6);

  @media (max-width: 375px) {
    width: 32px;
    height: 32px;
    min-width: 32px;
    font-size: 12px;
  }
`;

const LogoLabel = styled.span<{ $visible: boolean }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateX(${({ $visible }) => ($visible ? '0' : '-8px')});
  transition: opacity 200ms ease, transform 200ms ease;
`;

const CollapseBtn = styled.button<{ $collapsed: boolean }>`
  /* Enforce 44px minimum touch target */
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ $collapsed }) =>
    $collapsed
      ? 'rgba(96, 192, 240, 0.3)'
      : 'rgba(224, 236, 244, 0.06)'};
  background: ${({ $collapsed }) =>
    $collapsed
      ? 'var(--bg-elevated, #1A1A24)'
      : 'transparent'};
  color: ${({ $collapsed }) =>
    $collapsed
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, #4070C0)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: ${({ $collapsed }) => ($collapsed ? 'absolute' : 'static')};
  ${({ $collapsed }) =>
    $collapsed
      ? `
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(10, 10, 15, 0.5);
  `
      : ''}

  &:hover {
    background: var(--bg-elevated, #1A1A24);
    color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.25);
    transform: ${({ $collapsed }) => ($collapsed ? 'translateX(-50%) scale(1.05)' : 'scale(1.05)')};
  }

  @media (max-width: 1024px) {
    display: none;
  }
`;

const MobileCloseBtn = styled.button`
  /* Enforce 44px minimum touch target */
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  /* Crimson Frost — official error token */
  border: 1px solid rgba(201, 42, 84, 0.2);
  background: rgba(201, 42, 84, 0.08);
  color: #C92A54;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(201, 42, 84, 0.15);
    box-shadow: 0 0 12px rgba(201, 42, 84, 0.2);
  }

  @media (max-width: 1024px) {
    display: flex;
  }
`;

const SectionLabel = styled.div<{ $visible: boolean }>`
  padding: 0 20px;
  margin-top: 24px;
  margin-bottom: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-tertiary, #4070C0);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  height: ${({ $visible }) => ($visible ? 'auto' : '0')};
  overflow: hidden;
  transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
`;

const NavScroll = styled.nav`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;

  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent) transparent;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
    border-radius: 2px;
  }
`;

const NavItem = styled.button<{ $active: boolean; $collapsed: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  margin: 4px 8px;
  padding: ${({ $collapsed }) => ($collapsed ? '12px 0' : '10px 12px')};
  /* DESIGN-4: 64px item height for touch targets */
  min-height: 64px;
  border-radius: 10px;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};

  /* Crystalline Active State */
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #4070C0)'};
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%)'
      : 'transparent'};
  border-left: 3px solid ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};
  transition: all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  animation: ${surfaceRise} 400ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  position: relative;

  ${({ $active }) =>
    $active &&
    `box-shadow: inset 4px 0 12px -4px rgba(139, 92, 246, 0.4);`}

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, transparent 100%)'
        : 'rgba(96, 192, 240, 0.06)'};
    color: var(--text-primary, #E0ECF4);
    /* DESIGN-4: Ice Wing hover border */
    border-left-color: var(--ice-wing, rgb(96, 192, 240));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  @media (max-width: 375px) {
    padding: 10px 12px;
  }

  /* Dual-glow: active icon gets Ice Wing glow */
  svg {
    color: ${({ $active }) =>
      $active ? 'var(--accent-primary, #60C0F0)' : 'inherit'};
    filter: ${({ $active }) =>
      $active ? 'drop-shadow(0 0 6px rgba(96, 192, 240, 0.5))' : 'none'};
    transition: all 250ms ease;
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const NavLabel = styled.span<{ $visible: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  width: ${({ $visible }) => ($visible ? 'auto' : '0')};
  transition: opacity 200ms ease;

  @media (max-width: 1024px) {
    font-size: 16px;
  }

  @media (max-width: 375px) {
    font-size: 15px;
  }
`;

const NavTooltip = styled.div`
  position: absolute;
  left: calc(100% + 16px);
  top: 50%;
  transform: translateY(-50%) scale(0.95);
  z-index: 1100;
  padding: 8px 14px;
  border-radius: 8px;

  /* Deep-Ocean Glassmorphism */
  background: rgba(26, 26, 36, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  box-shadow: 0 8px 24px rgba(10, 10, 15, 0.8);

  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);

  ${NavItem}:hover & {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
`;

const SidebarFooter = styled.div<{ $collapsed: boolean }>`
  padding: ${({ $collapsed }) => ($collapsed ? '12px 8px' : '12px 16px')};
  border-top: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  flex-shrink: 0;
`;

const FooterVersion = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, #4070C0);
  text-align: center;
  opacity: 0.6;

  @media (max-width: 1024px) {
    font-size: 12px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Navigation Configuration
// ─────────────────────────────────────────────────────────────

const trainerNavConfig = [
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
      { label: 'Client Progress', path: '/dashboard/trainer/client-progress', icon: BarChart3 },
      { label: 'Messages', path: '/dashboard/trainer/messages', icon: MessageSquare },
    ],
  },
  {
    section: 'BUILD',
    items: [
      { label: 'Workout Forge', path: '/dashboard/trainer/workout-forge', icon: Zap },
      { label: 'PLAUD Intake', path: '/dashboard/trainer/plaud', icon: Brain },
      { label: 'Workout Planner', path: '/dashboard/trainer/workout-planner', icon: Dumbbell },
      { label: 'Bootcamp Creator', path: '/dashboard/trainer/bootcamp', icon: Flame },
      { label: 'Nutrition Intelligence', path: '/dashboard/trainer/meal-planner', icon: Apple },
    ],
  },
  {
    section: 'SCHEDULE',
    items: [
      { label: 'My Schedule', path: '/dashboard/trainer/schedule', icon: Calendar },
      { label: 'Log Session', path: '/dashboard/trainer/log-workout', icon: ClipboardCheck },
    ],
  },
  {
    section: 'STUDIO',
    items: [
      { label: 'Training Videos', path: '/dashboard/trainer/videos', icon: Video },
      { label: 'Swan Coach', path: '/dashboard/trainer/coach-assistant', icon: Brain },
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

  const isActive = useCallback((prefix: string) => {
    return location.pathname === prefix || location.pathname.startsWith(prefix + '/');
  }, [location.pathname]);

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
        {!collapsed && <GlobalClientSelector />}

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
