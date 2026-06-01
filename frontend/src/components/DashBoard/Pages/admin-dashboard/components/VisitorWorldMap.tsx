/**
 * VisitorWorldMap
 *
 * Active surface: AdminOverviewPanel full-width visitor intelligence bento.
 * Data comes from mounted admin dashboard visitor geo/history endpoints.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { Eye, Globe, MapPin, Minus, Plus, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  EmptyOverlay,
  ErrorOverlay,
  GlobeIcon,
  HeaderLeft,
  HeaderRight,
  InlineNotice,
  MapContainer,
  MapHeader,
  MapSubtitle,
  MapTitle,
  MapWrapper,
  RefreshBtn,
  StatLabel,
  StatPill,
  StatsBar,
  StatValue,
  Tooltip,
  TooltipCity,
  TooltipCount,
  TooltipCountry,
  ZoomBtn,
  ZoomControls,
} from './VisitorWorldMap.styles';

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

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
const US_STATES_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const VisitorWorldMap: React.FC = () => {
  const { authAxios } = useAuth();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [allTimeTotal, setAllTimeTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<CityPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 20]);

  const handleZoomIn = useCallback(() => setZoom((value) => Math.min(value * 1.5, 8)), []);
  const handleZoomOut = useCallback(() => setZoom((value) => Math.max(value / 1.5, 1)), []);

  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setHistoryError(null);
      const [geoRes, historyRes] = await Promise.allSettled([
        authAxios.get('/api/admin/dashboard/visitor-geo'),
        authAxios.get('/api/admin/dashboard/visitor-history', { params: { page: 1, limit: 1 } }),
      ]);

      const geoOk = geoRes.status === 'fulfilled' && geoRes.value.data?.success;
      const historyOk = historyRes.status === 'fulfilled' && historyRes.value.data?.success;

      if (geoOk) {
        const d = geoRes.value.data;
        setMapData({
          totalVisitors: d.totalVisitors ?? 0,
          uniqueCountries: d.uniqueCountries ?? 0,
          uniqueCities: d.uniqueCities ?? 0,
          byCity: (d.byCity ?? []).filter((c: CityPoint) => c.lat != null && c.lon != null),
        });
      } else {
        console.error('Failed to fetch map visitor geo:', geoRes);
        setMapData(null);
        setLoadError('Map data unavailable');
      }

      if (historyOk) {
        setAllTimeTotal(historyRes.value.data.total ?? 0);
      } else {
        console.warn('Failed to fetch all-time visitor count:', historyRes);
        setHistoryError('All-time visitor count unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch map visitor data:', err);
      setMapData(null);
      setLoadError('Map data unavailable');
      setHistoryError('All-time visitor count unavailable');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  const maxCount = useMemo(() => {
    if (!mapData?.byCity.length) return 1;
    return Math.max(...mapData.byCity.map((city) => city.count));
  }, [mapData]);

  const markerRadius = (count: number) => {
    const min = 1;
    const max = 4;
    return min + ((count / maxCount) * (max - min));
  };

  return (
    <MapWrapper>
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

      <StatsBar>
        <StatPill><Eye size={14} /><StatValue>{allTimeTotal.toLocaleString()}</StatValue><StatLabel>All-Time Visitors</StatLabel></StatPill>
        <StatPill><Users size={14} /><StatValue>{mapData?.totalVisitors ?? 0}</StatValue><StatLabel>Tracked Users</StatLabel></StatPill>
        <StatPill><Globe size={14} /><StatValue>{mapData?.uniqueCountries ?? 0}</StatValue><StatLabel>Countries</StatLabel></StatPill>
        <StatPill><MapPin size={14} /><StatValue>{mapData?.uniqueCities ?? 0}</StatValue><StatLabel>Cities</StatLabel></StatPill>
      </StatsBar>
      {historyError && <InlineNotice role="status">{historyError}</InlineNotice>}

      <MapContainer>
        <ComposableMap
          className="visitor-map-svg"
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          width={800}
          height={400}
        >
          <ZoomableGroup
            center={center}
            zoom={zoom}
            onMoveEnd={({ coordinates, zoom: nextZoom }) => {
              setCenter(coordinates);
              setZoom(nextZoom);
            }}
            filterZoomEvent={(evt) => !(('type' in evt) && (evt as unknown as Event).type === 'wheel')}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) => geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} className="country-geography" />
              ))}
            </Geographies>
            <Geographies geography={US_STATES_URL}>
              {({ geographies }) => geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} className="state-geography" />
              ))}
            </Geographies>
            {mapData?.byCity.map((city, index) => (
              <Marker
                key={`${city.city}-${city.country}-${index}`}
                coordinates={[city.lon, city.lat]}
                onMouseEnter={(event: React.MouseEvent<SVGGElement>) => {
                  setHoveredCity(city);
                  setTooltipPos({ x: event.clientX, y: event.clientY });
                }}
                onMouseLeave={() => setHoveredCity(null)}
              >
                <circle r={markerRadius(city.count) + 1} className="marker-glow" />
                <circle r={markerRadius(city.count)} className="marker-dot" />
                {city.count > 1 && markerRadius(city.count) >= 3.2 && (
                  <text textAnchor="middle" y={1.5} className="marker-count-label">
                    {city.count}
                  </text>
                )}
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {hoveredCity && (
          <Tooltip $left={tooltipPos.x + 12} $top={tooltipPos.y - 40}>
            <TooltipCity>{hoveredCity.city}</TooltipCity>
            <TooltipCountry>{hoveredCity.country}</TooltipCountry>
            <TooltipCount>{hoveredCity.count} visitor{hoveredCity.count !== 1 ? 's' : ''}</TooltipCount>
          </Tooltip>
        )}

        <ZoomControls>
          <ZoomBtn onClick={handleZoomIn} aria-label="Zoom in" title="Zoom in"><Plus size={16} /></ZoomBtn>
          <ZoomBtn onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out" disabled={zoom <= 1}>
            <Minus size={16} />
          </ZoomBtn>
        </ZoomControls>

        {loadError && (
          <ErrorOverlay role="alert">
            <Globe size={32} />
            <span>Map data unavailable. Refresh before treating geo traffic as empty.</span>
          </ErrorOverlay>
        )}
        {!loadError && !loading && !mapData?.byCity.length && (
          <EmptyOverlay>
            <Globe size={32} />
            <span>No geo data yet - visitors will appear as they connect</span>
          </EmptyOverlay>
        )}
      </MapContainer>
    </MapWrapper>
  );
};

export default VisitorWorldMap;
