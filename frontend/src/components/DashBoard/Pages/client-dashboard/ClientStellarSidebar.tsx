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
import {
  Home, Dumbbell, TrendingUp, UtensilsCrossed, Shield, ClipboardCheck,
  Calendar, Users, MessageSquare, User, Award, HeartPulse,
  ChevronRight, ChevronLeft, Menu, X, Star, Brain, Trophy,
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
} from './ClientStellarSidebar.styles';
import { isNonDeductingClientSource } from '../../workspaces/clients-team/clientSessionSignal';
import { resolveBrandIdentity } from '../../../../services/pdf/brandIdentity';
import { CANONICAL_SURFACES } from '../../../../config/canonical-surface-names';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

export const clientNavConfig = [
  {
    section: 'HOME',
    items: [
      { label: 'Home', path: '/dashboard/client/overview', icon: Home },
      { label: 'My Progress', path: '/dashboard/client/progress', icon: TrendingUp },
      { label: CANONICAL_SURFACES.logWorkout.name, path: `${CANONICAL_SURFACES.logWorkout.routes.client}?loadPlan=today`, icon: ClipboardCheck },
    ],
  },
  {
    section: 'TRAIN',
    items: [
      { label: 'My Workouts', path: '/dashboard/client/workouts', icon: Dumbbell },
      { label: 'My Equipment', path: '/dashboard/client/my-equipment', icon: Dumbbell },
      { label: 'Book Session', path: '/dashboard/client/schedule', icon: Calendar },
      { label: 'Swan Coach', path: '/dashboard/client/coach-assistant', icon: Brain },
    ],
  },
  {
    section: 'RECOVER',
    items: [
      { label: 'Pain & Injury Chart', path: '/dashboard/client/body-map', icon: HeartPulse },
      { label: 'Nutrition', path: '/dashboard/client/meal-planner', icon: UtensilsCrossed },
    ],
  },
  {
    section: 'COMMUNITY',
    items: [
      { label: 'Community & Challenges', path: '/dashboard/client/community', icon: Users },
      { label: 'Challenge Campaigns', path: '/dashboard/client/challenges', icon: Trophy },
      { label: 'Messages', path: '/dashboard/client/messages', icon: MessageSquare },
    ],
  },
  {
    section: 'ACCOUNT',
    items: [
      { label: 'My Profile & Settings', path: '/dashboard/client/profile', icon: User },
      { label: 'My Rewards', path: '/dashboard/client/rewards', icon: Award },
      { label: 'Privacy & Consent', path: '/dashboard/client/ai-consent', icon: Shield },
      { label: 'My Home', path: '/dashboard/client/my-home', icon: Star },
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
  clientSource?: string | null;
}

const ClientStellarSidebar: React.FC<ClientStellarSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onToggleMobile,
  clientSource,
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
    const routePath = prefix.split(/[?#]/)[0];
    return location.pathname === routePath || location.pathname.startsWith(routePath + '/');
  }, [location.pathname]);

  const collapsed = isMobile ? false : isCollapsed;
  const showLabel = !collapsed;
  const canBookSwanStudiosSessions = !isNonDeductingClientSource(clientSource);

  // White-label the nav chrome by client source so a Move Fitness member never
  // sees SwanStudios branding on their own dashboard (rule 8 / white-label
  // business risk). Fail-safe: unknown/external sources resolve to SwanStudios.
  const brand = resolveBrandIdentity(clientSource);
  const isMoveFitness = brand.brandKey === 'move_fitness';
  const logoMark = isMoveFitness ? 'MF' : 'SS';
  const footerWordmark = isMoveFitness ? brand.wordmark : 'SwanStudios v2.1';

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
            <LogoMark>{logoMark}</LogoMark>
            <LogoLabel $visible={showLabel}>Client</LogoLabel>
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
              {group.items.filter((item) => {
                return canBookSwanStudiosSessions || item.path !== '/dashboard/client/schedule';
              }).map((item, i) => {
                const Icon = item.icon;
                return (
                  <StyledBox as={NavItem}
                    key={item.path}
                    $active={isActive(item.path)}
                    $collapsed={collapsed}
                    onClick={() => handleNav(item.path)}
                    role="menuitem"
                    aria-label={item.label}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    $style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <NavIcon><Icon size={20} /></NavIcon>
                    <NavLabel $visible={showLabel}>{item.label}</NavLabel>
                    {collapsed && <NavTooltip>{item.label}</NavTooltip>}
                  </StyledBox>
                );
              })}
            </React.Fragment>
          ))}
        </NavScroll>

        <SidebarFooter $collapsed={collapsed}>
          {showLabel && <FooterVersion>{footerWordmark}</FooterVersion>}
        </SidebarFooter>
      </SidebarWrap>
    </>
  );
};

export default ClientStellarSidebar;
