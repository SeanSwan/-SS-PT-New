/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BodyMapSVG                                       ║
 * ║  PURPOSE: Interactive anatomical body map with image layers   ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-04-02                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌─────────────────────────────────────────────────────┐
 * │  ┌─── Front View ──┐   ┌─── Back View ───┐         │
 * │  │  [Anatomy Image] │   │  [Anatomy Image]  │       │
 * │  │  + SVG Hotspots  │   │  + SVG Hotspots   │       │
 * │  │  + Label Overlay │   │  + Label Overlay  │       │
 * │  └─────────────────┘   └──────────────────┘         │
 * └─────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { painEntries, selectedRegion, onRegionClick, gender, labelMode, profilePhotoUrl }
 * Children:  None (leaf SVG component)
 *
 * IMAGE LAYER SYSTEM:
 * 1. Base: Anatomical image (WebP) loaded from /anatomy/{gender}-{view}.webp
 * 2. Fallback: Detailed SVG body outline (always available)
 * 3. Overlay: SVG hotspot ellipses (interactive regions)
 * 4. Labels: Anatomical text labels (muscles or bones) positioned per-region
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */
import React, { useRef, useState, useCallback, useMemo, useId } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  FRONT_VIEW_REGIONS,
  BACK_VIEW_REGIONS,
  getSeverityColor,
  getSeverityTier,
  type BodyRegion,
} from './bodyRegions';
import ZoomablePanel from './ZoomablePanel';
import {
  MaleFrontOutline,
  MaleBackOutline,
  FemaleFrontOutline,
  FemaleBackOutline,
  NeutralFrontOutline,
  NeutralBackOutline,
  HEAD_GEOMETRY,
} from './bodyOutlines';
import type { AnatomyGender, LabelMode } from './BodyMapToolbar';
import type { PainEntry } from '../../services/painEntryService';
import { device } from '../../styles/breakpoints';

// ── Animations ──────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// ── Styled Components ───────────────────────────────────────────────────

const MapContainer = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: flex-start;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;

  ${device.md} {
    flex-direction: row;
    gap: 24px;
  }

  ${device.xxxl} {
    gap: 32px;
  }
`;

const ViewPanel = styled.div`
  background: var(--bg-elevated, rgba(0, 32, 96, 0.8));
  border: 1px solid var(--border-soft, rgba(64, 112, 192, 0.2));
  border-radius: 16px;
  backdrop-filter: blur(12px);
  padding: 10px;
  text-align: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  touch-action: manipulation;
  box-sizing: border-box;
  min-width: 0;

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, rgba(0, 20, 60, 0.95));
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  ${device.sm} {
    max-width: 300px;
    padding: 14px;
  }

  ${device.md} {
    flex: 1;
    max-width: 320px;
    min-width: 0;
  }

  ${device.xxxl} {
    max-width: 400px;
    padding: 20px;
  }
`;

const ViewLabel = styled.h4`
  color: var(--accent-primary, #8B5CF6);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 12px 0;
  position: relative;
  padding-bottom: 8px;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    max-width: 120px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent-primary, #8B5CF6), transparent);
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
  }
`;

const ResponsiveSVG = styled.svg`
  width: 100%;
  height: auto;
  max-width: 280px;
  display: block;
  margin: 0 auto;
  overflow: visible;

  ${device.xxxl} {
    max-width: 360px;
  }
`;

// Zoom/pan lives in ZoomablePanel.tsx since Slice 3 (per-panel state, pan-y
// page scroll, visible controls).

const ChipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const ChipLabel = styled.span`
  color: var(--text-muted, rgba(255, 255, 255, 0.55));
  font-size: 12px;
`;

const Chip = styled.button`
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.3));
  background: var(--bg-elevated, rgba(0, 32, 96, 0.8));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  cursor: pointer;

  &:hover { border-color: var(--glow-accent, #8B5CF6); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

/**
 * Minimum radius for interactive ellipses to guarantee 44px touch targets.
 * For a 280px-wide SVG mapping to 200 viewBox units:
 *   44px → 200/280 * 44/2 = 15.7 viewBox units
 * Using 22 guarantees 44px diameter at any reasonable scale.
 */
const HIT_AREA_MIN_R = 22;

interface RegionEllipseProps {
  $isActive: boolean;
  $isSelected: boolean;
  $severityColor: string | null;
  $tier: 'severe' | 'moderate' | 'mild' | null;
}

/**
 * Slice 3 (B8): severity is multi-channel — color (non-adjacent tokens),
 * stroke pattern (moderate = dashed), fill (severe = filled + halo), numeric
 * pill, and pulse ONLY at severe (respecting prefers-reduced-motion).
 * Selection/hover/focus moved to Ice Wing so they can't be confused with the
 * severe (Wing Purple) tier.
 */
const RegionEllipse = styled.ellipse<RegionEllipseProps>`
  fill: ${({ $tier, $severityColor }) =>
    $tier === 'severe' && $severityColor
      ? `color-mix(in srgb, ${$severityColor} 22%, transparent)`
      : 'transparent'};
  stroke: ${({ $isActive, $isSelected, $severityColor }) =>
    $isSelected
      ? 'var(--accent-primary, #60C0F0)'
      : $isActive && $severityColor
        ? $severityColor
        : 'rgba(64, 112, 192, 0.30)'};
  stroke-width: ${({ $isSelected }) => ($isSelected ? 2.5 : 1.5)};
  stroke-dasharray: ${({ $tier }) => ($tier === 'moderate' ? '4 2' : 'none')};
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $tier }) =>
    $tier === 'severe' &&
    css`
      @media (prefers-reduced-motion: no-preference) {
        animation: ${pulse} 2s ease-in-out infinite;
      }
    `}

  &:hover {
    stroke: var(--accent-primary, #60C0F0);
    stroke-width: 2;
    filter: drop-shadow(0 0 8px rgba(96, 192, 240, 0.5));
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    stroke: var(--accent-primary, #60C0F0);
    stroke-width: 3;
    filter: drop-shadow(0 0 12px rgba(96, 192, 240, 0.6));
  }

  &:active {
    transform: scale(0.95);
  }
`;

const PainDot = styled.circle<{ $color: string }>`
  fill: ${({ $color }) => $color};
  stroke: var(--text-primary, #E0ECF4);
  stroke-width: 2;
  filter: drop-shadow(0 0 6px ${({ $color }) => $color});
  pointer-events: none;
`;

// ── Body outlines live in bodyOutlines.tsx (Slice 2 — adds NEUTRAL figure) ──

// ── Anatomy Image Paths ─────────────────────────────────────────────────

/**
 * Anatomy images loaded from /anatomy/{gender}-{view}.png
 * Generated via Imagen 4.0 API (scripts/generate-anatomy-images.mjs).
 * SVG outline used as fallback if images fail to load.
 * NEUTRAL (Slice 2, A5) has no photorealistic asset on purpose — it renders
 * the outline at full opacity (returning null skips the image layer).
 */
const getAnatomyImagePath = (gender: AnatomyGender, view: 'front' | 'back'): string | null =>
  gender === 'neutral' ? null : `/anatomy/${gender}-${view}.png`;

/**
 * PNG letterbox math (Slice 2, A3). Assets are 768x1408 rendered in a
 * 160x310 box at (20,4) with preserveAspectRatio="xMidYMid meet" →
 * width-limited: content height = 160 * 1408/768 = 293.33 viewBox units,
 * top offset = 4 + (310 - 293.33)/2 = 12.33. The outlines are authored
 * against the full 0..320 viewBox, so when the PNG is showing, the
 * photo-head anchor maps outline-space Y into PNG-content-space. Estimate
 * verified visually in the Slice 3 QA pass.
 */
const VIEWBOX_H = 320;
const PNG_CONTENT_H = (160 * 1408) / 768;
const PNG_CONTENT_TOP = 4 + (310 - PNG_CONTENT_H) / 2;
const mapHeadToPng = (head: { cx: number; cy: number; rx: number; ry: number }) => ({
  cx: head.cx,
  cy: PNG_CONTENT_TOP + (head.cy / VIEWBOX_H) * PNG_CONTENT_H,
  rx: head.rx,
  ry: head.ry * (PNG_CONTENT_H / VIEWBOX_H),
});

// ── Component ───────────────────────────────────────────────────────────

interface BodyMapSVGProps {
  painEntries: PainEntry[];
  selectedRegion: string | null;
  onRegionClick: (regionId: string) => void;
  gender?: AnatomyGender;
  labelMode?: LabelMode;
  profilePhotoUrl?: string | null;
}

const BodyMapSVG: React.FC<BodyMapSVGProps> = ({
  painEntries,
  selectedRegion,
  onRegionClick,
  gender = 'male',
  labelMode = 'off',
  profilePhotoUrl = null,
}) => {
  // Slice 3 (B1): overlapping-hotspot disambiguation — when a tap lands
  // inside more than one inflated hit ellipse, ASK instead of letting the
  // top-most element silently win.
  const [ambiguousRegions, setAmbiguousRegions] = useState<BodyRegion[] | null>(null);
  // Slice 3 (B7): roving tabindex — one tab stop per view, arrows move focus.
  const regionRefs = useRef(new Map<string, SVGEllipseElement | null>());
  const [rovingFocus, setRovingFocus] = useState<{ front: string; back: string }>({
    front: FRONT_VIEW_REGIONS[0]?.id ?? '',
    back: BACK_VIEW_REGIONS[0]?.id ?? '',
  });

  // Track whether anatomical images loaded successfully.
  const [frontImgLoaded, setFrontImgLoaded] = useState(false);
  const [backImgLoaded, setBackImgLoaded] = useState(false);
  const [profilePhotoFailed, setProfilePhotoFailed] = useState(false);
  const shouldShowProfilePhoto = Boolean(profilePhotoUrl) && !profilePhotoFailed;

  React.useEffect(() => {
    let active = true;
    setProfilePhotoFailed(false);

    if (!profilePhotoUrl) return () => { active = false; };

    const profileImage = new Image();
    profileImage.onload = () => { if (active) setProfilePhotoFailed(false); };
    profileImage.onerror = () => { if (active) setProfilePhotoFailed(true); };
    profileImage.src = profilePhotoUrl;

    return () => {
      active = false;
      profileImage.onload = null;
      profileImage.onerror = null;
    };
  }, [profilePhotoUrl]);

  // Reset and preload image state when the figure changes.
  React.useEffect(() => {
    let active = true;

    setFrontImgLoaded(false);
    setBackImgLoaded(false);

    const frontPath = getAnatomyImagePath(gender, 'front');
    const backPath = getAnatomyImagePath(gender, 'back');
    if (!frontPath || !backPath) return () => { active = false; }; // neutral: outline-only

    const frontImage = new Image();
    const backImage = new Image();

    frontImage.onload = () => { if (active) setFrontImgLoaded(true); };
    frontImage.onerror = () => { if (active) setFrontImgLoaded(false); };
    backImage.onload = () => { if (active) setBackImgLoaded(true); };
    backImage.onerror = () => { if (active) setBackImgLoaded(false); };

    frontImage.src = frontPath;
    backImage.src = backPath;

    return () => {
      active = false;
      frontImage.onload = null;
      frontImage.onerror = null;
      backImage.onload = null;
      backImage.onerror = null;
    };
  }, [gender]);

  // Build a map from bodyRegion → highest pain entry
  const regionPainMap = useMemo(() => {
    const map = new Map<string, PainEntry>();
    for (const entry of painEntries) {
      if (!entry.isActive) continue;
      const existing = map.get(entry.bodyRegion);
      if (!existing || entry.painLevel > existing.painLevel) {
        map.set(entry.bodyRegion, entry);
      }
    }
    return map;
  }, [painEntries]);

  // Render anatomical labels for a set of regions
  const renderLabels = (regions: BodyRegion[]) => {
    if (labelMode === 'off') return null;

    // De-duplicate labels — same muscle/bone at same position only shows once
    const seen = new Set<string>();

    return regions.map((region) => {
      const text = labelMode === 'muscles' ? region.muscleName : region.boneName;
      if (!text) return null;

      const key = `${text}-${region.side}`;
      if (seen.has(key)) return null;
      seen.add(key);

      const { cx, cy } = region.svgCoords;
      const dx = region.labelOffset?.dx ?? 0;
      const dy = region.labelOffset?.dy ?? 0;
      const tx = cx + dx;
      const ty = cy + dy;
      const anchor = dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle';

      return (
        <g key={`label-${region.id}`} pointerEvents="none" aria-hidden="true">
          {/* Leader line from region center to label */}
          <line
            x1={cx}
            y1={cy}
            x2={tx}
            y2={ty}
            stroke={labelMode === 'muscles' ? 'rgba(139,92,246,0.35)' : 'rgba(96,192,240,0.35)'}
            strokeWidth="0.5"
            strokeDasharray="1 2"
          />
          {/* Text background for readability */}
          <text
            x={tx}
            y={ty - 1}
            textAnchor={anchor}
            fontSize="4.5"
            fontFamily="Fira Code, monospace"
            fontWeight="500"
            fill="none"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="2"
            paintOrder="stroke"
          >
            {text}
          </text>
          {/* Label text */}
          <text
            x={tx}
            y={ty - 1}
            textAnchor={anchor}
            fontSize="4.5"
            fontFamily="Fira Code, monospace"
            fontWeight="500"
            fill={labelMode === 'muscles' ? '#C6A84B' : '#60C0F0'}
          >
            {text}
          </text>
        </g>
      );
    });
  };

  // Slice 3 (B1): find EVERY region whose inflated hit ellipse contains the
  // click point. Neighbors closer than the 44px inflation used to be silently
  // unreachable — the top-most element always won. >1 candidate → ask.
  const findRegionsAtPoint = useCallback((evt: React.MouseEvent<SVGElement>, regions: BodyRegion[]): BodyRegion[] => {
    const svg = (evt.currentTarget as SVGGraphicsElement).ownerSVGElement;
    const ctm = svg?.getScreenCTM?.();
    if (!svg || !ctm) return []; // non-browser env (JSDOM) — caller falls back
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return regions.filter((region) => {
      const { cx, cy, rx, ry } = region.svgCoords;
      const hx = Math.max(rx, HIT_AREA_MIN_R);
      const hy = Math.max(ry, HIT_AREA_MIN_R);
      const dx = (local.x - cx) / hx;
      const dy = (local.y - cy) / hy;
      return dx * dx + dy * dy <= 1;
    });
  }, []);

  const handleRegionActivate = useCallback((evt: React.MouseEvent<SVGElement>, region: BodyRegion, regions: BodyRegion[]) => {
    const candidates = findRegionsAtPoint(evt, regions);
    if (candidates.length > 1) {
      setAmbiguousRegions(candidates);
      return;
    }
    setAmbiguousRegions(null);
    onRegionClick(region.id);
  }, [findRegionsAtPoint, onRegionClick]);

  // Slice 3 (B7): roving tabindex — the map is ONE tab stop per view;
  // Arrow keys move between regions, Enter/Space selects.
  const moveRovingFocus = useCallback((view: 'front' | 'back', regions: BodyRegion[], currentId: string, delta: number) => {
    const idx = regions.findIndex((r) => r.id === currentId);
    const next = regions[(idx + delta + regions.length) % regions.length];
    if (!next) return;
    setRovingFocus((prev) => ({ ...prev, [view]: next.id }));
    regionRefs.current.get(next.id)?.focus();
  }, []);

  const renderRegions = (regions: BodyRegion[], view: 'front' | 'back') =>
    regions.map((region) => {
      const painEntry = regionPainMap.get(region.id);
      const isActive = !!painEntry;
      const isSelected = selectedRegion === region.id;
      const severityColor = painEntry ? getSeverityColor(painEntry.painLevel) : null;
      const tier = painEntry ? getSeverityTier(painEntry.painLevel) : null;
      const { cx, cy, rx, ry } = region.svgCoords;
      const visRx = Math.min(rx, HIT_AREA_MIN_R);
      const visRy = Math.min(ry, HIT_AREA_MIN_R);

      return (
        <g key={region.id}>
          <RegionEllipse
            ref={(el: SVGEllipseElement | null) => { regionRefs.current.set(region.id, el); }}
            cx={cx}
            cy={cy}
            rx={Math.max(rx, HIT_AREA_MIN_R)}
            ry={Math.max(ry, HIT_AREA_MIN_R)}
            $isActive={isActive}
            $isSelected={isSelected}
            $severityColor={severityColor}
            $tier={tier}
            onClick={(e: React.MouseEvent<SVGElement>) => handleRegionActivate(e, region, regions)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAmbiguousRegions(null); // keyboard targeting is exact
                onRegionClick(region.id);
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                moveRovingFocus(view, regions, region.id, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                moveRovingFocus(view, regions, region.id, -1);
              }
            }}
            onFocus={() => setRovingFocus((prev) => ({ ...prev, [view]: region.id }))}
            tabIndex={rovingFocus[view] === region.id ? 0 : -1}
            role="button"
            aria-label={
              painEntry
                ? `${region.label}, pain ${painEntry.painLevel} out of 10${isSelected ? ', selected' : ''}`
                : `Select ${region.label}`
            }
          />
          {/* Visual-only overlay showing true anatomical size */}
          {(rx < HIT_AREA_MIN_R || ry < HIT_AREA_MIN_R) && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={isActive && severityColor ? `color-mix(in srgb, ${severityColor} 25%, transparent)` : 'rgba(64, 112, 192, 0.05)'}
              stroke="inherit"
              strokeWidth="inherit"
              pointerEvents="none"
              aria-hidden="true"
            />
          )}
          {isActive && severityColor && (
            <PainDot cx={cx} cy={cy} r={3} $color={severityColor} />
          )}
          {/* Slice 3 (B8): numeric severity pill — the truthful channel. */}
          {isActive && painEntry && (
            <g pointerEvents="none" aria-hidden="true">
              <rect
                x={cx + visRx * 0.55}
                y={cy - visRy - 7}
                width={painEntry.painLevel >= 10 ? 13 : 10}
                height={8}
                rx={2.5}
                fill="var(--bg-base, #0A0A0F)"
                stroke={severityColor ?? 'none'}
                strokeWidth="0.6"
              />
              <text
                x={cx + visRx * 0.55 + (painEntry.painLevel >= 10 ? 6.5 : 5)}
                y={cy - visRy - 1}
                textAnchor="middle"
                fontSize="5.5"
                fontFamily="Fira Code, monospace"
                fontWeight="600"
                fill="var(--text-primary, #E0ECF4)"
              >
                {painEntry.painLevel}
              </text>
            </g>
          )}
        </g>
      );
    });

  // Select outline based on figure + view (neutral = A5 inclusive default)
  const getFrontOutline = () =>
    gender === 'female' ? <FemaleFrontOutline /> : gender === 'neutral' ? <NeutralFrontOutline /> : <MaleFrontOutline />;
  const getBackOutline = () =>
    gender === 'female' ? <FemaleBackOutline /> : gender === 'neutral' ? <NeutralBackOutline /> : <MaleBackOutline />;

  // Slice 2 (A6): unique per-mount clip id — two BodyMaps on one page no
  // longer collide on a static DOM id. useId's colons are stripped for
  // url(#...) safety.
  const headClipId = `bm-head-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // Slice 2 (A3): head geometry follows the figure (male/female/neutral heads
  // differ) and remaps into PNG-content space when the photo asset is showing.
  const headBase = HEAD_GEOMETRY[gender] ?? HEAD_GEOMETRY.neutral;
  const frontImagePath = getAnatomyImagePath(gender, 'front');
  const backImagePath = getAnatomyImagePath(gender, 'back');
  const photoHead = frontImgLoaded && frontImagePath ? mapHeadToPng(headBase) : headBase;

  return (
    <>
    <MapContainer>
      <ViewPanel>
        <ViewLabel>Front View</ViewLabel>
        <ZoomablePanel label="front view">
            <ResponsiveSVG viewBox="0 0 200 320">
              <rect x="0" y="0" width="200" height="320" rx="8" fill="var(--bg-base, #002060)" />
              <defs>
                <clipPath id={headClipId}>
                  <ellipse cx={photoHead.cx} cy={photoHead.cy} rx={photoHead.rx} ry={photoHead.ry} />
                </clipPath>
              </defs>
              {/* Layer 1: Anatomical image (neutral figure has none on purpose) */}
              {frontImagePath && (
                <image
                  href={frontImagePath}
                  x="20" y="4" width="160" height="310"
                  preserveAspectRatio="xMidYMid meet"
                  opacity={frontImgLoaded ? 0.85 : 0}
                  pointerEvents="none"
                />
              )}
              {/* Layer 2: SVG outline remains visible when the image is not available. */}
              <g opacity={frontImagePath && frontImgLoaded ? 0.3 : 1}>
                {getFrontOutline()}
              </g>
              {/* Layer 3: Decorative profile personalization, anchored to the figure head. */}
              {shouldShowProfilePhoto && (
                <g pointerEvents="none" aria-hidden="true" data-testid="body-map-profile-head-overlay">
                  <image
                    data-testid="body-map-profile-head-image"
                    href={profilePhotoUrl ?? undefined}
                    x={photoHead.cx - photoHead.rx}
                    y={photoHead.cy - photoHead.ry}
                    width={photoHead.rx * 2}
                    height={photoHead.ry * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${headClipId})`}
                    opacity="0.92"
                    pointerEvents="none"
                  />
                  <ellipse
                    cx={photoHead.cx} cy={photoHead.cy} rx={photoHead.rx} ry={photoHead.ry}
                    fill="none"
                    stroke="var(--accent-primary, #8B5CF6)"
                    strokeWidth="0.8"
                    opacity="0.75"
                    pointerEvents="none"
                  />
                </g>
              )}
              {/* Layer 4: Interactive hotspot regions */}
              {renderRegions(FRONT_VIEW_REGIONS, 'front')}
              {/* Layer 5: Anatomical labels */}
              {renderLabels(FRONT_VIEW_REGIONS)}
            </ResponsiveSVG>
        </ZoomablePanel>
      </ViewPanel>

      <ViewPanel>
        <ViewLabel>Back View</ViewLabel>
        <ZoomablePanel label="back view">
            <ResponsiveSVG viewBox="0 0 200 320">
              <rect x="0" y="0" width="200" height="320" rx="8" fill="var(--bg-base, #002060)" />
              {/* Layer 1: Anatomical image (neutral figure has none on purpose) */}
              {backImagePath && (
                <image
                  href={backImagePath}
                  x="20" y="4" width="160" height="310"
                  preserveAspectRatio="xMidYMid meet"
                  opacity={backImgLoaded ? 0.85 : 0}
                  pointerEvents="none"
                />
              )}
              <g opacity={backImagePath && backImgLoaded ? 0.3 : 1}>
                {getBackOutline()}
              </g>
              {renderRegions(BACK_VIEW_REGIONS, 'back')}
              {renderLabels(BACK_VIEW_REGIONS)}
            </ResponsiveSVG>
        </ZoomablePanel>
      </ViewPanel>
    </MapContainer>
    {/* Slice 3 (B1): overlap disambiguation — never guess which body part
        a tap between neighbors meant. */}
    {ambiguousRegions && ambiguousRegions.length > 1 && (
      <ChipRow role="group" aria-label="Choose which area you meant">
        <ChipLabel>Which area?</ChipLabel>
        {ambiguousRegions.map((region) => (
          <Chip
            key={region.id}
            type="button"
            onClick={() => {
              setAmbiguousRegions(null);
              onRegionClick(region.id);
            }}
          >
            {region.label}
          </Chip>
        ))}
        <Chip type="button" onClick={() => setAmbiguousRegions(null)} aria-label="Dismiss area choices">✕</Chip>
      </ChipRow>
    )}
    </>
  );
};

export default BodyMapSVG;
