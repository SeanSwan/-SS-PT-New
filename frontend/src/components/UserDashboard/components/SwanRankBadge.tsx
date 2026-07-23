/**
 * ============================================================================
 * FILE: SwanRankBadge.tsx
 * PURPOSE: The Swan rank BADGE — a crystalline faceted frame that WRAPS the
 *          CrystalProgressRing (the ring stays the animated centerpiece). One
 *          generic renderer driven by ranks.config.ts (Kimi mandate: config +
 *          one renderer, not 100 components). Frame material Molt-refines
 *          gunmetal→silver→crystalline→gold by rank; sub-tier pips fill every
 *          10 levels; a crown motif unlocks at the top ranks; a companion may
 *          perch on the rim.
 * AUTHOR:  Claude Opus 4.8 | CREATED: 2026-07-22 | Kimi K3 design pass
 * ============================================================================
 *
 * KIMI BINDING LAW:
 *  - NEVER grey — the lowest rank is gunmetal + a living accent, always premium.
 *  - Frame is decorative (aria-hidden); the accessible progressbar + level live
 *    in the ring/parent. If the badge becomes a button (tap → menagerie), it is
 *    a SIBLING to the progressbar, never an ancestor (no nested-interactive).
 *  - Mobile culling: companion hidden < 768px; frame simplifies at small sizes.
 *  - Data-driven, SVG-only, GPU-safe.
 */

import React from 'react';
import { badgeStateFor } from './ranks.config';
import CrystalProgressRing, { type RingQuality } from './CrystalProgressRing';
import CrystalCygnet from './CrystalCygnet';
import {
  BadgeCrown,
  BadgePips,
  BadgeRankLabel,
  BadgeWrap,
  CompanionSlot,
} from './SwanRankBadge.styles';

export interface SwanRankBadgeProps {
  pct: number;
  level: number;
  /** Overall badge diameter in px (default 168). The ring is inset. */
  size?: number;
  quality?: RingQuality;
  /** Show the perched companion (culled on small viewports by the styles). */
  showCompanion?: boolean;
}

/** Pause the badge's ambient animations when it scrolls out of view or the tab
 *  is hidden — 7 infinite loops running off-screen is a battery/GPU drain on a
 *  data dashboard (hostile-review perf). Returns a ref + whether to animate. */
function useAnimateWhenVisible<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [active, setActive] = React.useState(true);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let onScreen = true;
    const sync = () => setActive(onScreen && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    }, { threshold: 0.01 });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return { ref, active };
}

const polygonPoints = (cx: number, cy: number, r: number, sides: number, rotate = -90): string =>
  Array.from({ length: sides }, (_, i) => {
    const a = (rotate + (i / sides) * 360) * (Math.PI / 180);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

const SwanRankBadge: React.FC<SwanRankBadgeProps> = ({
  pct,
  level,
  size = 168,
  quality = 'full',
  showCompanion = true,
}) => {
  const b = badgeStateFor(level);
  const frame = b.frame;
  const cx = size / 2;
  const cy = size / 2;
  const frameR = size / 2 - 3;
  const ringSize = Math.round(size * 0.72);
  const { ref, active } = useAnimateWhenVisible<HTMLDivElement>();

  // Crystalline facet silhouette — a polygon whose facet-count grows by rank.
  const outer = polygonPoints(cx, cy, frameR, frame.facets);
  const inner = polygonPoints(cx, cy, frameR - 8, frame.facets);

  return (
    <BadgeWrap
      ref={ref}
      style={{ width: size, height: size }}
      data-rank={frame.rank}
      data-sovereign={b.isSovereign ? 'true' : undefined}
      data-paused={active ? undefined : 'true'}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        {/* Frame — Molt-refined material edge + inner bevel (internal glow, no
            drop shadows: shadows on the vault read as mud per the Charter). */}
        <polygon
          className="badge-frame-edge"
          points={outer}
          fill="none"
          stroke={frame.frameEdge}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <polygon
          points={inner}
          fill="none"
          stroke={frame.frameBevel}
          strokeWidth={1.25}
          strokeLinejoin="round"
          opacity={0.7}
        />
      </svg>

      {/* The living ring — the centerpiece, inset inside the frame. */}
      <div className="badge-ring-slot">
        <CrystalProgressRing pct={pct} level={level} size={ringSize} quality={quality} hideEraLabel />
      </div>

      {/* Crown motif — top ranks only. */}
      {frame.crown && (
        <BadgeCrown aria-hidden="true">
          <svg width={size * 0.34} height={size * 0.2} viewBox="0 0 100 60">
            <path
              d="M8 52 L20 18 L34 40 L50 8 L66 40 L80 18 L92 52 Z"
              fill="none"
              stroke={frame.pip}
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </BadgeCrown>
      )}

      {/* Sub-tier pips — filled pips = progress within the rank (every 10 lvls). */}
      <BadgePips aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i < b.subTier ? 'pip on' : 'pip'} style={{ background: i < b.subTier ? frame.pip : undefined }} />
        ))}
      </BadgePips>

      <BadgeRankLabel>{frame.name} · {frame.rank}</BadgeRankLabel>

      {/* Companion perched on the rim (culled < 768px by the styles). */}
      {showCompanion && (
        <CompanionSlot aria-hidden="true">
          <CrystalCygnet level={level} size={Math.round(size * 0.22)} quality={quality} />
        </CompanionSlot>
      )}
    </BadgeWrap>
  );
};

// Primitive props → memo is free correctness; avoids re-running the SVG
// geometry when the hero re-renders for unrelated state (hostile-review perf).
export default React.memo(SwanRankBadge);