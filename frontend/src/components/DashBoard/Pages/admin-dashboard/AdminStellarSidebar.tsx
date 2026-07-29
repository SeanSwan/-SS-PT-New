/**
 * ============================================================================
 * PURPOSE: Admin workspace navigation sidebar — Crystalline Swan theme
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the admin dashboard sidebar navigation.
 * Collapsible on desktop (64px/280px), full-screen overlay on mobile.
 * Uses CSS custom properties matching the MasterDetail layout theme.
 *
 * HOW IT FITS IN THE APP: UniversalDashboardLayout -> AdminStellarSidebar
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
import 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import {
  CollapseBtn,
  Divider,
  FooterVersion,
  LogoBrand,
  LogoLabel,
  LogoMark,
  MobileCloseBtn,
  MobileMenuBtn,
  NavIcon,
  NavItem,
  NavLabel,
  NavScroll,
  NavTooltip,
  Overlay,
  SectionHeader,
  SectionRule,
  SidebarFooter,
  SidebarHeader,
  SidebarWrap,
} from './AdminStellarSidebar.styles';
import { useFeatureAccess } from '../../../../context/FeatureAccessContext';
import GlobalClientSelector from '../../../Shared/GlobalClientSelector';
import { WORKSPACE_CONFIG, WORKSPACE_SECTIONS, WorkspaceConfig } from '../../../../config/dashboard-tabs';
import { Shield, Users, Calendar, Dumbbell, Gamepad2, DollarSign, CreditCard, Video, BarChart3, Settings, Globe, ChevronRight, ChevronLeft, Menu, X, UserCircle, UsersRound, Flame, Wrench, MessageCircle, Megaphone, ShieldCheck, FileSignature, Mail, Heart, Apple, Sparkles, Home, Camera, KeyRound, Unlock, Banknote, Rocket, Zap, ScanFace, ClipboardCheck } from 'lucide-react';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  Shield, Users, Calendar, Dumbbell, Gamepad2,
  DollarSign, CreditCard, Video, BarChart3, Settings, Globe,
  Flame, Wrench, MessageCircle, Megaphone, ShieldCheck, FileSignature,
  Mail, Heart, Apple, Sparkles, Home, Camera, KeyRound, Unlock, Banknote,
  UsersRound, UserCircle, Rocket,
  // Superset-closure capabilities (2026-07-24). getIcon() falls back to Shield
  // for unknown names, so a missing entry here is invisible at build time and
  // silently renders the wrong glyph. Locked by AdminStellarSidebar.iconCoverage.test.ts.
  Zap, ScanFace,
  // Workout-OS C0 (2026-07-29): owner personal logger entry.
  ClipboardCheck,
};

const getIcon = (name: string, size = 20) => {
  const Icon = iconMap[name] || Shield;
  return <Icon size={size} />;
};

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

interface AdminStellarSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
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
  const { hasFeature, isAdmin } = useFeatureAccess();
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
  const setMobileOpen = useCallback((val: boolean) => {
    setInternalMobileOpen(val);
    if (onToggleMobile && val !== mobileOpen) onToggleMobile();
  }, [mobileOpen, onToggleMobile]);
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
  }, [setMobileOpen]);

  // ── Lock body scroll when mobile sidebar is open ──
  useEffect(() => {
    if (mobileOpen && isMobile) {
      document.body.classList.add('mobile-sidebar-open');
    } else {
      document.body.classList.remove('mobile-sidebar-open');
    }
    return () => document.body.classList.remove('mobile-sidebar-open');
  }, [mobileOpen, isMobile]);

  // ── Keyboard: Escape closes mobile ──
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, setMobileOpen]);

  const handleNav = useCallback((route: string) => {
    navigate(route);
    if (isMobile) setMobileOpen(false);
  }, [navigate, isMobile, setMobileOpen]);

  const isActive = useCallback((prefix: string) => {
    const [basePath, query = ''] = prefix.split('?');
    const matchesPath = location.pathname === basePath || location.pathname.startsWith(basePath + '/');
    if (!matchesPath) return false;

    const currentParams = new URLSearchParams(location.search);
    if (query) {
      const expectedParams = new URLSearchParams(query);
      return Array.from(expectedParams.entries()).every(([key, value]) => currentParams.get(key) === value);
    }

    return true;
  }, [location.pathname, location.search]);

  // Filter workspace tabs by feature access — admin sees all, others only see
  const visibleWorkspaces = WORKSPACE_CONFIG.filter((ws: WorkspaceConfig) => {
    if (isAdmin) return true;
    if (!ws.featureKey) return true;
    return hasFeature(ws.featureKey);
  });

  const showLabel = !collapsed || isMobile;

  return (
    <>
      {isMobile && !mobileOpen && (
        <MobileMenuBtn
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin menu"
        >
          <Menu size={22} />
        </MobileMenuBtn>
      )}

      <Overlay $visible={mobileOpen && isMobile} onClick={() => setMobileOpen(false)} />

      <SidebarWrap
        ref={sidebarRef}
        $collapsed={collapsed && !isMobile}
        $mobileOpen={mobileOpen}
        role="navigation"
        aria-label="Admin navigation"
      >
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

        {/* Global Client Selector — only when sidebar is expanded */}
        {(!collapsed || isMobile) && (
          <GlobalClientSelector closeKey={`${location.pathname}:${mobileOpen}`} />
        )}

        {/* Navigation items — grouped by section with Kirin dividers */}
        <NavScroll>
          {(() => {
            let globalIndex = 0;
            return WORKSPACE_SECTIONS.map((section) => {
              const sectionItems = visibleWorkspaces.filter((ws) => ws.section === section.id);
              if (sectionItems.length === 0) return null;
              return (
                <React.Fragment key={section.id}>
                  {(!collapsed || isMobile) && (
                    <SectionHeader aria-hidden="true">{section.label}</SectionHeader>
                  )}
                  {collapsed && !isMobile && <SectionRule aria-hidden="true" />}
                  {sectionItems.map((ws) => {
                    const i = globalIndex++;
                    return (
                      <StyledBox as={NavItem}
                        key={ws.id}
                        $active={isActive(ws.prefix)}
                        $collapsed={collapsed && !isMobile}
                        onClick={() => handleNav(ws.prefix)}
                        role="menuitem"
                        aria-label={ws.label}
                        aria-current={isActive(ws.prefix) ? 'page' : undefined}
                        $style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <NavIcon>{getIcon(ws.icon)}</NavIcon>
                        <NavLabel $visible={showLabel}>{ws.label}</NavLabel>
                        {collapsed && !isMobile && (
                          <NavTooltip>{ws.label}</NavTooltip>
                        )}
                      </StyledBox>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}

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
