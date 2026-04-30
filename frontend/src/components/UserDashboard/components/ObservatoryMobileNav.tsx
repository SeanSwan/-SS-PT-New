/*
 * ============================================================================
 * COMPONENT: ObservatoryMobileNav
 * PURPOSE: Phase 19B Observatory shell - mobile-only bottom navigation bar.
 *          Hidden at >= 1024px. Four items: Home, Reels (route CTA), Create
 *          (focuses feed tab to expose CreatePostCard), and Profile.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Spec adherence (Phase 19 receipt Section 19B):
 *   - Inbox tab is OMITTED (no canonical inbox route proven)
 *   - Reels is a route CTA to /social/reels (not a fake panel)
 *   - All items meet the 44px minimum touch target
 * ============================================================================
 */

import React from 'react';
import { Home, Film, Plus, UserCircle2 } from 'lucide-react';
import {
  MobileBottomNav,
  MobileBottomNavItem,
} from '../styles/ObservatoryMobileNavStyles';
import type { TabId } from '../types/UserDashboardTypes';

interface ObservatoryMobileNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onNavigate: (path: string) => void;
}

const ObservatoryMobileNav: React.FC<ObservatoryMobileNavProps> = ({
  activeTab,
  onTabChange,
  onNavigate,
}) => {
  return (
    <MobileBottomNav role="navigation" aria-label="Mobile dashboard navigation">
      <MobileBottomNavItem
        type="button"
        $active={activeTab === 'home'}
        onClick={() => onTabChange('home')}
        aria-current={activeTab === 'home' ? 'page' : undefined}
      >
        <Home size={20} aria-hidden="true" />
        Home
      </MobileBottomNavItem>
      <MobileBottomNavItem
        type="button"
        onClick={() => onNavigate('/social/reels')}
        aria-label="Browse reels"
      >
        <Film size={20} aria-hidden="true" />
        Reels
      </MobileBottomNavItem>
      <MobileBottomNavItem
        type="button"
        $primary
        onClick={() => onTabChange('feed')}
        aria-label="Create a new post"
      >
        <span><Plus size={22} aria-hidden="true" /></span>
        Create
      </MobileBottomNavItem>
      <MobileBottomNavItem
        type="button"
        $active={activeTab === 'profile'}
        onClick={() => onTabChange('profile')}
        aria-current={activeTab === 'profile' ? 'page' : undefined}
      >
        <UserCircle2 size={20} aria-hidden="true" />
        Profile
      </MobileBottomNavItem>
    </MobileBottomNav>
  );
};

export default ObservatoryMobileNav;
