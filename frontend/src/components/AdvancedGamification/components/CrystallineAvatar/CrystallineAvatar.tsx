/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CrystallineAvatar                                ║
 * ║  PURPOSE: Geometric crystal avatar that evolves with tier,   ║
 * ║           level, and job class — SVG-based, GPU-animated     ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────┐
 * │       ◇  (rotating glow)  │  ← Crystal shape evolves per tier:
 * │      ╱ ╲                  │     First Flight: simple diamond (4 facets)
 * │     ╱   ╲                 │     Riverwing: hexagon (6 facets)
 * │    ╱  ●  ╲                │     Iron Grove: octagon (8 facets)
 * │    ╲     ╱                │     Frostwing Aegis: decagon (10 facets)
 * │     ╲   ╱  [⚔]           │     Crystalline Swan: 12-facet + orbital
 * │      ╲ ╱                  │
 * │     FIRST FLIGHT           │  ← Job class icon overlay (bottom-right)
 * └────────────────────────────┘
 *
 * GAMIFICATION HOOKS:
 * - Tier determines crystal complexity (facets, glow, particles)
 * - Job class adds icon overlay (Paladin shield, Monk fist, etc.)
 * - Legendary+ tiers get orbital ring and animated gradient glow
 */

import React, { useMemo } from 'react';
import type { CrystallineAvatarProps, TierVisuals, JobClassVisuals } from './CrystallineAvatarTypes';
import {
  AvatarContainer,
  CrystalSvg,
  CrystalBody,
  CrystalFacet,
  InnerGlowCircle,
  JobClassOverlay,
  TierLabel,
  OrbitalRing,
} from './CrystallineAvatarStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Visual Configuration
// ─────────────────────────────────────────────────────────────

const TIER_VISUALS: Record<string, TierVisuals> = {
  bronze_forge: {
    name: 'First Flight',
    primaryColor: '#CD7F32',
    secondaryColor: '#A0622D',
    glowColor: 'rgba(205, 127, 50, 0.4)',
    facets: 4,
    opacity: 0.7,
    rotationSpeed: 0,
    particleCount: 0,
  },
  silver_edge: {
    name: 'Riverwing',
    primaryColor: '#C0C0C0',
    secondaryColor: '#A8A8A8',
    glowColor: 'rgba(192, 192, 192, 0.4)',
    facets: 6,
    opacity: 0.75,
    rotationSpeed: 0,
    particleCount: 0,
  },
  titanium_core: {
    name: 'Iron Grove',
    primaryColor: '#878681',
    secondaryColor: '#60C0F0',
    glowColor: 'rgba(96, 192, 240, 0.3)',
    facets: 8,
    opacity: 0.8,
    rotationSpeed: 20,
    particleCount: 4,
  },
  obsidian_warrior: {
    name: 'Frostwing Aegis',
    primaryColor: '#1A1A24',
    secondaryColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    facets: 10,
    opacity: 0.85,
    rotationSpeed: 15,
    particleCount: 8,
  },
  crystalline_swan: {
    name: 'Grand Crystalline Swan',
    primaryColor: '#002060',
    secondaryColor: '#60C0F0',
    glowColor: 'rgba(96, 192, 240, 0.5)',
    facets: 12,
    opacity: 0.9,
    rotationSpeed: 12,
    particleCount: 12,
  },
};

const JOB_CLASS_VISUALS: Record<string, JobClassVisuals> = {
  paladin: { name: 'Paladin', icon: '🛡', accentColor: '#60C0F0', symbol: 'shield' },
  monk: { name: 'Monk', icon: '👊', accentColor: '#C6A84B', symbol: 'fist' },
  ranger: { name: 'Ranger', icon: '🏹', accentColor: '#4CAF50', symbol: 'bow' },
  white_mage: { name: 'White Mage', icon: '✨', accentColor: '#E0ECF4', symbol: 'star' },
  dark_knight: { name: 'Dark Knight', icon: '⚔', accentColor: '#8B5CF6', symbol: 'sword' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Crystal Shape Generator
// PURPOSE: Generates SVG polygon points for N-sided crystal
// ─────────────────────────────────────────────────────────────

function generateCrystalPoints(facets: number, cx: number, cy: number, radius: number): string {
  const points: string[] = [];
  const angleStep = (Math.PI * 2) / facets;

  // Top point (elongated)
  points.push(`${cx},${cy - radius * 1.3}`);

  // Right facets
  for (let i = 1; i < facets / 2; i++) {
    const angle = -Math.PI / 2 + angleStep * i;
    const r = radius * (0.8 + Math.sin(i * 0.7) * 0.2);
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }

  // Bottom point (elongated)
  points.push(`${cx},${cy + radius * 1.1}`);

  // Left facets (mirror)
  for (let i = facets / 2 + 1; i < facets; i++) {
    const angle = -Math.PI / 2 + angleStep * i;
    const r = radius * (0.8 + Math.sin(i * 0.7) * 0.2);
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }

  return points.join(' ');
}

function generateFacetLines(facets: number, cx: number, cy: number, radius: number): Array<{ points: string; delay: number }> {
  const lines: Array<{ points: string; delay: number }> = [];
  const angleStep = (Math.PI * 2) / facets;

  for (let i = 0; i < facets; i++) {
    const angle = -Math.PI / 2 + angleStep * i;
    const outerX = cx + Math.cos(angle) * radius * 0.85;
    const outerY = cy + Math.sin(angle) * radius * 0.85;

    // Line from center to edge
    lines.push({
      points: `${cx},${cy} ${outerX},${outerY}`,
      delay: i * 0.2,
    });
  }

  return lines;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

const CrystallineAvatar: React.FC<CrystallineAvatarProps> = ({
  tier,
  level,
  jobClass = null,
  size = 64,
  animated = true,
  showTierLabel = false,
  className,
}) => {
  const tierVisuals = TIER_VISUALS[tier] || TIER_VISUALS.bronze_forge;
  const jobVisuals = jobClass ? JOB_CLASS_VISUALS[jobClass] : null;
  const isHighTier = tier === 'obsidian_warrior' || tier === 'crystalline_swan';
  const isLegendary = tier === 'crystalline_swan';

  const cx = 50;
  const cy = 50;
  const radius = 35;

  const crystalPoints = useMemo(
    () => generateCrystalPoints(tierVisuals.facets, cx, cy, radius),
    [tierVisuals.facets]
  );

  const facetLines = useMemo(
    () => generateFacetLines(tierVisuals.facets, cx, cy, radius),
    [tierVisuals.facets]
  );

  return (
    <AvatarContainer $size={size} $animated={animated} className={className}>
      {/* Orbital ring for high tiers */}
      {isHighTier && tierVisuals.rotationSpeed > 0 && (
        <OrbitalRing $color={tierVisuals.secondaryColor} $speed={tierVisuals.rotationSpeed} />
      )}

      <CrystalSvg
        viewBox="0 0 100 100"
        $glowColor={tierVisuals.glowColor}
        $isLegendary={isLegendary}
      >
        <defs>
          <radialGradient id={`crystal-grad-${tier}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={tierVisuals.secondaryColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={tierVisuals.primaryColor} stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Inner glow */}
        <InnerGlowCircle cx={cx} cy={cy} r={radius * 0.4} $color={tierVisuals.secondaryColor} />

        {/* Main crystal body */}
        <CrystalBody
          points={crystalPoints}
          $primary={tierVisuals.primaryColor}
          $secondary={tierVisuals.secondaryColor}
          $opacity={tierVisuals.opacity}
        />

        {/* Facet lines (internal crystal structure) */}
        {facetLines.map((facet, i) => (
          <CrystalFacet
            key={i}
            points={facet.points}
            $color={tierVisuals.secondaryColor}
            $delay={facet.delay}
          />
        ))}

        {/* Center gradient overlay */}
        <circle cx={cx} cy={cy} r={radius * 0.6} fill={`url(#crystal-grad-${tier})`} />

        {/* Level number in center */}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontFamily="Fira Code, monospace"
          fontSize={level >= 100 ? 12 : 14}
          fontWeight="700"
          fill={tierVisuals.secondaryColor}
          fillOpacity="0.9"
        >
          {level}
        </text>
      </CrystalSvg>

      {/* Job class icon overlay */}
      {jobVisuals && (
        <JobClassOverlay $color={jobVisuals.accentColor}>
          {jobVisuals.icon}
        </JobClassOverlay>
      )}

      {/* Tier label */}
      {showTierLabel && (
        <TierLabel $color={tierVisuals.secondaryColor}>
          {tierVisuals.name}
        </TierLabel>
      )}
    </AvatarContainer>
  );
};

CrystallineAvatar.displayName = 'CrystallineAvatar';

export default CrystallineAvatar;
