/**
 * ┌─── SUB-COMPONENT: FarmFinderTab ───────────────────────────┐
 * │ PARENT: NutritionWorkspace                                  │
 * │ PURPOSE: USDA Farmers Market Directory search with map      │
 * │ API: GET /api/farms/search?zip= (USDA proxy, auth-gated)    │
 * │      GET /api/farms/detail/:id                              │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { MapPin, Search, Store, Clock, ShoppingBasket, ExternalLink, Loader2 } from 'lucide-react';
import {
  Container, HeaderRow, HeaderIcon, Title, Subtitle,
  SearchRow, ZipInput, SearchBtn, ErrorMsg, InfoMsg,
  MapWrapper, ResultCount, MarketList,
  MarketCardWrapper, MarketCardTrigger, MarketHeader, MarketName, DistBadge,
  LoadingRow, MarketDetails, DetailItem, DirectionsLink, Attribution,
} from './FarmFinderTab.styles';
import apiService from '../../services/api.service';

const FARM_SEARCH_ERROR = 'Farmers market search is unavailable right now. Please try again.';
const FARM_DETAILS_ERROR = 'Could not load market details. Please try again.';

// ── Types ──────────────────────────────────────────────────────
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

// ── Lazy-load Leaflet (heavy library, not needed on initial render) ──
let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;
let leafletLoaded = false;

async function loadLeaflet() {
  if (leafletLoaded) return;
  const [L, RL] = await Promise.all([import('leaflet'), import('react-leaflet')]);
  await import('leaflet/dist/leaflet.css');

  // Fix default marker icons — import from node_modules, not unpkg CDN
  const { default: markerIcon2x } = await import('leaflet/dist/images/marker-icon-2x.png');
  const { default: markerIcon } = await import('leaflet/dist/images/marker-icon.png');
  const { default: markerShadow } = await import('leaflet/dist/images/marker-shadow.png');
  delete (L.default.Icon.Default.prototype as any)._getIconUrl;
  L.default.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  Popup = RL.Popup;
  leafletLoaded = true;
}

// ── Component ──────────────────────────────────────────────────
const FarmFinderTab: React.FC = () => {
  const [zipCode, setZipCode] = useState('');
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [details, setDetails] = useState<Record<string, MarketDetail>>({});
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { loadLeaflet().then(() => setMapReady(true)); }, []);

  const searchMarkets = useCallback(async () => {
    if (!/^\d{5}$/.test(zipCode)) { setError('Enter a valid 5-digit US zip code'); return; }
    setLoading(true);
    setError(null);
    setMarkets([]);
    setDetails({});
    setSelectedMarket(null);
    try {
      const response = await apiService.get(`/api/farms/search?zip=${zipCode}`);
      const data = response.data;
      if (!data.success) {
        if (data.apiDown) {
          setError('Farmers market data is temporarily unavailable. Please try again later.');
        } else {
          setError(FARM_SEARCH_ERROR);
        }
        return;
      }
      setMarkets(data.markets);
      if (data.markets.length === 0) setError('No farmers markets found near this zip code');
    } catch {
      setError(FARM_SEARCH_ERROR);
    } finally {
      setLoading(false);
    }
  }, [zipCode]);

  const loadDetail = useCallback(async (marketId: string) => {
    setDetailError(null);
    if (details[marketId]) {
      setSelectedMarket(selectedMarket === marketId ? null : marketId);
      return;
    }
    setDetailLoading(marketId);
    setSelectedMarket(marketId);
    try {
      const response = await apiService.get(`/api/farms/detail/${marketId}`);
      const data = response.data;
      if (data.success && data.market) {
        setDetails(prev => ({ ...prev, [marketId]: data.market }));
      } else {
        setDetailError(FARM_DETAILS_ERROR);
      }
    } catch {
      setDetailError(FARM_DETAILS_ERROR);
    } finally {
      setDetailLoading(null);
    }
  }, [details, selectedMarket]);

  const mapMarkers = useMemo(() =>
    Object.entries(details)
      .filter(([, d]) => d.lat && d.lng)
      .map(([id, d]) => ({ id, lat: d.lat!, lng: d.lng!, name: markets.find(m => m.id === id)?.name || 'Market' })),
    [details, markets],
  );

  const mapCenter = useMemo<[number, number]>(() =>
    mapMarkers.length > 0 ? [mapMarkers[0].lat, mapMarkers[0].lng] : [39.8, -98.5],
    [mapMarkers],
  );

  return (
    <Container>
      <HeaderRow>
        <HeaderIcon><Store size={24} /></HeaderIcon>
        <div>
          <Title>Local Farm Finder</Title>
          <Subtitle>Find farmers markets and local farms near you</Subtitle>
        </div>
      </HeaderRow>

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
      {detailError && <InfoMsg>{detailError}</InfoMsg>}

      {mapReady && mapMarkers.length > 0 && MapContainer && (
        <MapWrapper>
          <MapContainer center={mapCenter} zoom={10} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
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

      {markets.length > 0 && (
        <>
          <ResultCount>{markets.length} market{markets.length !== 1 ? 's' : ''} found</ResultCount>
          <MarketList>
            {markets.map(market => (
              // Wrapper div carries card chrome; trigger button handles expand/collapse.
              // Detail content (anchor) lives in a sibling div — no interactive nesting.
              <MarketCardWrapper key={market.id} $selected={selectedMarket === market.id}>
                <MarketCardTrigger
                  type="button"
                  aria-expanded={selectedMarket === market.id}
                  aria-label={`${market.name}${market.distanceMiles != null ? ` — ${market.distanceMiles.toFixed(1)} miles away` : ''}, tap to ${selectedMarket === market.id ? 'collapse' : 'expand'}`}
                  onClick={() => loadDetail(market.id)}
                >
                  <MarketHeader>
                    <MapPin size={16} style={{ color: 'var(--accent-primary, #60C0F0)', flexShrink: 0 }} />
                    <MarketName>{market.name}</MarketName>
                    {market.distanceMiles != null && (
                      <DistBadge>{market.distanceMiles.toFixed(1)} mi</DistBadge>
                    )}
                  </MarketHeader>
                </MarketCardTrigger>

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
                        aria-label={`Get directions to ${market.name} (opens in new tab)`}
                      >
                        <ExternalLink size={13} /> Get Directions
                      </DirectionsLink>
                    )}
                  </MarketDetails>
                )}
              </MarketCardWrapper>
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
