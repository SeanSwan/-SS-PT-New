/*
 * ============================================================================
 * TYPES: ObservatoryShellTypes
 * PURPOSE: Shared prop/data types for the Phase 19B Observatory shell and
 *          its three sub-components (left rail, right rail, mobile nav).
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ============================================================================
 */

import type { LucideIcon } from 'lucide-react';
import type { TabId } from '../types/UserDashboardTypes';

export interface ObservatoryNavItem {
  id: TabId;
  label: string;
  Icon: LucideIcon;
}

export interface ObservatoryNextBestAction {
  label: string;
  Icon: LucideIcon;
  run: () => void;
}

export interface ObservatoryBadge {
  id: string | number;
  name: string;
  icon: string;
  rarity?: string;
}
