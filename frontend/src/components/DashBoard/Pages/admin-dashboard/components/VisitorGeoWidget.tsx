/**
 * VisitorGeoWidget
 * ================
 * Shows where site visitors/users are logging in from (country + city).
 * Fetches from GET /api/dashboard/visitor-geo which does IP geo-lookup.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Globe, MapPin, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

const MIDNIGHT = '#002060';
const ICE_WING = '#60C0F0';
const WING_PURPLE = '#8B5CF6';
const GILDED = '#C6A84B';
const FROST = '#E0ECF4';

interface GeoVisitor {
  userId: number;
  name: string;
  role: string;
  lastActive: string;
  lastLogin: string;
  ip: string;
  country: string;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

interface CountryAgg {
  country: string;
  countryCode: string;
  count: number;
}

interface CityAgg {
  city: string;
  country: string;
  countryCode: string;
  count: number;
}

// Country flag emoji from 2-letter code
const countryFlag = (code: string | null) => {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
};

const VisitorGeoWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [byCountry, setByCountry] = useState<CountryAgg[]>([]);
  const [byCity, setByCity] = useState<CityAgg[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<GeoVisitor[]>([]);
  const [activeTab, setActiveTab] = useState<'countries' | 'cities' | 'recent'>('countries');

  const fetchGeo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/dashboard/visitor-geo');
      const data = res.data;
      if (data.success) {
        setTotalVisitors(data.totalVisitors);
        setByCountry(data.byCountry || []);
        setByCity(data.byCity || []);
        setRecentVisitors((data.visitors || []).slice(0, 15));
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchGeo();
  }, [fetchGeo]);

  const maxCount = byCountry[0]?.count || 1;

  return (
    <WidgetCard>
      <WidgetHeader>
        <HeaderLeft>
          <Globe size={20} color={ICE_WING} />
          <WidgetTitle>Visitor Geography</WidgetTitle>
          <VisitorBadge>{totalVisitors} active</VisitorBadge>
        </HeaderLeft>
        <RefreshBtn onClick={fetchGeo} disabled={loading} aria-label="Refresh geo data">
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </RefreshBtn>
      </WidgetHeader>

      <TabRow>
        <Tab $active={activeTab === 'countries'} onClick={() => setActiveTab('countries')}>
          Countries
        </Tab>
        <Tab $active={activeTab === 'cities'} onClick={() => setActiveTab('cities')}>
          Cities
        </Tab>
        <Tab $active={activeTab === 'recent'} onClick={() => setActiveTab('recent')}>
          Recent
        </Tab>
      </TabRow>

      {loading ? (
        <LoadingState>Loading visitor locations...</LoadingState>
      ) : (
        <ContentArea>
          {activeTab === 'countries' && (
            <GeoList>
              {byCountry.length === 0 && <EmptyState>No visitor data yet</EmptyState>}
              {byCountry.map((c, i) => (
                <GeoRow key={c.countryCode || i}>
                  <GeoFlag>{countryFlag(c.countryCode)}</GeoFlag>
                  <GeoName>{c.country}</GeoName>
                  <GeoBar>
                    <GeoBarFill style={{ width: `${(c.count / maxCount) * 100}%` }} />
                  </GeoBar>
                  <GeoCount>{c.count}</GeoCount>
                </GeoRow>
              ))}
            </GeoList>
          )}

          {activeTab === 'cities' && (
            <GeoList>
              {byCity.length === 0 && <EmptyState>No city data yet</EmptyState>}
              {byCity.map((c, i) => (
                <GeoRow key={`${c.city}-${c.country}-${i}`}>
                  <GeoIcon><MapPin size={14} /></GeoIcon>
                  <GeoName>
                    {c.city}
                    <CityCountry>{c.country}</CityCountry>
                  </GeoName>
                  <GeoCount>{c.count}</GeoCount>
                </GeoRow>
              ))}
            </GeoList>
          )}

          {activeTab === 'recent' && (
            <GeoList>
              {recentVisitors.length === 0 && <EmptyState>No recent visitors</EmptyState>}
              {recentVisitors.map((v) => (
                <RecentRow key={v.userId}>
                  <RecentInfo>
                    <RecentName>{v.name}</RecentName>
                    <RecentMeta>
                      {v.city && `${v.city}, `}{v.country || 'Unknown'}
                      {' '}&middot;{' '}
                      <RoleBadge $role={v.role}>{v.role}</RoleBadge>
                    </RecentMeta>
                  </RecentInfo>
                  <RecentTime>
                    {new Date(v.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </RecentTime>
                </RecentRow>
              ))}
            </GeoList>
          )}
        </ContentArea>
      )}
    </WidgetCard>
  );
};

// ── Styled Components ────────────────────────────────────────────────────

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const WidgetCard = styled.div`
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(139, 92, 246, 0.15);
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
`;

const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const WidgetTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${FROST};
  margin: 0;
`;

const VisitorBadge = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${ICE_WING};
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 20px;
  padding: 2px 10px;
`;

const RefreshBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(139, 92, 246, 0.15);
  color: rgba(224, 236, 244, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: ${WING_PURPLE};
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 3px;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 12px;
  min-height: 36px;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: ${p => p.$active ? FROST : 'rgba(224, 236, 244, 0.5)'};
  background: ${p => p.$active ? 'rgba(139, 92, 246, 0.2)' : 'transparent'};

  &:hover {
    color: ${FROST};
    background: ${p => p.$active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)'};
  }
`;

const ContentArea = styled.div`
  max-height: 320px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 4px;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: rgba(224, 236, 244, 0.4);
  font-size: 0.85rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: rgba(224, 236, 244, 0.3);
  font-size: 0.85rem;
`;

const GeoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const GeoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const GeoFlag = styled.span`
  font-size: 1.2rem;
  width: 28px;
  text-align: center;
`;

const GeoIcon = styled.span`
  width: 28px;
  text-align: center;
  color: rgba(224, 236, 244, 0.4);
`;

const GeoName = styled.span`
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${FROST};
`;

const CityCountry = styled.span`
  display: block;
  font-size: 0.7rem;
  font-weight: 400;
  color: rgba(224, 236, 244, 0.4);
`;

const GeoBar = styled.div`
  width: 80px;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
`;

const GeoBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${WING_PURPLE}, ${ICE_WING});
  border-radius: 3px;
  transition: width 0.5s ease;
`;

const GeoCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${ICE_WING};
  min-width: 28px;
  text-align: right;
`;

const RecentRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 10px;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const RecentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RecentName = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${FROST};
`;

const RecentMeta = styled.span`
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.4);
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RoleBadge = styled.span<{ $role: string }>`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: ${p =>
    p.$role === 'admin' ? 'rgba(198, 168, 75, 0.15)' :
    p.$role === 'trainer' ? 'rgba(139, 92, 246, 0.15)' :
    'rgba(96, 192, 240, 0.1)'
  };
  color: ${p =>
    p.$role === 'admin' ? GILDED :
    p.$role === 'trainer' ? WING_PURPLE :
    ICE_WING
  };
`;

const RecentTime = styled.span`
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.3);
  white-space: nowrap;
`;

export default VisitorGeoWidget;
