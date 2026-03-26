/**
 * ============================================================================
 * FILE: AdminStellarSidebar.tsx
 * PURPOSE: Admin workspace navigation sidebar — Crystalline Swan theme
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the admin dashboard sidebar navigation.
 * Collapsible on desktop (64px/280px), full-screen overlay on mobile.
 * Uses CSS custom properties matching the MasterDetail layout theme.
 *
 * HOW IT FITS IN THE APP: UnifiedAdminDashboardLayout → AdminStellarSidebar
 *
 * KEY DECISIONS: Rebuilt from scratch to match Clients & Team MasterDetail
 * theme. Uses CSS custom properties (var(--bg-base, ...)) instead of old
 * executiveCommandTheme object. Dark-first design with cyan/purple accents.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AdminStellarSidebar                              ║
 * ║  PURPOSE: Admin workspace navigation (dark-first, responsive)║
 * ║  OWNER: Claude Opus 4.6 (CEO)                                ║
 * ║  LAST VALIDATED: 2026-03-26                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { WORKSPACE_CONFIG } from '../../../../config/dashboard-tabs';
import {
  Shield, Users, Calendar, Dumbbell, Gamepad2,
  DollarSign, Video, BarChart3, Settings, Globe,
  ChevronRight, ChevronLeft, Menu, X, UserCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Icon Map
// PURPOSE: Maps WORKSPACE_CONFIG icon strings to Lucide components
// ─────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Shield, Users, Calendar, Dumbbell, Gamepad2,
  DollarSign, Video, BarChart3, Settings, Globe,
};

const getIcon = (name: string, size = 20) => {
  const Icon = iconMap[name] || Shield;
  return <Icon size={size} />;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const surfaceRise = keyframes`
  0% { opacity: 0; transform: translateX(-12px); }
  100% { opacity: 1; transform: translateX(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components — CSS Custom Properties (dark-first)
// WHY: Matches MasterDetail layout aesthetic exactly
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

const LogoBrand = styled.div<{ $collapsed: boolean }>`
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
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%);
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

const Divider = styled.div<{ $collapsed: boolean }>`
  height: 1px;
  margin: 8px ${({ $collapsed }) => ($collapsed ? '12px' : '16px')};
  background: var(--border-soft, rgba(224, 236, 244, 0.06));
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
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface AdminStellarSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  // Aliases used by UniversalDashboardLayout
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onToggleMobile?: () => void;
}

const AdminStellarSidebar: React.FC<AdminStellarSidebarProps> = ({
  collapsed: controlledCollapsed,
  onCollapsedChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onToggleMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const sidebarRef = useRef<HTMLElement>(null);

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? isCollapsed ?? internalCollapsed;
  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onCollapsedChange?.(val);
    if (onToggleCollapse) onToggleCollapse();
  };
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = isMobileOpen ?? internalMobileOpen;
  const setMobileOpen = (val: boolean) => {
    setInternalMobileOpen(val);
    if (onToggleMobile && val !== mobileOpen) onToggleMobile();
  };
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  );

  // ── Responsive detection ──
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Keyboard: Escape closes mobile ──
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const handleNav = useCallback((route: string) => {
    navigate(route);
    if (isMobile) setMobileOpen(false);
  }, [navigate, isMobile]);

  const isActive = useCallback((prefix: string) => {
    return location.pathname === prefix || location.pathname.startsWith(prefix + '/');
  }, [location.pathname]);

  const showLabel = !collapsed || isMobile;

  return (
    <>
      {/* Mobile hamburger */}
      {isMobile && !mobileOpen && (
        <MobileMenuBtn
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin menu"
        >
          <Menu size={22} />
        </MobileMenuBtn>
      )}

      {/* Mobile overlay */}
      <Overlay $visible={mobileOpen && isMobile} onClick={() => setMobileOpen(false)} />

      {/* Sidebar */}
      <SidebarWrap
        ref={sidebarRef}
        $collapsed={collapsed && !isMobile}
        $mobileOpen={mobileOpen}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* Header */}
        <SidebarHeader $collapsed={collapsed && !isMobile}>
          <LogoBrand $collapsed={collapsed && !isMobile}>
            <LogoMark>SS</LogoMark>
            <LogoLabel $visible={showLabel}>Admin</LogoLabel>
          </LogoBrand>

          <CollapseBtn
            $collapsed={collapsed}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </CollapseBtn>

          <MobileCloseBtn
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu"
          >
            <X size={18} />
          </MobileCloseBtn>
        </SidebarHeader>

        {/* Navigation items */}
        <NavScroll>
          {WORKSPACE_CONFIG.map((ws, i) => (
            <NavItem
              key={ws.id}
              $active={isActive(ws.prefix)}
              $collapsed={collapsed && !isMobile}
              onClick={() => handleNav(ws.prefix)}
              role="menuitem"
              aria-label={ws.label}
              aria-current={isActive(ws.prefix) ? 'page' : undefined}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <NavIcon>{getIcon(ws.icon)}</NavIcon>
              <NavLabel $visible={showLabel}>{ws.label}</NavLabel>
              {collapsed && !isMobile && (
                <NavTooltip>{ws.label}</NavTooltip>
              )}
            </NavItem>
          ))}

          {/* My Training link for admin/trainer */}
          {(user?.role === 'admin' || user?.role === 'trainer') && (
            <>
              <Divider $collapsed={collapsed && !isMobile} />
              <NavItem
                $active={isActive('/client-dashboard')}
                $collapsed={collapsed && !isMobile}
                onClick={() => handleNav('/client-dashboard')}
                role="menuitem"
                aria-label="My Training"
              >
                <NavIcon><UserCircle size={20} /></NavIcon>
                <NavLabel $visible={showLabel}>My Training</NavLabel>
                {collapsed && !isMobile && (
                  <NavTooltip>My Training</NavTooltip>
                )}
              </NavItem>
            </>
          )}
        </NavScroll>

        {/* Footer */}
        <SidebarFooter $collapsed={collapsed && !isMobile}>
          {showLabel && <FooterVersion>SwanStudios v2.1</FooterVersion>}
        </SidebarFooter>
      </SidebarWrap>
    </>
  );
};

export default AdminStellarSidebar;
