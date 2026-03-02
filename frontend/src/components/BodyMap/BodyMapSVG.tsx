/**
 * BodyMapSVG — Interactive human body map with front + back views
 * ===============================================================
 * Renders a simplified anatomical outline with clickable regions.
 * Each region is an SVG ellipse that highlights on hover and shows
 * severity-colored markers for active pain entries.
 *
 * Galaxy-Swan theme: #0a0a1a background, #00FFFF outlines, glass panel wrapper
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */
import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  FRONT_VIEW_REGIONS,
  BACK_VIEW_REGIONS,
  getSeverityColor,
  type BodyRegion,
} from './bodyRegions';
import type { PainEntry } from '../../services/painEntryService';

// ── Animations ──────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// ── Styled Components ───────────────────────────────────────────────────

const MapContainer = styled.div`
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
`;

const ViewPanel = styled.div`
  background: rgba(10, 10, 26, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  padding: 16px;
  text-align: center;
`;

const ViewLabel = styled.h4`
  color: rgba(0, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 8px 0;
`;

interface RegionEllipseProps {
  $isActive: boolean;
  $isSelected: boolean;
  $severityColor: string | null;
}

const RegionEllipse = styled.ellipse<RegionEllipseProps>`
  fill: ${({ $isActive, $severityColor }) =>
    $isActive && $severityColor ? `${$severityColor}33` : 'rgba(0, 255, 255, 0.03)'};
  stroke: ${({ $isActive, $isSelected, $severityColor }) =>
    $isSelected
      ? '#00FFFF'
      : $isActive && $severityColor
        ? $severityColor
        : 'rgba(0, 255, 255, 0.12)'};
  stroke-width: ${({ $isSelected }) => ($isSelected ? 2.5 : 1)};
  cursor: pointer;
  transition: fill 0.2s, stroke 0.2s, stroke-width 0.15s;

  ${({ $isActive }) =>
    $isActive &&
    css`
      animation: ${pulse} 2s ease-in-out infinite;
    `}

  &:hover {
    fill: rgba(0, 255, 255, 0.15);
    stroke: #00FFFF;
    stroke-width: 2;
  }
`;

const PainDot = styled.circle<{ $color: string }>`
  fill: ${({ $color }) => $color};
  filter: drop-shadow(0 0 4px ${({ $color }) => $color});
  pointer-events: none;
`;

// ── Body outline SVG paths ──────────────────────────────────────────────

const BodyOutlineFront: React.FC = () => (
  <g stroke="rgba(0,255,255,0.25)" strokeWidth="1" fill="none">
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
  <g stroke="rgba(0,255,255,0.25)" strokeWidth="1" fill="none">
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
  // Build a map from bodyRegion → highest pain entry
  const regionPainMap = new Map<string, PainEntry>();
  for (const entry of painEntries) {
    if (!entry.isActive) continue;
    const existing = regionPainMap.get(entry.bodyRegion);
    if (!existing || entry.painLevel > existing.painLevel) {
      regionPainMap.set(entry.bodyRegion, entry);
    }
  }

  const renderRegions = (regions: BodyRegion[]) =>
    regions.map((region) => {
      const painEntry = regionPainMap.get(region.id);
      const isActive = !!painEntry;
      const isSelected = selectedRegion === region.id;
      const severityColor = painEntry ? getSeverityColor(painEntry.painLevel) : null;
      const { cx, cy, rx, ry } = region.svgCoords;

      return (
        <g key={region.id} onClick={() => onRegionClick(region.id)}>
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

  return (
    <MapContainer>
      <ViewPanel>
        <ViewLabel>Front View</ViewLabel>
        <svg viewBox="0 0 200 310" width="200" height="310" style={{ overflow: 'visible' }}>
          <BodyOutlineFront />
          {renderRegions(FRONT_VIEW_REGIONS)}
        </svg>
      </ViewPanel>

      <ViewPanel>
        <ViewLabel>Back View</ViewLabel>
        <svg viewBox="0 0 200 310" width="200" height="310" style={{ overflow: 'visible' }}>
          <BodyOutlineBack />
          {renderRegions(BACK_VIEW_REGIONS)}
        </svg>
      </ViewPanel>
    </MapContainer>
  );
};

export default BodyMapSVG;
