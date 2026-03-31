/**
 * ┌─── SUB-COMPONENT: FarmFinderTab ───────────────────────────┐
 * │ PARENT: NutritionWorkspace                                  │
 * │ PURPOSE: USDA Farmers Market Directory search with map      │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────┐                    │
 * │ │ [Zip Input] [Search]                 │                    │
 * │ ├──────────────────────────────────────┤                    │
 * │ │ ┌────────────────────────────────┐   │                    │
 * │ │ │      Leaflet Map               │   │                    │
 * │ │ │   [pins for markets]           │   │                    │
 * │ │ └────────────────────────────────┘   │                    │
 * │ ├──────────────────────────────────────┤                    │
 * │ │ Market Name — 2.3 mi                │                    │
 * │ │ Address, Schedule, Products          │                    │
 * │ └──────────────────────────────────────┘                    │
 * │ Props: none (self-contained)                                │
 * │ API: GET /api/farms/search, GET /api/farms/detail/:id       │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { MapPin, Search, Store, Clock, ShoppingBasket, ExternalLink, Loader2 } from 'lucide-react';

// ── Types ──
interface MarketSummary {
  id: string;
  name: string;
  distanceMiles: number | null;
}

interface MarketDetail {
  address: string;
  schedule: string;
  products: string;
  googleLink: string;
  lat: number | null;
  lng: number | null;
}

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ── Lazy-load Leaflet (heavy library) ──
let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;
let leafletLoaded = false;

async function loadLeaflet() {
  if (leafletLoaded) return;
  const L = await import('leaflet');
  const RL = await import('react-leaflet');
  await import('leaflet/dist/leaflet.css');

  // Fix default marker icons (Webpack/Vite strips them)
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  Popup = RL.Popup;
  leafletLoaded = true;
}

// ── Component ──
const FarmFinderTab: React.FC = () => {
  const [zipCode, setZipCode] = useState('');
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [details, setDetails] = useState<Record<string, MarketDetail>>({});
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Pre-load leaflet on mount
  useEffect(() => {
    loadLeaflet().then(() => setMapReady(true));
  }, []);

  const searchMarkets = useCallback(async () => {
    if (!/^\d{5}$/.test(zipCode)) {
      setError('Enter a valid 5-digit US zip code');
      return;
    }

    setLoading(true);
    setError(null);
    setMarkets([]);
    setDetails({});
    setSelectedMarket(null);

    try {
      const res = await fetch(`${API_BASE}/api/farms/search?zip=${zipCode}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Search failed');
        return;
      }

      setMarkets(data.markets);

      if (data.markets.length === 0) {
        setError('No farmers markets found near this zip code');
      }
    } catch {
      setError('Failed to search. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [zipCode]);

  const loadDetail = useCallback(async (marketId: string) => {
    if (details[marketId]) {
      setSelectedMarket(selectedMarket === marketId ? null : marketId);
      return;
    }

    setDetailLoading(marketId);
    setSelectedMarket(marketId);

    try {
      const res = await fetch(`${API_BASE}/api/farms/detail/${marketId}`);
      const data = await res.json();

      if (data.success && data.market) {
        setDetails(prev => ({ ...prev, [marketId]: data.market }));
      }
    } catch { /* silent */ }
    finally {
      setDetailLoading(null);
    }
  }, [details, selectedMarket]);

  // Gather map markers from loaded details
  const mapMarkers = useMemo(() => {
    return Object.entries(details)
      .filter(([, d]) => d.lat && d.lng)
      .map(([id, d]) => ({
        id,
        lat: d.lat!,
        lng: d.lng!,
        name: markets.find(m => m.id === id)?.name || 'Market',
      }));
  }, [details, markets]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (mapMarkers.length > 0) return [mapMarkers[0].lat, mapMarkers[0].lng];
    return [39.8, -98.5]; // Center of US
  }, [mapMarkers]);

  return (
    <Container>
      {/* Header */}
      <HeaderRow>
        <HeaderIcon><Store size={24} /></HeaderIcon>
        <div>
          <Title>Local Farm Finder</Title>
          <Subtitle>Find farmers markets and local farms near you</Subtitle>
        </div>
      </HeaderRow>

      {/* Search */}
      <SearchRow>
        <ZipInput
          type="text"
          inputMode="numeric"
          placeholder="Enter zip code"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          onKeyDown={(e) => e.key === 'Enter' && searchMarkets()}
        />
        <SearchBtn onClick={searchMarkets} disabled={loading || zipCode.length !== 5}>
          {loading ? <Loader2 size={16} className="spin" /> : <><Search size={16} /> Find Markets</>}
        </SearchBtn>
      </SearchRow>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {/* Map */}
      {mapReady && mapMarkers.length > 0 && MapContainer && (
        <MapWrapper>
          <MapContainer
            center={mapCenter}
            zoom={10}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />
            {mapMarkers.map(m => (
              <Marker key={m.id} position={[m.lat, m.lng]}>
                <Popup>{m.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </MapWrapper>
      )}

      {/* Market List */}
      {markets.length > 0 && (
        <>
          <ResultCount>{markets.length} market{markets.length !== 1 ? 's' : ''} found</ResultCount>
          <MarketList>
            {markets.map(market => (
              <MarketCard
                key={market.id}
                $selected={selectedMarket === market.id}
                onClick={() => loadDetail(market.id)}
              >
                <MarketHeader>
                  <MapPin size={16} style={{ color: 'var(--accent-primary, #60C0F0)', flexShrink: 0 }} />
                  <MarketName>{market.name}</MarketName>
                  {market.distanceMiles != null && (
                    <DistBadge>{market.distanceMiles.toFixed(1)} mi</DistBadge>
                  )}
                </MarketHeader>

                {detailLoading === market.id && (
                  <LoadingRow><Loader2 size={14} /> Loading details...</LoadingRow>
                )}

                {details[market.id] && selectedMarket === market.id && (
                  <MarketDetails>
                    {details[market.id].address && (
                      <DetailItem><MapPin size={13} />{details[market.id].address}</DetailItem>
                    )}
                    {details[market.id].schedule && (
                      <DetailItem><Clock size={13} />{details[market.id].schedule}</DetailItem>
                    )}
                    {details[market.id].products && (
                      <DetailItem><ShoppingBasket size={13} />{details[market.id].products}</DetailItem>
                    )}
                    {details[market.id].googleLink && (
                      <DirectionsLink
                        href={details[market.id].googleLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={13} /> Get Directions
                      </DirectionsLink>
                    )}
                  </MarketDetails>
                )}
              </MarketCard>
            ))}
          </MarketList>
        </>
      )}

      <Attribution>
        Data from USDA Farmers Market Directory. Map tiles by CartoDB/OpenStreetMap.
      </Attribution>
    </Container>
  );
};

export default FarmFinderTab;

// ── Styled Components ──
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(96, 192, 240, 0.15), rgba(139, 92, 246, 0.1));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const Subtitle = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

const SearchRow = styled.div`
  display: flex;
  gap: 8px;
`;

const ZipInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-size: 15px;
  min-height: 44px;
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.4)); }
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

const SearchBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: white;
  font-weight: 600;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;
  white-space: nowrap;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.1); }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const ErrorMsg = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(201, 42, 84, 0.1);
  border-left: 3px solid #C92A54;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
`;

const MapWrapper = styled.div`
  height: 280px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));

  @media (max-width: 768px) {
    height: 220px;
  }
`;

const ResultCount = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MarketList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MarketCard = styled.div<{ $selected: boolean }>`
  border-radius: 12px;
  border: 1px solid ${(p) => p.$selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'
    : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  background: ${(p) => p.$selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, var(--bg-surface, #1A1A24))'
    : 'var(--bg-surface, #1A1A24)'};
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover { border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent); }
`;

const MarketHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
`;

const MarketName = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const DistBadge = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 14px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const MarketDetails = styled.div`
  padding: 0 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  padding-top: 12px;
`;

const DetailItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  line-height: 1.4;
  svg { color: var(--accent-primary, #60C0F0); flex-shrink: 0; margin-top: 2px; }
`;

const DirectionsLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  width: fit-content;
  min-height: 44px;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent); }
`;

const Attribution = styled.div`
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  text-align: center;
  padding-top: 8px;
`;
