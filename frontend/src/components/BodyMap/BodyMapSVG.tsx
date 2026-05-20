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
 * Props In:  { painEntries, selectedRegion, onRegionClick, gender, labelMode }
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
import React, { useRef, useState, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  FRONT_VIEW_REGIONS,
  BACK_VIEW_REGIONS,
  getSeverityColor,
  type BodyRegion,
} from './bodyRegions';
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

const ZoomContainer = styled.div`
  position: relative;
  overflow: hidden;
  touch-action: none;
  border-radius: 12px;

  ${device.md} {
    touch-action: manipulation;
    overflow: visible;
  }
`;

const ZoomContent = styled.div<{ $scale: number; $x: number; $y: number; $isPinching: boolean }>`
  transform: ${({ $scale, $x, $y }) => `scale(${$scale}) translate(${$x / $scale}px, ${$y / $scale}px)`};
  transform-origin: center center;
  transition: ${({ $isPinching }) => $isPinching ? 'none' : 'transform 0.2s ease-out'};
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
}

const RegionEllipse = styled.ellipse<RegionEllipseProps>`
  fill: transparent;
  stroke: ${({ $isActive, $isSelected, $severityColor }) =>
    $isSelected
      ? '#8B5CF6'
      : $isActive && $severityColor
        ? $severityColor
        : 'rgba(64, 112, 192, 0.30)'};
  stroke-width: ${({ $isSelected }) => ($isSelected ? 2.5 : 1.5)};
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $isActive }) =>
    $isActive &&
    css`
      animation: ${pulse} 2s ease-in-out infinite;
    `}

  &:hover {
    stroke: #8B5CF6;
    stroke-width: 2;
    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.5));
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    stroke: #8B5CF6;
    stroke-width: 3;
    filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.6));
  }

  &:active {
    transform: scale(0.95);
  }
`;

const PainDot = styled.circle<{ $color: string }>`
  fill: ${({ $color }) => $color};
  stroke: #E0ECF4;
  stroke-width: 2;
  filter: drop-shadow(0 0 6px ${({ $color }) => $color});
  pointer-events: none;
`;

// ── Detailed Body Outlines ──────────────────────────────────────────────

/** Male front outline — broader shoulders, narrower hips, more angular musculature */
const MaleFrontOutline: React.FC = () => (
  <g stroke="rgba(64, 112, 192, 0.40)" strokeWidth="1.2" fill="none" strokeLinecap="round">
    {/* Head + jaw */}
    <ellipse cx="100" cy="24" rx="14" ry="18" />
    <path d="M88,36 Q88,42 92,44" />
    <path d="M112,36 Q112,42 108,44" />
    {/* Neck — trapezius flare */}
    <line x1="93" y1="44" x2="90" y2="60" />
    <line x1="107" y1="44" x2="110" y2="60" />
    {/* Shoulders — broad, angular deltoid caps */}
    <path d="M90,62 Q78,56 60,68 Q50,74 48,82" />
    <path d="M110,62 Q122,56 140,68 Q150,74 152,82" />
    {/* Chest — pec shelf */}
    <path d="M68,78 Q72,88 80,94 L100,98 L120,94 Q128,88 132,78" />
    <path d="M80,94 Q84,100 100,102 Q116,100 120,94" />
    {/* Torso sides — lats, obliques, hip bone */}
    <path d="M66,80 L64,100 Q62,120 66,140 L72,158 Q78,168 86,174" />
    <path d="M134,80 L136,100 Q138,120 134,140 L128,158 Q122,168 114,174" />
    {/* Waistline + hip line */}
    <path d="M72,158 Q86,162 100,162 Q114,162 128,158" />
    {/* Arms */}
    <path d="M48,82 Q44,96 42,112 L38,140 Q36,155 34,170" />
    <path d="M152,82 Q156,96 158,112 L162,140 Q164,155 166,170" />
    <path d="M48,82 Q52,96 54,112 L52,130" />
    <path d="M152,82 Q148,96 146,112 L148,130" />
    {/* Hands */}
    <ellipse cx="34" cy="174" rx="4" ry="6" />
    <ellipse cx="166" cy="174" rx="4" ry="6" />
    {/* Abs center line */}
    <line x1="100" y1="98" x2="100" y2="162" stroke="rgba(64,112,192,0.15)" strokeDasharray="3 4" />
    {/* Legs */}
    <path d="M86,174 Q84,190 82,210 L80,230 Q78,246 78,260 L76,290 Q76,296 80,300" />
    <path d="M114,174 Q116,190 118,210 L120,230 Q122,246 122,260 L124,290 Q124,296 120,300" />
    <path d="M86,174 Q92,178 100,178 Q108,178 114,174" />
    <path d="M96,178 Q94,200 92,220 L90,240 Q88,260 88,280 L88,300" />
    <path d="M104,178 Q106,200 108,220 L110,240 Q112,260 112,280 L112,300" />
    {/* Feet */}
    <path d="M76,298 L74,304 Q78,308 86,308 L92,306" />
    <path d="M124,298 L126,304 Q122,308 114,308 L108,306" />
  </g>
);

/** Female front outline — narrower shoulders, wider hips, curved silhouette */
const FemaleFrontOutline: React.FC = () => (
  <g stroke="rgba(64, 112, 192, 0.40)" strokeWidth="1.2" fill="none" strokeLinecap="round">
    {/* Head — slightly softer jaw */}
    <ellipse cx="100" cy="24" rx="13" ry="17" />
    <path d="M89,36 Q90,40 93,43" />
    <path d="M111,36 Q110,40 107,43" />
    {/* Neck — slimmer */}
    <line x1="94" y1="43" x2="92" y2="58" />
    <line x1="106" y1="43" x2="108" y2="58" />
    {/* Shoulders — narrower, rounder */}
    <path d="M92,60 Q82,58 68,66 Q58,72 56,80" />
    <path d="M108,60 Q118,58 132,66 Q142,72 144,80" />
    {/* Chest — bust curve */}
    <path d="M72,76 Q76,84 82,90 Q88,96 100,98 Q112,96 118,90 Q124,84 128,76" />
    <path d="M82,90 Q86,96 100,100 Q114,96 118,90" />
    {/* Torso — waist cinch + hip flare */}
    <path d="M70,78 L68,96 Q66,110 70,126 L74,140 Q72,152 68,162 Q72,174 82,180" />
    <path d="M130,78 L132,96 Q134,110 130,126 L126,140 Q128,152 132,162 Q128,174 118,180" />
    {/* Waist narrowing */}
    <path d="M74,140 Q86,136 100,136 Q114,136 126,140" />
    {/* Hip line — wider */}
    <path d="M68,162 Q82,170 100,170 Q118,170 132,162" />
    {/* Arms — slimmer */}
    <path d="M56,80 Q52,94 50,110 L46,138 Q44,152 42,168" />
    <path d="M144,80 Q148,94 150,110 L154,138 Q156,152 158,168" />
    <path d="M56,80 Q58,94 58,110 L56,128" />
    <path d="M144,80 Q142,94 142,110 L144,128" />
    {/* Hands */}
    <ellipse cx="42" cy="172" rx="3.5" ry="5.5" />
    <ellipse cx="158" cy="172" rx="3.5" ry="5.5" />
    {/* Center line */}
    <line x1="100" y1="98" x2="100" y2="170" stroke="rgba(64,112,192,0.12)" strokeDasharray="3 4" />
    {/* Legs — curvier */}
    <path d="M82,180 Q80,196 78,214 L76,234 Q74,250 74,264 L72,292 Q72,298 76,302" />
    <path d="M118,180 Q120,196 122,214 L124,234 Q126,250 126,264 L128,292 Q128,298 124,302" />
    <path d="M82,180 Q90,184 100,184 Q110,184 118,180" />
    <path d="M94,184 Q92,204 90,224 L88,244 Q86,264 86,282 L86,302" />
    <path d="M106,184 Q108,204 110,224 L112,244 Q114,264 114,282 L114,302" />
    {/* Feet */}
    <path d="M72,300 L70,306 Q74,310 82,310 L90,308" />
    <path d="M128,300 L130,306 Q126,310 118,310 L110,308" />
  </g>
);

/** Male back outline */
const MaleBackOutline: React.FC = () => (
  <g stroke="rgba(64, 112, 192, 0.40)" strokeWidth="1.2" fill="none" strokeLinecap="round">
    {/* Head */}
    <ellipse cx="100" cy="24" rx="14" ry="18" />
    {/* Neck */}
    <line x1="93" y1="42" x2="90" y2="58" />
    <line x1="107" y1="42" x2="110" y2="58" />
    {/* Trapezius diamond */}
    <path d="M90,58 Q80,54 62,66 Q52,72 48,82" />
    <path d="M110,58 Q120,54 138,66 Q148,72 152,82" />
    <path d="M90,58 Q96,66 100,70 Q104,66 110,58" />
    {/* Spine line */}
    <line x1="100" y1="58" x2="100" y2="165" stroke="rgba(64,112,192,0.15)" strokeDasharray="3 4" />
    {/* Scapulae */}
    <path d="M72,80 Q78,86 82,96 Q80,104 74,108" opacity="0.4" />
    <path d="M128,80 Q122,86 118,96 Q120,104 126,108" opacity="0.4" />
    {/* Back torso — lats V-taper */}
    <path d="M66,82 L62,100 Q58,118 62,136 L68,156 Q76,168 86,174" />
    <path d="M134,82 L138,100 Q142,118 138,136 L132,156 Q124,168 114,174" />
    {/* Waistline */}
    <path d="M68,156 Q84,162 100,162 Q116,162 132,156" />
    {/* Arms */}
    <path d="M48,82 Q44,96 42,112 L38,140 Q36,155 34,170" />
    <path d="M152,82 Q156,96 158,112 L162,140 Q164,155 166,170" />
    <path d="M48,82 Q52,96 54,108 L52,128" />
    <path d="M152,82 Q148,96 146,108 L148,128" />
    <ellipse cx="34" cy="174" rx="4" ry="6" />
    <ellipse cx="166" cy="174" rx="4" ry="6" />
    {/* Glute line */}
    <path d="M86,174 Q92,178 100,180 Q108,178 114,174" />
    <path d="M90,170 Q100,176 110,170" opacity="0.3" />
    {/* Legs */}
    <path d="M86,174 Q82,196 80,218 L78,240 Q76,256 76,270 L74,294 Q74,300 78,304" />
    <path d="M114,174 Q118,196 120,218 L122,240 Q124,256 124,270 L126,294 Q126,300 122,304" />
    <path d="M96,178 Q94,200 92,222 L90,244 Q88,262 88,278 L88,304" />
    <path d="M104,178 Q106,200 108,222 L110,244 Q112,262 112,278 L112,304" />
    {/* Feet */}
    <path d="M74,302 L72,308 Q76,312 84,312 L92,310" />
    <path d="M126,302 L128,308 Q124,312 116,312 L108,310" />
  </g>
);

/** Female back outline */
const FemaleBackOutline: React.FC = () => (
  <g stroke="rgba(64, 112, 192, 0.40)" strokeWidth="1.2" fill="none" strokeLinecap="round">
    {/* Head */}
    <ellipse cx="100" cy="24" rx="13" ry="17" />
    {/* Neck */}
    <line x1="94" y1="41" x2="92" y2="56" />
    <line x1="106" y1="41" x2="108" y2="56" />
    {/* Trapezius — narrower */}
    <path d="M92,58 Q82,56 68,64 Q58,70 56,78" />
    <path d="M108,58 Q118,56 132,64 Q142,70 144,78" />
    <path d="M92,58 Q96,64 100,68 Q104,64 108,58" />
    {/* Spine */}
    <line x1="100" y1="58" x2="100" y2="168" stroke="rgba(64,112,192,0.12)" strokeDasharray="3 4" />
    {/* Scapulae */}
    <path d="M74,78 Q80,84 84,92 Q82,100 76,104" opacity="0.35" />
    <path d="M126,78 Q120,84 116,92 Q118,100 124,104" opacity="0.35" />
    {/* Back — waist cinch + hip flare */}
    <path d="M70,78 L68,96 Q64,112 68,130 L72,144 Q70,156 66,166 Q70,176 80,182" />
    <path d="M130,78 L132,96 Q136,112 132,130 L128,144 Q130,156 134,166 Q130,176 120,182" />
    <path d="M72,144 Q86,138 100,138 Q114,138 128,144" />
    {/* Hip line */}
    <path d="M66,166 Q82,174 100,174 Q118,174 134,166" />
    {/* Arms */}
    <path d="M56,78 Q52,92 50,108 L46,136 Q44,150 42,166" />
    <path d="M144,78 Q148,92 150,108 L154,136 Q156,150 158,166" />
    <path d="M56,78 Q58,92 58,106 L56,124" />
    <path d="M144,78 Q142,92 142,106 L144,124" />
    <ellipse cx="42" cy="170" rx="3.5" ry="5.5" />
    <ellipse cx="158" cy="170" rx="3.5" ry="5.5" />
    {/* Glute */}
    <path d="M80,182 Q90,186 100,188 Q110,186 120,182" />
    <path d="M86,176 Q100,182 114,176" opacity="0.3" />
    {/* Legs */}
    <path d="M80,182 Q78,200 76,218 L74,240 Q72,256 72,270 L70,296 Q70,302 74,306" />
    <path d="M120,182 Q122,200 124,218 L126,240 Q128,256 128,270 L130,296 Q130,302 126,306" />
    <path d="M94,186 Q92,206 90,226 L88,248 Q86,266 86,282 L86,306" />
    <path d="M106,186 Q108,206 110,226 L112,248 Q114,266 114,282 L114,306" />
    <path d="M70,304 L68,310 Q72,314 80,314 L88,312" />
    <path d="M130,304 L132,310 Q128,314 120,314 L112,312" />
  </g>
);

// ── Anatomy Image Paths ─────────────────────────────────────────────────

/**
 * Anatomy images loaded from /anatomy/{gender}-{view}.png
 * Generated via Imagen 4.0 API (scripts/generate-anatomy-images.mjs).
 * SVG outline used as fallback if images fail to load.
 */
const getAnatomyImagePath = (gender: AnatomyGender, view: 'front' | 'back') =>
  `/anatomy/${gender}-${view}.png`;

// ── Component ───────────────────────────────────────────────────────────

interface BodyMapSVGProps {
  painEntries: PainEntry[];
  selectedRegion: string | null;
  onRegionClick: (regionId: string) => void;
  gender?: AnatomyGender;
  labelMode?: LabelMode;
}

const BodyMapSVG: React.FC<BodyMapSVGProps> = ({
  painEntries,
  selectedRegion,
  onRegionClick,
  gender = 'male',
  labelMode = 'off',
}) => {
  // Pinch-zoom state for mobile
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  // Track whether anatomical images loaded successfully.
  const [frontImgLoaded, setFrontImgLoaded] = useState(false);
  const [backImgLoaded, setBackImgLoaded] = useState(false);

  // Reset and preload image state when gender changes.
  React.useEffect(() => {
    let active = true;
    const frontImage = new Image();
    const backImage = new Image();

    setFrontImgLoaded(false);
    setBackImgLoaded(false);

    frontImage.onload = () => { if (active) setFrontImgLoaded(true); };
    frontImage.onerror = () => { if (active) setFrontImgLoaded(false); };
    backImage.onload = () => { if (active) setBackImgLoaded(true); };
    backImage.onerror = () => { if (active) setBackImgLoaded(false); };

    frontImage.src = getAnatomyImagePath(gender, 'front');
    backImage.src = getAnatomyImagePath(gender, 'back');

    return () => {
      active = false;
      frontImage.onload = null;
      frontImage.onerror = null;
      backImage.onload = null;
      backImage.onerror = null;
    };
  }, [gender]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { startDist: Math.hypot(dx, dy), startScale: scale };
    } else if (e.touches.length === 1 && scale > 1) {
      panRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTx: translate.x,
        startTy: translate.y,
      };
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.min(5, Math.max(1, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      setScale(newScale);
      if (newScale <= 1) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && panRef.current && scale > 1) {
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      const maxPan = (scale - 1) * 150;
      const newX = Math.min(maxPan, Math.max(-maxPan, panRef.current.startTx + dx));
      const newY = Math.min(maxPan, Math.max(-maxPan, panRef.current.startTy + dy));
      setTranslate({ x: newX, y: newY });
    }
  }, [scale]);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
    panRef.current = null;
  }, []);

  // Double-tap to reset zoom
  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
    lastTapRef.current = now;
  }, []);

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

  const renderRegions = (regions: BodyRegion[]) =>
    regions.map((region) => {
      const painEntry = regionPainMap.get(region.id);
      const isActive = !!painEntry;
      const isSelected = selectedRegion === region.id;
      const severityColor = painEntry ? getSeverityColor(painEntry.painLevel) : null;
      const { cx, cy, rx, ry } = region.svgCoords;

      return (
        <g key={region.id}>
          <RegionEllipse
            cx={cx}
            cy={cy}
            rx={Math.max(rx, HIT_AREA_MIN_R)}
            ry={Math.max(ry, HIT_AREA_MIN_R)}
            $isActive={isActive}
            $isSelected={isSelected}
            $severityColor={severityColor}
            onClick={() => onRegionClick(region.id)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRegionClick(region.id);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Select ${region.label}`}
          />
          {/* Visual-only overlay showing true anatomical size */}
          {(rx < HIT_AREA_MIN_R || ry < HIT_AREA_MIN_R) && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={isActive && severityColor ? `${severityColor}40` : 'rgba(64, 112, 192, 0.05)'}
              stroke="inherit"
              strokeWidth="inherit"
              pointerEvents="none"
              aria-hidden="true"
            />
          )}
          {isActive && severityColor && (
            <PainDot cx={cx} cy={cy} r={3} $color={severityColor} />
          )}
        </g>
      );
    });

  // Select outline based on gender + view
  const getFrontOutline = () => gender === 'female' ? <FemaleFrontOutline /> : <MaleFrontOutline />;
  const getBackOutline = () => gender === 'female' ? <FemaleBackOutline /> : <MaleBackOutline />;

  return (
    <MapContainer>
      <ViewPanel>
        <ViewLabel>Front View</ViewLabel>
        <ZoomContainer
          onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ZoomContent $scale={scale} $x={translate.x} $y={translate.y} $isPinching={!!pinchRef.current}>
            <ResponsiveSVG viewBox="0 0 200 320">
              <rect x="0" y="0" width="200" height="320" rx="8" fill="var(--bg-base, #002060)" />
              {/* Layer 1: Anatomical image (if available) */}
              <image
                href={getAnatomyImagePath(gender, 'front')}
                x="20" y="4" width="160" height="310"
                preserveAspectRatio="xMidYMid meet"
                opacity={frontImgLoaded ? 0.85 : 0}
                pointerEvents="none"
              />
              {/* Layer 2: SVG outline remains visible when the image is not available. */}
              <g opacity={frontImgLoaded ? 0.3 : 1}>
                {getFrontOutline()}
              </g>
              {/* Layer 3: Interactive hotspot regions */}
              {renderRegions(FRONT_VIEW_REGIONS)}
              {/* Layer 4: Anatomical labels */}
              {renderLabels(FRONT_VIEW_REGIONS)}
            </ResponsiveSVG>
          </ZoomContent>
        </ZoomContainer>
      </ViewPanel>

      <ViewPanel>
        <ViewLabel>Back View</ViewLabel>
        <ZoomContainer
          onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ZoomContent $scale={scale} $x={translate.x} $y={translate.y} $isPinching={!!pinchRef.current}>
            <ResponsiveSVG viewBox="0 0 200 320">
              <rect x="0" y="0" width="200" height="320" rx="8" fill="var(--bg-base, #002060)" />
              {/* Layer 1: Anatomical image */}
              <image
                href={getAnatomyImagePath(gender, 'back')}
                x="20" y="4" width="160" height="310"
                preserveAspectRatio="xMidYMid meet"
                opacity={backImgLoaded ? 0.85 : 0}
                pointerEvents="none"
              />
              <g opacity={backImgLoaded ? 0.3 : 1}>
                {getBackOutline()}
              </g>
              {renderRegions(BACK_VIEW_REGIONS)}
              {renderLabels(BACK_VIEW_REGIONS)}
            </ResponsiveSVG>
          </ZoomContent>
        </ZoomContainer>
      </ViewPanel>
    </MapContainer>
  );
};

export default BodyMapSVG;
