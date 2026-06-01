import React from 'react';
import { Activity, ChevronRight, Clock, Eye, FileText, Globe, MapPin, Maximize2, RefreshCw, TrendingUp, Users } from 'lucide-react';
import {
  VISITOR_TABS,
  anonVisitorKey,
  cityAggKey,
  countryAggKey,
  countryFlag,
  geoVisitorKey,
  pageName,
  timeAgo,
} from './VisitorGeoWidget.logic';
import {
  BarBg,
  CityCountry,
  ContentArea,
  EmptyState,
  ErrorState,
  GeoCount,
  GeoFlag,
  GeoList,
  GeoName,
  GeoRow,
  Header,
  HeaderLeft,
  HeaderStats,
  HeaderTitle,
  IconButton,
  LiveDot,
  LiveDotSmall,
  LiveInfo,
  LiveLocation,
  LiveMeta,
  LivePages,
  LiveRegion,
  LiveRow,
  LiveTime,
  LoadingState,
  MutedChevron,
  PageRank,
  PageViews,
  RecentInfo,
  RecentMeta,
  RecentName,
  RecentRight,
  RecentRow,
  RecentTime,
  SourceBadge,
  SourceBar,
  SourceChip,
  StatChip,
  StatLabel,
  StatValue,
  Tab,
  TabRow,
  TotalRow
} from './VisitorGeoWidget.styles';
import type { AnonData, AnonVisitor, GeoData, GeoVisitor, SelectedVisitor, TabKey } from './VisitorGeoWidget.types';

interface HeaderProps {
  anonData: AnonData | null;
  geoData: GeoData | null;
  loading: boolean;
  onRefresh: () => void;
  onViewAll: () => void;
}

export const VisitorWidgetHeader: React.FC<HeaderProps> = ({ anonData, geoData, loading, onRefresh, onViewAll }) => (
  <Header>
    <HeaderLeft>
      <LiveDot />
      <HeaderTitle><Globe size={18} />Visitor Intelligence</HeaderTitle>
    </HeaderLeft>
    <HeaderStats>
      <StatChip><Activity size={14} /><StatValue>{anonData?.activeNow || 0}</StatValue><StatLabel>Live Now</StatLabel></StatChip>
      <StatChip><Clock size={14} /><StatValue>{anonData?.lastHour || 0}</StatValue><StatLabel>Last Hour</StatLabel></StatChip>
      <StatChip><Users size={14} /><StatValue>{geoData?.totalVisitors || 0}</StatValue><StatLabel>Users</StatLabel></StatChip>
      <StatChip><Eye size={14} /><StatValue>{anonData?.last24h || 0}</StatValue><StatLabel>24h Visitors</StatLabel></StatChip>
      <IconButton onClick={onRefresh} disabled={loading} aria-label="Refresh visitor data">
        <RefreshCw size={14} className={loading ? 'spinning' : ''} />
      </IconButton>
      <IconButton onClick={onViewAll} aria-label="View all visitors">
        <Maximize2 size={14} />View All
      </IconButton>
    </HeaderStats>
  </Header>
);

export const VisitorSourceBar: React.FC<{ anonData: AnonData | null; geoData: GeoData | null }> = ({ anonData, geoData }) => (
  <SourceBar>
    <SourceChip $variant="login">{geoData?.loginVisitors || 0} Logged In</SourceChip>
    <SourceChip $variant="gallery">{geoData?.galleryVisitors || 0} Gallery</SourceChip>
    <SourceChip $variant="anonymous">{anonData?.last24h || 0} Anonymous</SourceChip>
    <SourceChip $variant="stat">{geoData?.uniqueCountries || 0} Countries</SourceChip>
    <SourceChip $variant="stat">{geoData?.uniqueCities || 0} Cities</SourceChip>
  </SourceBar>
);

export const VisitorTabs: React.FC<{ activeTab: TabKey; onChange: (tab: TabKey) => void }> = ({ activeTab, onChange }) => (
  <TabRow role="tablist" aria-label="Visitor data views">
    {VISITOR_TABS.map(tab => (
      <Tab key={tab.key} role="tab" aria-selected={activeTab === tab.key} $active={activeTab === tab.key} onClick={() => onChange(tab.key)}>
        {tab.key === 'live' && <Activity size={14} />}
        {tab.key === 'countries' && <Globe size={14} />}
        {tab.key === 'cities' && <MapPin size={14} />}
        {tab.key === 'pages' && <FileText size={14} />}
        {tab.key === 'recent' && <Users size={14} />}
        {tab.label}
      </Tab>
    ))}
  </TabRow>
);

interface ContentProps {
  activeTab: TabKey;
  loading: boolean;
  loadError: string | null;
  anonData: AnonData | null;
  geoData: GeoData | null;
  onSelectVisitor: (visitor: SelectedVisitor) => void;
}

export const VisitorContent: React.FC<ContentProps> = ({ activeTab, loading, loadError, anonData, geoData, onSelectVisitor }) => {
  if (loading && !geoData && !anonData) return <LoadingState>Loading visitor intelligence...</LoadingState>;
  if (loadError) {
    return <ContentArea><ErrorState role="alert"><Activity size={32} /><span>Visitor data unavailable. Refresh before assuming traffic is empty.</span></ErrorState></ContentArea>;
  }

  const countries = geoData?.byCountry || [];
  const cities = geoData?.byCity || [];
  const maxCountry = countries[0]?.count || 1;
  const maxCity = cities[0]?.count || 1;

  return (
    <ContentArea key={activeTab}>
      {activeTab === 'live' && <LiveFeed anonVisitors={anonData?.recentVisitors || []} geoVisitors={geoData?.visitors || []} onSelectVisitor={onSelectVisitor} />}
      {activeTab === 'countries' && <CountryList countries={countries} maxCountry={maxCountry} />}
      {activeTab === 'cities' && <CityList cities={cities} maxCity={maxCity} />}
      {activeTab === 'pages' && <TopPages anonData={anonData} />}
      {activeTab === 'recent' && <RecentUsers geoData={geoData} />}
    </ContentArea>
  );
};

const LiveFeed: React.FC<{ anonVisitors: AnonVisitor[]; geoVisitors: GeoVisitor[]; onSelectVisitor: (visitor: SelectedVisitor) => void }> = ({ anonVisitors, geoVisitors, onSelectVisitor }) => (
  <GeoList>
    {anonVisitors.length === 0 && geoVisitors.length === 0 && <EmptyState><Eye size={32} /><span>Visitor tracking is active. Data will appear as people visit your site.</span></EmptyState>}
    {anonVisitors.map((visitor) => (
      <LiveRow key={anonVisitorKey(visitor)} type="button" onClick={() => onSelectVisitor(visitor)} $clickable>
        <LiveDotSmall $recent={Date.now() - new Date(visitor.lastSeen).getTime() < 300000} />
        <LiveInfo>
          <LiveLocation>{countryFlag(visitor.countryCode)} {visitor.city || visitor.country || 'Unknown'}{visitor.region && visitor.city && <LiveRegion>, {visitor.region}</LiveRegion>}</LiveLocation>
          <LivePages>{visitor.pages.slice(-3).map(pageName).join(' -> ')}{visitor.pageCount > 3 && <span> (+{visitor.pageCount - 3} more)</span>}</LivePages>
        </LiveInfo>
        <LiveMeta><SourceBadge $variant="anonymous">anon</SourceBadge><LiveTime>{timeAgo(visitor.lastSeen)}</LiveTime></LiveMeta>
        <MutedChevron><ChevronRight size={14} /></MutedChevron>
      </LiveRow>
    ))}
    {geoVisitors.slice(0, 10).map((visitor) => (
      <LiveRow key={geoVisitorKey(visitor)} type="button" onClick={() => onSelectVisitor(visitor)} $clickable>
        <LiveDotSmall $recent={Date.now() - new Date(visitor.lastActive).getTime() < 300000} />
        <LiveInfo><LiveLocation>{countryFlag(visitor.countryCode)} {visitor.name}</LiveLocation><LivePages>{visitor.city && `${visitor.city}, `}{visitor.country || 'Unknown'}</LivePages></LiveInfo>
        <LiveMeta><SourceBadge $variant={visitor.source === 'gallery' ? 'gallery' : 'login'}>{visitor.role === 'gallery_visitor' ? 'gallery' : visitor.role}</SourceBadge><LiveTime>{timeAgo(visitor.lastActive)}</LiveTime></LiveMeta>
        <MutedChevron><ChevronRight size={14} /></MutedChevron>
      </LiveRow>
    ))}
  </GeoList>
);

const CountryList: React.FC<{ countries: GeoData['byCountry']; maxCountry: number }> = ({ countries, maxCountry }) => (
  <GeoList>
    {countries.length === 0 && <EmptyState><Globe size={32} /><span>No country data yet</span></EmptyState>}
    {countries.map((country) => <GeoRow key={countryAggKey(country)}><BarBg $pct={(country.count / maxCountry) * 100} /><GeoFlag>{countryFlag(country.countryCode)}</GeoFlag><GeoName>{country.country}</GeoName><GeoCount>{country.count}</GeoCount></GeoRow>)}
  </GeoList>
);

const CityList: React.FC<{ cities: GeoData['byCity']; maxCity: number }> = ({ cities, maxCity }) => (
  <GeoList>
    {cities.length === 0 && <EmptyState><MapPin size={32} /><span>No city data yet</span></EmptyState>}
    {cities.map((city) => <GeoRow key={cityAggKey(city)}><BarBg $pct={(city.count / maxCity) * 100} /><GeoFlag>{countryFlag(city.countryCode)}</GeoFlag><GeoName>{city.city}<CityCountry>{city.country}</CityCountry></GeoName><GeoCount>{city.count}</GeoCount></GeoRow>)}
  </GeoList>
);

const TopPages: React.FC<{ anonData: AnonData | null }> = ({ anonData }) => (
  <GeoList>
    {!anonData?.topPages?.length && <EmptyState><FileText size={32} /><span>Page view data will appear as visitors browse your site</span></EmptyState>}
    {anonData?.topPages?.map((page, index) => <GeoRow key={page.page}><BarBg $pct={(page.views / (anonData.topPages[0]?.views || 1)) * 100} /><PageRank>#{index + 1}</PageRank><GeoName>{pageName(page.page)}</GeoName><PageViews><TrendingUp size={12} />{page.views}</PageViews></GeoRow>)}
    {anonData?.totalPageViews ? <TotalRow>Total Page Views (24h): <strong>{anonData.totalPageViews}</strong></TotalRow> : null}
  </GeoList>
);

const RecentUsers: React.FC<{ geoData: GeoData | null }> = ({ geoData }) => (
  <GeoList>
    {!geoData?.visitors?.length && <EmptyState><Users size={32} /><span>No user visitor data yet</span></EmptyState>}
    {geoData?.visitors?.map(visitor => <RecentRow key={geoVisitorKey(visitor)}><RecentInfo><RecentName>{visitor.name}</RecentName><RecentMeta>{countryFlag(visitor.countryCode)} {visitor.city && `${visitor.city}, `}{visitor.country || 'Unknown'}</RecentMeta></RecentInfo><RecentRight><SourceBadge $variant={visitor.source === 'gallery' ? 'gallery' : 'login'}>{visitor.role === 'gallery_visitor' ? 'gallery' : visitor.role}</SourceBadge><RecentTime>{timeAgo(visitor.lastActive)}</RecentTime></RecentRight></RecentRow>)}
  </GeoList>
);
