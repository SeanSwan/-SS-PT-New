/**
 * ┌─── SUB-COMPONENT: SwanGlobePanel ──────────────────────────┐
 * │ PARENT: AdminOverviewPanel (Telemetry band)                 │
 * │ PURPOSE: Visitor geography — a Three.js globe paired with a │
 * │          ranked, keyboard-navigable city table. (SWA-138    │
 * │          S12, direction D1 "Command Globe".)                │
 * │ WIREFRAME (desktop):                                        │
 * │ ┌──────────────────────────┬───────────────────────────┐   │
 * │ │      ◉ obsidian globe    │ Top cities                │   │
 * │ │   (drag to rotate;       │ ▸ City A · 42             │   │
 * │ │    hover = focus city)   │ ▸ City B · 17             │   │
 * │ └──────────────────────────┴───────────────────────────┘   │
 * │ Mobile / no-WebGL / reduced-motion: the table alone, and   │
 * │ the Three.js chunk is NEVER fetched (capability gate runs   │
 * │ BEFORE the dynamic import).                                 │
 * │ MOTION: strict M1 — no ambient loop, no auto-rotate; the    │
 * │ scene renders on demand (drag/hover/data) and parks.        │
 * │ Shell: WidgetShell — loading/error/empty distinct, 60s poll │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Globe2 } from 'lucide-react';
import { useAuth } from '../../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../../shell';
import { resolveGlobeCapability } from './swanGlobeCapability';
import type { GlobeCity } from './swanGlobeScene';

const SwanGlobe = lazy(() => import('./SwanGlobe'));

interface GeoPayload {
  cities: GlobeCity[];
  totalVisitors: number;
  uniqueCountries: number;
}

const Split = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 3fr) minmax(220px, 2fr);
  min-height: 340px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const TablePane = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 340px;
  overflow-y: auto;
`;

const PaneHeading = styled.h4`
  color: var(--text-muted, #94A3B8);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  margin: 0 0 8px;
  text-transform: uppercase;
`;

const CityList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const CityRow = styled.li`
  margin-bottom: 4px;
`;

const CityButton = styled.button<{ $focused: boolean }>`
  align-items: center;
  background: ${({ $focused }) => ($focused
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent)'
    : 'transparent')};
  border: 1px solid ${({ $focused }) => ($focused
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 40%, transparent)'
    : 'transparent')};
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  font-size: 0.82rem;
  gap: 10px;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 12px;
  text-align: left;
  width: 100%;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

const CityCount = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-weight: 600;
`;

const Fallback = styled.div`
  align-items: center;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 14px;
  color: var(--text-muted, #94A3B8);
  display: flex;
  font-size: 0.8rem;
  justify-content: center;
  min-height: 320px;
  padding: 16px;
  text-align: center;
`;

const SwanGlobePanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Capability is resolved ONCE, before any import decision (HY3 B2).
  const capability = useMemo(() => resolveGlobeCapability(), []);

  const fetchGeo = useCallback(async (): Promise<GeoPayload> => {
    const res = await authAxios.get('/api/admin/dashboard/visitor-geo');
    const payload = res.data?.data ?? res.data ?? {};
    const rows = Array.isArray(payload.byCity) ? payload.byCity : [];
    return {
      cities: rows
        .filter((c: any) => Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon)))
        .map((c: any) => ({
          city: String(c.city ?? 'Unknown'),
          country: String(c.country ?? ''),
          lat: Number(c.lat),
          lon: Number(c.lon),
          count: Number(c.count ?? 0),
        }))
        .sort((a: GlobeCity, b: GlobeCity) => b.count - a.count),
      totalVisitors: Number(payload.totalVisitors ?? 0),
      uniqueCountries: Number(payload.uniqueCountries ?? 0),
    };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<GeoPayload>(fetchGeo);

  const cities = data?.cities ?? [];
  const showGlobe = capability.enabled && !contextLost && cities.length > 0;

  const fallbackCopy = contextLost
    ? 'Globe unavailable (graphics context lost) — the ranked list holds the same data.'
    : capability.reason === 'coarse-pointer' || capability.reason === 'small-viewport'
      ? 'Ranked view on compact screens — the 3D globe loads on desktop only.'
      : capability.reason === 'reduced-motion'
        ? 'Static view honoring your reduced-motion setting.'
        : 'Ranked view — 3D globe unavailable on this device.';

  return (
    <WidgetShell
      title={data ? `Visitor Geography (${data.uniqueCountries} countries)` : 'Visitor Geography'}
      icon={<Globe2 size={20} />}
      loading={loading}
      error={error ? 'Visitor geography unavailable' : null}
      empty={cities.length === 0}
      emptyMessage="No visitor geography recorded yet"
      hasData={data !== null && cities.length > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
      skeletonCount={5}
    >
      <Split>
        {showGlobe ? (
          <Suspense fallback={<Fallback>Loading globe…</Fallback>}>
            <SwanGlobe
              cities={cities}
              focusedIndex={focusedIndex}
              onHoverIndex={setFocusedIndex}
              onContextLost={() => setContextLost(true)}
            />
          </Suspense>
        ) : (
          <Fallback>{fallbackCopy}</Fallback>
        )}
        <TablePane>
          <PaneHeading>Top cities by visitors</PaneHeading>
          <CityList>
            {cities.slice(0, 12).map((city, index) => (
              <CityRow key={`${city.city}-${city.country}-${index}`}>
                <CityButton
                  type="button"
                  $focused={focusedIndex === index}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  onMouseLeave={() => setFocusedIndex(null)}
                >
                  <span>{city.city}{city.country ? `, ${city.country}` : ''}</span>
                  <CityCount>{city.count}</CityCount>
                </CityButton>
              </CityRow>
            ))}
          </CityList>
        </TablePane>
      </Split>
    </WidgetShell>
  );
};

export default SwanGlobePanel;
