/**
 * ============================================================================
 * FILE: ProfileChartsGrid.tsx
 * PURPOSE: Renders user-selected Victory charts on profile pages with
 *          lazy loading, SafeChart error boundaries, and responsive grid.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps the ProfileChartsSection from the Social module
 * into a self-contained grid that fetches chartVisibility from the profile API
 * and renders the appropriate Victory charts with SafeChart error boundaries.
 *
 * HOW IT FITS IN THE APP: UserProfilePage / UserDashboard -> ProfileChartsGrid -> ProfileChartsSection
 * KEY DECISIONS: Delegates actual chart rendering to ProfileChartsSection (single source of truth).
 *   This component adds the fetching layer and settings affordance for own profiles.
 *
 * ┌─── SUB-COMPONENT: ProfileChartsGrid ───────────────────────┐
 * │ PARENT: UserProfilePage, UserDashboard                      │
 * │ PURPOSE: Fetch chartVisibility + render Victory chart grid  │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────┐                 │
 * │ │ Progress & Analytics        [Settings]  │                 │
 * │ │ ┌──────────────┐ ┌──────────────┐       │                 │
 * │ │ │ Workout Freq │ │ Muscle Radar │       │                 │
 * │ │ └──────────────┘ └──────────────┘       │                 │
 * │ │ ┌──────────────┐ ┌──────────────┐       │                 │
 * │ │ │ Wt Progress  │ │ Goal Bullet  │       │                 │
 * │ │ └──────────────┘ └──────────────┘       │                 │
 * │ └──────────────────────────────────────────┘                 │
 * │ Props: { userId, chartVisibility?, isOwnProfile? }           │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Settings icon] -> Opens ChartTogglePanel modal              │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Settings } from 'lucide-react';
import ProfileChartsSection from '../../../pages/Social/components/ProfileChartsSection';
import type { ChartVisibility } from '../../../pages/Social/components/ChartVisibilityToggle';
import ChartTogglePanel from './ChartTogglePanel';
import api from '../../../services/api';
import { logger } from '@/utils/logger';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface ProfileChartsGridProps {
  userId: number | string;
  /** Pre-fetched chartVisibility from profile API */
  chartVisibility?: Partial<ChartVisibility>;
  /** Show settings gear when user is viewing their own profile */
  isOwnProfile?: boolean;
}

// Default visible charts for new users (per CLAUDE.md spec)
const DEFAULT_VISIBLE: Partial<ChartVisibility> = {
  workoutFrequency: true,
  muscleRadar: true,
  weightProgression: true,
  goalProgress: true,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Orchestrates chart visibility state + settings modal
// ─────────────────────────────────────────────────────────────
const ProfileChartsGrid: React.FC<ProfileChartsGridProps> = ({
  userId,
  chartVisibility: initialVisibility,
  isOwnProfile = false,
}) => {
  const [visibility, setVisibility] = useState<Partial<ChartVisibility>>(
    () => initialVisibility || DEFAULT_VISIBLE
  );
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  // Merge defaults with user prefs — if user has never set visibility,
  // use defaults so new profiles aren't empty
  const effectiveVisibility = useMemo(() => {
    const hasAnySet = Object.values(visibility).some(v => v === true);
    return hasAnySet ? visibility : DEFAULT_VISIBLE;
  }, [visibility]);

  const handleSaveVisibility = useCallback(async (newVisibility: ChartVisibility) => {
    setSaving(true);
    try {
      await api.put('/api/profile', { chartVisibility: newVisibility });
      setVisibility(newVisibility);
      setShowSettings(false);
    } catch (err) {
      // Silent fail — user can retry. Console warn for debugging.
      logger.warn('Failed to save chart visibility:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <Wrapper>
      {isOwnProfile && (
        <SettingsRow>
          <SettingsButton
            onClick={() => setShowSettings(true)}
            aria-label="Chart visibility settings"
          >
            <Settings size={16} />
            <span>Chart Settings</span>
          </SettingsButton>
        </SettingsRow>
      )}

      <ProfileChartsSection
        userId={userId}
        chartVisibility={effectiveVisibility}
        isOwnProfile={isOwnProfile}
      />

      {showSettings && (
        <ChartTogglePanel
          chartVisibility={visibility}
          onSave={handleSaveVisibility}
          onClose={() => setShowSettings(false)}
          saving={saving}
        />
      )}
    </Wrapper>
  );
};

export default React.memo(ProfileChartsGrid);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Wrapper = styled.div`
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
`;

const SettingsRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
`;

const SettingsButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: #E0ECF4;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.15);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
