/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AegisHud                                         ║
 * ║  PURPOSE: RPG needs panel — 5 stacked bars showing user      ║
 * ║           vitals (Athletic, Recovery, Social, Discipline,    ║
 * ║           Vitality) with time-based decay and moodlet badge  ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  🛡 AEGIS HUD              ⚡ Energized         78.4%      │
 * │                                                            │
 * │  [💪] Athletic Power                        72/100         │
 * │       ████████████████████░░░░░░░░                         │
 * │  [❤] Recovery                               85/100         │
 * │       ██████████████████████████░░░                         │
 * │  [👥] Social Energy                         45/100         │
 * │       █████████████░░░░░░░░░░░░░░                          │
 * │  [🧠] Mental Discipline                     90/100         │
 * │       ████████████████████████████░                         │
 * │  [⚡] Vitality                              60/100         │
 * │       ████████████████████░░░░░░░░░                        │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { userId, compact?, showMoodlet?, className? }
 * State:     { data, loading, error } via useAegisHud hook
 * API Calls: GET /api/gamification/users/:userId/aegis-hud
 * Events:    refresh (auto 60s), replenish (after actions)
 * Children:  NeedBarComponent, MoodletBadge
 *
 * GAMIFICATION HOOKS:
 * - Needs auto-decay over time (calculated on API read)
 * - Actions replenish needs (workout → athletic, social post → social)
 * - Moodlet badge changes based on overall needs state
 */

import React from 'react';
import { Shield } from 'lucide-react';
import type { AegisHudProps } from './AegisHudTypes';
import { useAegisHud } from './useAegisHud';
import NeedBarComponent from './NeedBarComponent';
import MoodletBadge from './MoodletBadge';
import {
  HudContainer,
  HudHeader,
  HudTitle,
  OverallHealth,
  NeedBarRow,
  NeedInfo,
  NeedLabelRow,
  SkeletonBar,
  SkeletonLabel,
  MoodletContainer,
} from './AegisHudStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Loading Skeleton
// ─────────────────────────────────────────────────────────────

const AegisHudSkeleton: React.FC = () => (
  <HudContainer role="status" aria-live="polite" aria-label="Loading Aegis HUD">
    <HudHeader>
      <HudTitle>
        <Shield size={16} />
        AEGIS HUD
      </HudTitle>
    </HudHeader>
    {[1, 2, 3, 4, 5].map((i) => (
      <NeedBarRow key={i}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-base, #0A0A0F)' }} />
        <NeedInfo>
          <NeedLabelRow><SkeletonLabel /><SkeletonLabel style={{ width: 40 }} /></NeedLabelRow>
          <SkeletonBar />
        </NeedInfo>
      </NeedBarRow>
    ))}
  </HudContainer>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Error State
// ─────────────────────────────────────────────────────────────

const AegisHudError: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <HudContainer
    style={{ borderColor: 'rgba(201, 42, 84, 0.3)' }}
  >
    <HudHeader>
      <HudTitle>
        <Shield size={16} />
        AEGIS HUD
      </HudTitle>
    </HudHeader>
    <div style={{
      textAlign: 'center',
      padding: '16px 0',
      color: 'var(--text-secondary, #94a3b8)',
      fontFamily: 'Sora, sans-serif',
      fontSize: 13,
    }}>
      <p style={{ margin: '0 0 8px', color: '#E0ECF4' }}>Unable to load needs data</p>
      <p style={{ margin: '0 0 12px', fontSize: 11 }}>{error}</p>
      <button
        onClick={onRetry}
        style={{
          background: 'var(--accent-primary, #60C0F0)',
          color: '#0A0A0F',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontFamily: 'Sora, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        Retry
      </button>
    </div>
  </HudContainer>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

const AegisHud: React.FC<AegisHudProps> = ({
  userId,
  compact = false,
  showMoodlet = true,
  className,
}) => {
  const { data, loading, error, refresh } = useAegisHud(userId);

  if (loading) return <AegisHudSkeleton />;
  if (error) return <AegisHudError error={error} onRetry={refresh} />;
  if (!data) return null;

  return (
    <HudContainer $compact={compact} className={className}>
      <HudHeader>
        <HudTitle>
          <Shield size={16} />
          AEGIS HUD
        </HudTitle>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showMoodlet && data.moodlet && (
            <MoodletContainer>
              <MoodletBadge moodlet={data.moodlet} size={compact ? 'sm' : 'md'} />
            </MoodletContainer>
          )}
          <OverallHealth $value={data.overallHealth}>
            {data.overallHealth.toFixed(1)}%
          </OverallHealth>
        </div>
      </HudHeader>

      {data.needs.map((need) => (
        <NeedBarComponent key={need.key} need={need} animate />
      ))}
    </HudContainer>
  );
};

AegisHud.displayName = 'AegisHud';

export default AegisHud;
