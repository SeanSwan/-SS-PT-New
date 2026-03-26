/**
 * ============================================================================
 * FILE: ClientStellarSidebar.tsx
 * PURPOSE: Client dashboard navigation sidebar — Crystalline Swan theme
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the client dashboard sidebar navigation.
 * Collapsible on desktop (64px/280px), full-screen overlay on mobile.
 * Uses CSS custom properties matching the admin MasterDetail layout theme.
 *
 * HOW IT FITS IN THE APP: UniversalDashboardLayout → ClientStellarSidebar
 *
 * KEY DECISIONS: Rebuilt from scratch to match AdminStellarSidebar pattern.
 * CSS custom properties for theme changer compatibility.
 * Dark-first design with Ice Wing cyan primary accent for client identity.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  Home, Dumbbell, TrendingUp, Brain, UtensilsCrossed, Shield,
  Calendar, Users, MessageSquare, User, Award, Star,
  ChevronRight, ChevronLeft, Menu, X,
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
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: var(--bg-surface, #141419);
  color: var(--accent-primary, #60C0F0);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 200ms ease, border-color 200ms ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);

  &:hover {
    background: var(--bg-elevated, #1A1A24);
    border-color: var(--accent-primary, #60C0F0);
  }

  @media (max-width: 1024px) {
    display: flex;
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
    width: 300px;
    max-width: 85vw;
    border-right: none;
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.5);
    border-radius: 0 16px 16px 0;
    transform: translateX(${({ $mobileOpen }) => ($mobileOpen ? '0' : '-100%')});
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
`;

const LogoBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  white-space: nowrap;
`;

const LogoMark = styled.div`
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0) 0%, var(--accent-secondary, #8B5CF6) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  font-family: 'Plus Jakarta Sans', sans-serif;
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
  width: ${({ $collapsed }) => ($collapsed ? '32px' : '28px')};
  height: ${({ $collapsed }) => ($collapsed ? '32px' : '28px')};
  min-width: ${({ $collapsed }) => ($collapsed ? '32px' : '28px')};
  min-height: ${({ $collapsed }) => ($collapsed ? '32px' : '28px')};
  border-radius: ${({ $collapsed }) => ($collapsed ? '50%' : '6px')};
  border: 1px solid ${({ $collapsed }) =>
    $collapsed
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'
      : 'var(--border-soft, rgba(224, 236, 244, 0.06))'};
  background: ${({ $collapsed }) =>
    $collapsed
      ? 'var(--bg-elevated, #1A1A24)'
      : 'var(--bg-surface, #141419)'};
  color: ${({ $collapsed }) =>
    $collapsed
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, #4070C0)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
  position: ${({ $collapsed }) => ($collapsed ? 'absolute' : 'static')};
  ${({ $collapsed }) =>
    $collapsed
      ? `
    top: 72px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `
      : ''}

  &:hover {
    background: var(--bg-elevated, #1A1A24);
    color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  }

  @media (max-width: 1024px) {
    display: none;
  }
`;

const MobileCloseBtn = styled.button`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
  }

  @media (max-width: 1024px) {
    display: flex;
  }
`;

const SectionLabel = styled.div<{ $visible: boolean }>`
  padding: 0 20px;
  margin-top: 16px;
  margin-bottom: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  height: ${({ $visible }) => ($visible ? 'auto' : '0')};
  overflow: hidden;
  transition: opacity 200ms ease;
`;

const NavScroll = styled.nav`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;

  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent) transparent;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
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
  margin: 2px 8px;
  padding: ${({ $collapsed }) => ($collapsed ? '12px 0' : '10px 12px')};
  min-height: 44px;
  border-radius: 10px;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #4070C0)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'
      : 'transparent'};
  border-left: 3px solid ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
  animation: ${surfaceRise} 300ms ease backwards;
  position: relative;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  ${({ $active }) =>
    $active &&
    `box-shadow: inset 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);`}
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
`;

const NavTooltip = styled.div`
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 1100;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.1));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);

  ${NavItem}:hover & {
    opacity: 1;
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
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Navigation Configuration
// ─────────────────────────────────────────────────────────────

const clientNavConfig = [
  {
    section: 'HOME',
    items: [
      { label: 'Overview', path: '/dashboard/client/overview', icon: Home },
      { label: 'My Workouts', path: '/dashboard/client/workouts', icon: Dumbbell },
      { label: 'My Progress', path: '/dashboard/client/progress', icon: TrendingUp },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { label: 'Workout Intelligence', path: '/dashboard/client/workout-forge', icon: Brain },
      { label: 'Nutrition Intelligence', path: '/dashboard/client/meal-planner', icon: UtensilsCrossed },
      { label: 'AI Privacy & Consent', path: '/dashboard/client/ai-consent', icon: Shield },
    ],
  },
  {
    section: 'COMMUNITY',
    items: [
      { label: 'Book My Session', path: '/dashboard/client/schedule', icon: Calendar },
      { label: 'Community & Challenges', path: '/dashboard/client/community', icon: Users },
      { label: 'Messages', path: '/dashboard/client/messages', icon: MessageSquare },
    ],
  },
  {
    section: 'MY SPACE',
    items: [
      { label: 'My Profile & Settings', path: '/dashboard/client/profile', icon: User },
      { label: 'My Rewards', path: '/dashboard/client/rewards', icon: Award },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface ClientStellarSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onToggleMobile?: () => void;
}

const ClientStellarSidebar: React.FC<ClientStellarSidebarProps> = ({
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
          aria-label="Open client menu"
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
        aria-label="Client navigation"
      >
        <SidebarHeader $collapsed={collapsed}>
          <LogoBrand>
            <LogoMark><Star size={16} /></LogoMark>
            <LogoLabel $visible={showLabel}>SwanStudios</LogoLabel>
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
            aria-label="Close client menu"
          >
            <X size={18} />
          </MobileCloseBtn>
        </SidebarHeader>

        <NavScroll>
          {clientNavConfig.map((group) => (
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

export default ClientStellarSidebar;
