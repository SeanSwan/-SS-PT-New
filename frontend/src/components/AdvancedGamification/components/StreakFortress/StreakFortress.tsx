/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: StreakFortress                                    ║
 * ║  PURPOSE: Visual fortress that grows with streak count and    ║
 * ║           degrades on missed days — loss aversion driver      ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  STREAK FORTRESS                          🔥 14-day streak │
 * │                                                            │
 * │      ┌─┐     ┌─┐                                          │
 * │    ┌─┤ ├─────┤ ├─┐    ← Towers grow with streak           │
 * │    │ │ │█████│ │ │                                         │
 * │    │ └─┘     └─┘ │                                         │
 * │    │  ┌───────┐  │    ← Main keep (always present)        │
 * │    │  │  🏰   │  │                                         │
 * │    └──┴───────┴──┘                                         │
 * │    ████████████████    ← Wall (height = streak days)      │
 * │                                                            │
 * │  🛡 Streak Freeze: 2/3 available                           │
 * │  Next milestone: 21 days (+75 XP)                          │
 * └────────────────────────────────────────────────────────────┘
 *
 * GAMIFICATION HOOKS:
 * - Streak 0-2: Ruins (crumbled walls, dim)
 * - Streak 3-6: Small fort (basic walls)
 * - Streak 7-13: Castle (towers + keep)
 * - Streak 14-29: Fortress (tall towers + banners)
 * - Streak 30-89: Citadel (full towers + inner glow)
 * - Streak 90+: Crystalline Citadel (animated, full particle effects)
 */

import React, { useMemo } from 'react';
import { Shield, Flame, Snowflake, Castle, Crown } from 'lucide-react';
import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface StreakFortressProps {
  streakDays: number;
  streakFreezes: number;
  maxFreezes: number;
  nextMilestone?: { days: number; xp: number };
  compact?: boolean;
  className?: string;
}

type FortressLevel = 'ruins' | 'small_fort' | 'castle' | 'fortress' | 'citadel' | 'crystalline';

// ─────────────────────────────────────────────────────────────
// SECTION: Fortress Level Config
// ─────────────────────────────────────────────────────────────

interface FortressConfig {
  level: FortressLevel;
  label: string;
  wallHeight: number;
  towerHeight: number;
  towers: number;
  color: string;
  glowColor: string;
  hasGlow: boolean;
  hasBanners: boolean;
  hasParticles: boolean;
}

function getFortressConfig(streak: number): FortressConfig {
  if (streak >= 90) return { level: 'crystalline', label: 'Crystalline Citadel', wallHeight: 100, towerHeight: 80, towers: 4, color: '#60C0F0', glowColor: 'rgba(96,192,240,0.4)', hasGlow: true, hasBanners: true, hasParticles: true };
  if (streak >= 30) return { level: 'citadel', label: 'Citadel', wallHeight: 85, towerHeight: 65, towers: 4, color: '#8B5CF6', glowColor: 'rgba(139,92,246,0.3)', hasGlow: true, hasBanners: true, hasParticles: false };
  if (streak >= 14) return { level: 'fortress', label: 'Fortress', wallHeight: 70, towerHeight: 50, towers: 3, color: '#C6A84B', glowColor: 'rgba(198,168,75,0.25)', hasGlow: true, hasBanners: true, hasParticles: false };
  if (streak >= 7) return { level: 'castle', label: 'Castle', wallHeight: 55, towerHeight: 35, towers: 2, color: '#50A0F0', glowColor: 'rgba(80,160,240,0.2)', hasGlow: false, hasBanners: false, hasParticles: false };
  if (streak >= 3) return { level: 'small_fort', label: 'Fort', wallHeight: 35, towerHeight: 20, towers: 1, color: '#4070C0', glowColor: 'rgba(64,112,192,0.15)', hasGlow: false, hasBanners: false, hasParticles: false };
  return { level: 'ruins', label: 'Ruins', wallHeight: 15, towerHeight: 0, towers: 0, color: '#64748b', glowColor: 'transparent', hasGlow: false, hasBanners: false, hasParticles: false };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframes
// ─────────────────────────────────────────────────────────────

const fortressGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 8px var(--glow)); }
  50% { filter: drop-shadow(0 0 16px var(--glow)); }
`;

const bannerWave = keyframes`
  0%, 100% { transform: skewX(0deg); }
  50% { transform: skewX(-5deg); }
`;

const fireFlicker = keyframes`
  0%, 100% { opacity: 0.8; transform: scaleY(1); }
  50% { opacity: 1; transform: scaleY(1.15); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Container = styled.div<{ $compact?: boolean }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 16px;
  padding: ${({ $compact }) => $compact ? '12px 16px' : '20px 24px'};
  position: relative;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
  display: flex; align-items: center; gap: 8px;
  svg { color: var(--accent-primary, #60C0F0); }
`;

const StreakBadge = styled.div<{ $color: string }>`
  display: flex; align-items: center; gap: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 16px; font-weight: 700;
  color: ${({ $color }) => $color};
  svg { animation: ${fireFlicker} 1.5s ease-in-out infinite; }
`;

const FortressSvg = styled.svg<{ $glowColor: string; $hasGlow: boolean }>`
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  display: block;
  --glow: ${({ $glowColor }) => $glowColor};
  ${({ $hasGlow }) => $hasGlow && css`animation: ${fortressGlow} 3s ease-in-out infinite;`}
`;

const InfoRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 16px; gap: 12px;
`;

const FreezeInfo = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-family: 'Sora', sans-serif; font-size: 12px;
  color: var(--text-secondary, #94a3b8);
  svg { color: var(--accent-primary, #60C0F0); width: 14px; }
`;

const MilestoneInfo = styled.div`
  font-family: 'Sora', sans-serif; font-size: 12px;
  color: var(--text-muted, #64748b);
  span { color: var(--accent-gold, #C6A84B); font-weight: 600; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: SVG Fortress Builder
// ─────────────────────────────────────────────────────────────

const FortressGraphic: React.FC<{ config: FortressConfig; streak: number }> = React.memo(({ config, streak }) => {
  const baseY = 130;
  const wallH = config.wallHeight * 0.8;
  const towerH = config.towerHeight * 0.8;

  return (
    <FortressSvg viewBox="0 0 200 150" $glowColor={config.glowColor} $hasGlow={config.hasGlow}>
      {/* Ground */}
      <rect x="20" y={baseY} width="160" height="4" rx="2" fill={config.color} fillOpacity="0.2" />

      {/* Main wall */}
      <rect
        x="50" y={baseY - wallH} width="100" height={wallH}
        rx="3" fill={config.color} fillOpacity="0.25"
        stroke={config.color} strokeWidth="1" strokeOpacity="0.4"
      />

      {/* Wall crenelations */}
      {config.level !== 'ruins' && Array.from({ length: 5 }, (_, i) => (
        <rect key={`cren-${i}`}
          x={55 + i * 20} y={baseY - wallH - 6} width="8" height="6"
          fill={config.color} fillOpacity="0.35"
        />
      ))}

      {/* Keep (center building) */}
      {config.level !== 'ruins' && (
        <rect
          x="75" y={baseY - wallH - 25} width="50" height="25"
          rx="2" fill={config.color} fillOpacity="0.35"
          stroke={config.color} strokeWidth="1" strokeOpacity="0.5"
        />
      )}

      {/* Keep door */}
      {config.level !== 'ruins' && (
        <rect x="92" y={baseY - 18} width="16" height="18" rx="8" fill={config.color} fillOpacity="0.15" />
      )}

      {/* Towers */}
      {config.towers >= 1 && (
        <rect x="40" y={baseY - wallH - towerH} width="18" height={wallH + towerH}
          rx="2" fill={config.color} fillOpacity="0.3"
          stroke={config.color} strokeWidth="1" strokeOpacity="0.5" />
      )}
      {config.towers >= 2 && (
        <rect x="142" y={baseY - wallH - towerH} width="18" height={wallH + towerH}
          rx="2" fill={config.color} fillOpacity="0.3"
          stroke={config.color} strokeWidth="1" strokeOpacity="0.5" />
      )}
      {config.towers >= 3 && (
        <rect x="88" y={baseY - wallH - towerH - 15} width="24" height={wallH + towerH + 15}
          rx="2" fill={config.color} fillOpacity="0.35"
          stroke={config.color} strokeWidth="1" strokeOpacity="0.5" />
      )}
      {config.towers >= 4 && (<>
        <rect x="30" y={baseY - wallH - towerH - 10} width="14" height={10}
          rx="2" fill={config.color} fillOpacity="0.2" />
        <rect x="156" y={baseY - wallH - towerH - 10} width="14" height={10}
          rx="2" fill={config.color} fillOpacity="0.2" />
      </>)}

      {/* Banners on towers */}
      {config.hasBanners && config.towers >= 2 && (<>
        <rect x="45" y={baseY - wallH - towerH - 12} width="8" height="12"
          fill={config.color} fillOpacity="0.5" />
        <rect x="147" y={baseY - wallH - towerH - 12} width="8" height="12"
          fill={config.color} fillOpacity="0.5" />
      </>)}

      {/* Fortress level label */}
      <text
        x="100" y="145" textAnchor="middle"
        fontFamily="Sora, sans-serif" fontSize="9" fontWeight="600"
        fill={config.color} fillOpacity="0.6"
        letterSpacing="1.5"
      >
        {config.label.toUpperCase()}
      </text>
    </FortressSvg>
  );
});

FortressGraphic.displayName = 'FortressGraphic';

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

const StreakFortress: React.FC<StreakFortressProps> = ({
  streakDays,
  streakFreezes,
  maxFreezes = 3,
  nextMilestone,
  compact = false,
  className,
}) => {
  const config = useMemo(() => getFortressConfig(streakDays), [streakDays]);

  const milestoneDefaults = useMemo(() => {
    if (nextMilestone) return nextMilestone;
    // Calculate next streak milestone
    const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
    const next = milestones.find(m => m > streakDays);
    if (!next) return null;
    const xpMap: Record<number, number> = { 3: 25, 7: 75, 14: 150, 30: 300, 60: 600, 90: 1000, 180: 2500, 365: 5000 };
    return { days: next, xp: xpMap[next] || 100 };
  }, [streakDays, nextMilestone]);

  return (
    <Container $compact={compact} className={className}>
      <Header>
        <Title>
          <Castle size={16} />
          STREAK FORTRESS
        </Title>
        <StreakBadge $color={config.color}>
          <Flame size={18} />
          {streakDays}-day streak
        </StreakBadge>
      </Header>

      {!compact && <FortressGraphic config={config} streak={streakDays} />}

      <InfoRow>
        <FreezeInfo>
          <Snowflake />
          Streak Freeze: {streakFreezes}/{maxFreezes}
        </FreezeInfo>

        {milestoneDefaults && (
          <MilestoneInfo>
            Next: <span>{milestoneDefaults.days} days</span> (+{milestoneDefaults.xp} XP)
          </MilestoneInfo>
        )}
      </InfoRow>
    </Container>
  );
};

StreakFortress.displayName = 'StreakFortress';

export default StreakFortress;
