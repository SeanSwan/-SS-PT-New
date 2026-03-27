/**
 * ============================================================================
 * FILE: VisitorWorldMap.tsx
 * PURPOSE: Dark-themed SVG world map showing visitor locations with glowing
 *          markers and an all-time visitor counter
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-27
 * AI VILLAGE VALIDATED: 2026-03-27
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a react-simple-maps world map in the Crystalline
 * Swan dark theme, plots visitor locations as pulsing dots, and displays an
 * all-time visitor counter overlay.
 *
 * HOW IT FITS IN THE APP: AdminOverviewPanel → VisitorWorldMap (full-width bento)
 * KEY DECISIONS: react-simple-maps for SVG (no tile server, no API key, dark-first)
 *
 * ┌─── SUB-COMPONENT: VisitorWorldMap ─────────────────────────┐
 * │ PARENT: AdminOverviewPanel                                   │
 * │ PURPOSE: Geographic visitor visualization with all-time count│
 * │ Props: None (fetches own data via authAxios)                 │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Marker dot] → Tooltip with visitor city/country             │
 * │ [Refresh btn] → Re-fetch visitor geo data                    │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { Globe, Users, MapPin, RefreshCw, Eye } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface CityPoint {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  count: number;
}

interface MapData {
  totalVisitors: number;
  uniqueCountries: number;
  uniqueCities: number;
  byCity: CityPoint[];
}

// Natural Earth TopoJSON — free, no API key needed
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const VisitorWorldMap: React.FC = () => {
  const { authAxios } = useAuth();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [allTimeTotal, setAllTimeTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [hoveredCity, setHoveredCity] = useState<CityPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      const [geoRes, historyRes] = await Promise.allSettled([
        authAxios.get('/api/admin/dashboard/visitor-geo'),
        authAxios.get('/api/admin/dashboard/visitor-history', { params: { page: 1, limit: 1 } }),
      ]);

      if (geoRes.status === 'fulfilled' && geoRes.value.data?.success) {
        const d = geoRes.value.data;
        setMapData({
          totalVisitors: d.totalVisitors ?? 0,
          uniqueCountries: d.uniqueCountries ?? 0,
          uniqueCities: d.uniqueCities ?? 0,
          byCity: (d.byCity ?? []).filter((c: any) => c.lat != null && c.lon != null),
        });
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data?.success) {
        setAllTimeTotal(historyRes.value.data.total ?? 0);
      }
    } catch {
      /* silent — widget is non-critical */
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Scale marker radius by visitor count
  const maxCount = useMemo(() => {
    if (!mapData?.byCity.length) return 1;
    return Math.max(...mapData.byCity.map((c) => c.count));
  }, [mapData]);

  const markerRadius = (count: number) => {
    const min = 2;
    const max = 5;
    return min + ((count / maxCount) * (max - min));
  };

  return (
    <MapWrapper>
      {/* Header */}
      <MapHeader>
        <HeaderLeft>
          <GlobeIcon><Globe size={22} /></GlobeIcon>
          <div>
            <MapTitle>Global Visitor Intelligence</MapTitle>
            <MapSubtitle>Real-time geographic distribution</MapSubtitle>
          </div>
        </HeaderLeft>
        <HeaderRight>
          <RefreshBtn onClick={fetchMapData} aria-label="Refresh map data" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </RefreshBtn>
        </HeaderRight>
      </MapHeader>

      {/* Stats Bar */}
      <StatsBar>
        <StatPill>
          <Eye size={14} />
          <StatValue>{allTimeTotal.toLocaleString()}</StatValue>
          <StatLabel>All-Time Visitors</StatLabel>
        </StatPill>
        <StatPill>
          <Users size={14} />
          <StatValue>{mapData?.totalVisitors ?? 0}</StatValue>
          <StatLabel>Tracked Users</StatLabel>
        </StatPill>
        <StatPill>
          <Globe size={14} />
          <StatValue>{mapData?.uniqueCountries ?? 0}</StatValue>
          <StatLabel>Countries</StatLabel>
        </StatPill>
        <StatPill>
          <MapPin size={14} />
          <StatValue>{mapData?.uniqueCities ?? 0}</StatValue>
          <StatLabel>Cities</StatLabel>
        </StatPill>
      </StatsBar>

      {/* Map */}
      <MapContainer>
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          width={800}
          height={400}
          style={{ width: '100%', height: 'auto' }}
        >
          <ZoomableGroup center={[0, 20]} zoom={1}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="var(--bg-surface, #1A1A24)"
                    stroke="var(--border-soft, rgba(96,192,240,0.12))"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, var(--bg-surface, #1A1A24))', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Visitor markers */}
            {mapData?.byCity.map((city, i) => (
              <Marker
                key={`${city.city}-${city.country}-${i}`}
                coordinates={[city.lon, city.lat]}
                onMouseEnter={(e) => {
                  setHoveredCity(city);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredCity(null)}
              >
                {/* Outer glow ring */}
                <circle
                  r={markerRadius(city.count) + 2}
                  fill="rgba(96, 192, 240, 0.15)"
                  className="pulse-ring"
                />
                {/* Inner dot */}
                <circle
                  r={markerRadius(city.count)}
                  fill="var(--accent-primary, #60C0F0)"
                  fillOpacity={0.85}
                  stroke="var(--accent-secondary, #8B5CF6)"
                  strokeWidth={0.5}
                  style={{ cursor: 'pointer' }}
                />
                {/* Count label for large markers */}
                {city.count > 1 && markerRadius(city.count) >= 4 && (
                  <text
                    textAnchor="middle"
                    y={1.5}
                    style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: '4px',
                      fontWeight: 700,
                      fill: '#fff',
                      pointerEvents: 'none',
                    }}
                  >
                    {city.count}
                  </text>
                )}
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {hoveredCity && (
          <Tooltip style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}>
            <TooltipCity>{hoveredCity.city}</TooltipCity>
            <TooltipCountry>{hoveredCity.country}</TooltipCountry>
            <TooltipCount>{hoveredCity.count} visitor{hoveredCity.count !== 1 ? 's' : ''}</TooltipCount>
          </Tooltip>
        )}

        {/* Empty state */}
        {!loading && (!mapData?.byCity.length) && (
          <EmptyOverlay>
            <Globe size={32} />
            <span>No geo data yet — visitors will appear as they connect</span>
          </EmptyOverlay>
        )}
      </MapContainer>
    </MapWrapper>
  );
};

export default VisitorWorldMap;

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const pulse = keyframes`
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.6); }
  100% { opacity: 0.6; transform: scale(1); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const MapWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 16px;
  overflow: hidden;
`;

const MapHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.08));
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const GlobeIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

const MapTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const MapSubtitle = styled.p`
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224,236,244,0.4));
  margin: 2px 0 0;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 8px;
`;

const RefreshBtn = styled.button`
  width: 36px;
  height: 36px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: transparent;
  color: var(--text-muted, rgba(224,236,244,0.4));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms;

  &:hover {
    color: var(--accent-primary, #60C0F0);
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.06));
  overflow-x: auto;
  scrollbar-width: thin;

  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`;

const StatPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  white-space: nowrap;
  flex-shrink: 0;
  color: var(--text-muted, rgba(224,236,244,0.5));

  svg {
    flex-shrink: 0;
    color: var(--accent-primary, #60C0F0);
  }
`;

const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const StatLabel = styled.span`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224,236,244,0.4));
`;

const MapContainer = styled.div`
  position: relative;
  background: var(--bg-base, #0A0A0F);
  min-height: 280px;

  /* Pulse animation on marker glow rings */
  .pulse-ring {
    animation: ${pulse} 3s ease-in-out infinite;
    transform-origin: center;
  }

  /* SVG map styling */
  svg {
    display: block;
  }

  @media (max-width: 768px) {
    min-height: 200px;
  }
`;

const Tooltip = styled.div`
  position: fixed;
  z-index: 1000;
  padding: 8px 14px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(96, 192, 240, 0.15);
  pointer-events: none;
`;

const TooltipCity = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const TooltipCountry = styled.div`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224,236,244,0.5));
`;

const TooltipCount = styled.div`
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
  color: var(--accent-primary, #60C0F0);
  margin-top: 2px;
`;

const EmptyOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted, rgba(224,236,244,0.3));
  font-size: 0.85rem;

  svg {
    opacity: 0.4;
  }
`;
