/**
 * BodyMapSVG — Interactive human body map with front + back views
 * ===============================================================
 * Renders a simplified anatomical outline with clickable regions.
 * Each region is an SVG ellipse that highlights on hover and shows
 * severity-colored markers for active pain entries.
 *
 * Ultra-responsive: scales from 320px phones to 4K ultrawide.
 * Theme-aware with Crystalline Swan palette (Midnight Sapphire canvas).
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

  ${device.md} {
    flex-direction: row;
    gap: 24px;
  }

  ${device.xxxl} {
    gap: 32px;
  }
`;

const ViewPanel = styled.div`
  background: rgba(0, 32, 96, 0.8);
  border: 1px solid rgba(64, 112, 192, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  padding: 10px;
  text-align: center;
  width: 100%;
  max-width: 85vw;
  margin: 0 auto;
  touch-action: manipulation;

  ${device.sm} {
    max-width: 300px;
    padding: 14px;
  }

  ${device.md} {
    flex: 1;
    max-width: 320px;
  }

  ${device.xxxl} {
    max-width: 400px;
    padding: 20px;
  }
`;

const ViewLabel = styled.h4`
  color: #8B5CF6;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 8px 0;
`;

const ResponsiveSVG = styled.svg`
  width: 100%;
  height: auto;
  max-width: 280px;
  display: block;
  margin: 0 auto;

  ${device.xxxl} {
    max-width: 360px;
  }
`;

/**
 * ZoomableWrapper — Enables pinch-zoom on mobile for the Body Map SVGs.
 * On touch devices with viewports ≤768px, users can pinch to zoom into
 * muscle groups for more precise tapping. Resets on double-tap.
 */
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

/**
 * Invisible hit-area expander for small muscle ellipses.
 * Rendered as a transparent rect behind each ellipse to ensure
 * a minimum 44px-equivalent touch target at the rendered SVG scale.
 * For a 280px-wide SVG mapping to 200 viewBox units:
 *   44px ≈ 31 viewBox units → min hit area = 15.5 rx/ry
 */
const HIT_AREA_MIN_R = 12; // Minimum radius in viewBox units (~24 units = ~33px at 280px width)

interface RegionEllipseProps {
  $isActive: boolean;
  $isSelected: boolean;
  $severityColor: string | null;
}

const RegionEllipse = styled.ellipse<RegionEllipseProps>`
  fill: ${({ $isActive, $severityColor }) =>
    $isActive && $severityColor ? `${$severityColor}40` : 'rgba(64, 112, 192, 0.05)'};
  stroke: ${({ $isActive, $isSelected, $severityColor }) =>
    $isSelected
      ? '#8B5CF6'
      : $isActive && $severityColor
        ? $severityColor
        : 'rgba(64, 112, 192, 0.15)'};
  stroke-width: ${({ $isSelected }) => ($isSelected ? 2.5 : 1.5)};
  cursor: pointer;
  transition: fill 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              stroke 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              stroke-width 0.15s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $isActive }) =>
    $isActive &&
    css`
      animation: ${pulse} 2s ease-in-out infinite;
    `}

  &:hover {
    fill: rgba(139, 92, 246, 0.18);
    stroke: #8B5CF6;
    stroke-width: 2;
    filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.4));
  }
`;

const PainDot = styled.circle<{ $color: string }>`
  fill: ${({ $color }) => $color};
  stroke: #E0ECF4;
  stroke-width: 2;
  filter: drop-shadow(0 0 6px ${({ $color }) => $color});
  pointer-events: none;
`;

// ── Body outline SVG paths ──────────────────────────────────────────────

const BodyOutlineFront: React.FC = () => (
  <g stroke="rgba(64, 112, 192, 0.35)" strokeWidth="1" fill="none">
    {/* Head */}
    <ellipse cx="100" cy="28" rx="16" ry="20" />
    {/* Neck */}
    <line x1="92" y1="48" x2="92" y2="62" />
    <line x1="108" y1="48" x2="108" y2="62" />
    {/* Shoulders */}
    <path d="M92,65 Q70,60 52,78" />
    <path d="M108,65 Q130,60 148,78" />
    {/* Torso */}
    <path d="M68,80 L64,160 Q80,180 100,180 Q120,180 136,160 L132,80" />
    {/* Arms */}
    <path d="M52,78 L36,170 L44,175 L56,100" />
    <path d="M148,78 L164,170 L156,175 L144,100" />
    {/* Legs */}
    <path d="M80,178 L76,300 L92,300 L96,182" />
    <path d="M120,178 L124,300 L108,300 L104,182" />
  </g>
);

const BodyOutlineBack: React.FC = () => (
  <g stroke="rgba(64, 112, 192, 0.35)" strokeWidth="1" fill="none">
    {/* Head */}
    <ellipse cx="100" cy="28" rx="16" ry="20" />
    {/* Neck */}
    <line x1="92" y1="48" x2="92" y2="60" />
    <line x1="108" y1="48" x2="108" y2="60" />
    {/* Shoulders */}
    <path d="M92,62 Q70,58 50,80" />
    <path d="M108,62 Q130,58 150,80" />
    {/* Back torso */}
    <path d="M66,82 L62,162 Q80,180 100,180 Q120,180 138,162 L134,82" />
    {/* Arms */}
    <path d="M50,80 L34,170 L42,175 L56,100" />
    <path d="M150,80 L166,170 L158,175 L144,100" />
    {/* Legs */}
    <path d="M78,178 L74,300 L90,300 L94,182" />
    <path d="M122,178 L126,300 L110,300 L106,182" />
  </g>
);

// ── Component ───────────────────────────────────────────────────────────

interface BodyMapSVGProps {
  painEntries: PainEntry[];
  selectedRegion: string | null;
  onRegionClick: (regionId: string) => void;
}

const BodyMapSVG: React.FC<BodyMapSVGProps> = ({
  painEntries,
  selectedRegion,
  onRegionClick,
}) => {
  // Pinch-zoom state for mobile
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

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
      // Pan bounds: limit translation to prevent content from leaving viewport
      const maxPan = (scale - 1) * 150; // 150 ≈ half the SVG rendered width
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

  // Build a map from bodyRegion → highest pain entry (memoized to avoid rebuild during gestures)
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

  const renderRegions = (regions: BodyRegion[]) =>
    regions.map((region) => {
      const painEntry = regionPainMap.get(region.id);
      const isActive = !!painEntry;
      const isSelected = selectedRegion === region.id;
      const severityColor = painEntry ? getSeverityColor(painEntry.painLevel) : null;
      const { cx, cy, rx, ry } = region.svgCoords;

      // Expand small hit areas to meet 44px min touch target
      const hitRx = Math.max(rx, HIT_AREA_MIN_R);
      const hitRy = Math.max(ry, HIT_AREA_MIN_R);

      return (
        <g key={region.id} onClick={() => onRegionClick(region.id)}>
          {/* Invisible expanded hit area for small muscles */}
          {(rx < HIT_AREA_MIN_R || ry < HIT_AREA_MIN_R) && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={hitRx}
              ry={hitRy}
              fill="transparent"
              stroke="none"
              style={{ cursor: 'pointer' }}
            />
          )}
          <RegionEllipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            $isActive={isActive}
            $isSelected={isSelected}
            $severityColor={severityColor}
          />
          {isActive && severityColor && (
            <PainDot cx={cx} cy={cy} r={3} $color={severityColor} />
          )}
        </g>
      );
    });

  const zoomStyle: React.CSSProperties = {
    transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
    transformOrigin: 'center center',
    transition: pinchRef.current ? 'none' : 'transform 0.2s ease-out',
  };

  return (
    <MapContainer>
      <ViewPanel>
        <ViewLabel>Front View</ViewLabel>
        <ZoomContainer
          onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={zoomStyle}>
            <ResponsiveSVG viewBox="0 0 200 310" style={{ overflow: 'visible' }}>
              <rect x="0" y="0" width="200" height="310" rx="8" fill="#002060" />
              <BodyOutlineFront />
              {renderRegions(FRONT_VIEW_REGIONS)}
            </ResponsiveSVG>
          </div>
        </ZoomContainer>
      </ViewPanel>

      <ViewPanel>
        <ViewLabel>Back View</ViewLabel>
        <ZoomContainer
          onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={zoomStyle}>
            <ResponsiveSVG viewBox="0 0 200 310" style={{ overflow: 'visible' }}>
              <rect x="0" y="0" width="200" height="310" rx="8" fill="#002060" />
              <BodyOutlineBack />
              {renderRegions(BACK_VIEW_REGIONS)}
            </ResponsiveSVG>
          </div>
        </ZoomContainer>
      </ViewPanel>
    </MapContainer>
  );
};

export default BodyMapSVG;
