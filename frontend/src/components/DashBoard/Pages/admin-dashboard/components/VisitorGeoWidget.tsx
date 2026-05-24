/**
 * VisitorGeoWidget — Enhanced Analytics & Geography Hub
 * =====================================================
 * Combines 3 data sources into a premium mission-control widget:
 *   1. Logged-in users (lastLoginIP from users table)
 *   2. Gallery visitors (geo from gallery_visitors table)
 *   3. Anonymous page views (real-time in-memory tracking)
 *
 * Design: Gemini 3.1 Pro (Lead Design Authority) — Crystalline Swan theme
 * Implementation: Claude Opus 4.6
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Globe, MapPin, RefreshCw, Users, Eye, Clock, Activity, TrendingUp, FileText, Maximize2, X, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../../../context/AuthContext';

// ── Crystalline Swan Tokens ──
const MIDNIGHT = '#002060';
const ICE_WING = '#60C0F0';
const WING_PURPLE = '#8B5CF6';
const GILDED = '#C6A84B';
const FROST = '#E0ECF4';

// ── Types ──
interface GeoVisitor {
  userId: number | null;
  name: string;
  role: string;
  source: 'login' | 'gallery';
  lastActive: string;
  lastLogin: string;
  ip: string;
  country: string;
  countryCode: string | null;
  region: string | null;
  city: string | null;
}

interface CountryAgg { country: string; countryCode: string; count: number; }
interface CityAgg { city: string; country: string; countryCode: string; count: number; }
interface TopPage { page: string; views: number; }

interface AnonVisitor {
  ip: string;
  country: string;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  pages: string[];
  pageCount: number;
  firstSeen: string;
  lastSeen: string;
  referrer: string | null;
}

interface AnonData {
  activeNow: number;
  lastHour: number;
  last24h: number;
  totalPageViews: number;
  topPages: TopPage[];
  byCountry: CountryAgg[];
  recentVisitors: AnonVisitor[];
}

interface GeoData {
  totalVisitors: number;
  loginVisitors: number;
  galleryVisitors: number;
  uniqueCountries: number;
  uniqueCities: number;
  visitors: GeoVisitor[];
  byCountry: CountryAgg[];
  byCity: CityAgg[];
}

// Country flag emoji from 2-letter code
const countryFlag = (code: string | null) => {
  if (!code || code.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
};

// Relative time formatter
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// Friendly page name
const pageName = (path: string) => {
  const map: Record<string, string> = {
    '/': 'Homepage',
    '/store': 'Store',
    '/gallery': 'Gallery',
    '/about': 'About',
    '/contact': 'Contact',
    '/login': 'Login',
    '/signup': 'Sign Up',
    '/waiver': 'Waiver',
    '/video-library': 'Video Library',
    '/dashboard': 'Dashboard',
  };
  if (map[path]) return map[path];
  if (path.startsWith('/gallery/')) return 'Gallery Event';
  if (path.startsWith('/dashboard/')) return 'Admin: ' + path.split('/').pop();
  return path;
};

type TabKey = 'countries' | 'cities' | 'recent' | 'pages' | 'live';

const VisitorGeoWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [anonData, setAnonData] = useState<AnonData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('live');
  const [showFullModal, setShowFullModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<AnonVisitor | GeoVisitor | null>(null);
  const [historyData, setHistoryData] = useState<{ visitors: any[]; total: number; page: number; totalPages: number } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [geoRes, anonRes] = await Promise.allSettled([
        authAxios.get('/api/admin/dashboard/visitor-geo'),
        authAxios.get('/api/admin/dashboard/anonymous-visitors'),
      ]);

      const geoOk = geoRes.status === 'fulfilled' && geoRes.value.data?.success;
      const anonOk = anonRes.status === 'fulfilled' && anonRes.value.data?.success;

      if (geoOk) {
        setGeoData(geoRes.value.data);
      }
      if (anonOk) {
        setAnonData(anonRes.value.data);
      }

      if (!geoOk && !anonOk) {
        console.error('Failed to fetch visitor intelligence:', { geoRes, anonRes });
        setGeoData(null);
        setAnonData(null);
        setLoadError('Visitor data unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch visitor intelligence:', err);
      setGeoData(null);
      setAnonData(null);
      setLoadError('Visitor data unavailable');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch persistent visitor history when modal opens
  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const res = await authAxios.get('/api/admin/dashboard/visitor-history', {
        params: { page, limit: 50 },
      });
      if (res.data?.success) {
        setHistoryData(res.data);
      } else {
        setHistoryData(null);
        setHistoryError('Visitor history unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch visitor history:', err);
      setHistoryData(null);
      setHistoryError('Visitor history unavailable');
    } finally {
      setHistoryLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    if (showFullModal) fetchHistory(1);
  }, [showFullModal, fetchHistory]);

  // Escape key closes modal/detail panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVisitor) setSelectedVisitor(null);
        else if (showFullModal) setShowFullModal(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedVisitor, showFullModal]);

  // Auto-refresh every 30s for live data
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleModalOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      setShowFullModal(false);
    }
  }, []);

  const handleModalOverlayKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowFullModal(false);
    }
  }, []);

  const activeNow = anonData?.activeNow || 0;
  const totalTracked = (geoData?.totalVisitors || 0);
  const totalAnon = anonData?.last24h || 0;
  const allCountries = geoData?.byCountry || [];
  const allCities = geoData?.byCity || [];
  const maxCountry = allCountries[0]?.count || 1;
  const maxCity = allCities[0]?.count || 1;

  return (
    <WidgetCard>
      {/* ── Header: Live Stats ── */}
      <Header>
        <HeaderLeft>
          <LiveDot />
          <HeaderTitle>
            <Globe size={18} />
            Visitor Intelligence
          </HeaderTitle>
        </HeaderLeft>
        <HeaderStats>
          <StatChip>
            <Activity size={14} />
            <StatValue>{activeNow}</StatValue>
            <StatLabel>Live Now</StatLabel>
          </StatChip>
          <StatChip>
            <Clock size={14} />
            <StatValue>{anonData?.lastHour || 0}</StatValue>
            <StatLabel>Last Hour</StatLabel>
          </StatChip>
          <StatChip>
            <Users size={14} />
            <StatValue>{totalTracked}</StatValue>
            <StatLabel>Users</StatLabel>
          </StatChip>
          <StatChip>
            <Eye size={14} />
            <StatValue>{totalAnon}</StatValue>
            <StatLabel>24h Visitors</StatLabel>
          </StatChip>
          <RefreshBtn onClick={fetchAll} disabled={loading} aria-label="Refresh visitor data">
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </RefreshBtn>
          <ViewAllBtn onClick={() => setShowFullModal(true)} aria-label="View all visitors">
            <Maximize2 size={14} />
            View All
          </ViewAllBtn>
        </HeaderStats>
      </Header>

      {/* ── Source Breakdown Bar ── */}
      <SourceBar>
        <SourceChip $variant="login">
          {geoData?.loginVisitors || 0} Logged In
        </SourceChip>
        <SourceChip $variant="gallery">
          {geoData?.galleryVisitors || 0} Gallery
        </SourceChip>
        <SourceChip $variant="anonymous">
          {totalAnon} Anonymous
        </SourceChip>
        <SourceChip $variant="stat">
          {geoData?.uniqueCountries || 0} Countries
        </SourceChip>
        <SourceChip $variant="stat">
          {geoData?.uniqueCities || 0} Cities
        </SourceChip>
      </SourceBar>

      {/* ── Tabs ── */}
      <TabRow role="tablist" aria-label="Visitor data views">
        {([
          { key: 'live' as TabKey, icon: <Activity size={14} />, label: 'Live Feed' },
          { key: 'countries' as TabKey, icon: <Globe size={14} />, label: 'Countries' },
          { key: 'cities' as TabKey, icon: <MapPin size={14} />, label: 'Cities' },
          { key: 'pages' as TabKey, icon: <FileText size={14} />, label: 'Top Pages' },
          { key: 'recent' as TabKey, icon: <Users size={14} />, label: 'Users' },
        ]).map(tab => (
          <Tab
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            $active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </Tab>
        ))}
      </TabRow>

      {/* ── Content ── */}
      {loading && !geoData && !anonData ? (
        <LoadingState>Loading visitor intelligence...</LoadingState>
      ) : loadError ? (
        <ContentArea>
          <ErrorState role="alert">
            <Activity size={32} />
            <span>Visitor data unavailable. Refresh before assuming traffic is empty.</span>
          </ErrorState>
        </ContentArea>
      ) : (
        <ContentArea key={activeTab}>
          {/* Live Feed — Anonymous visitors in real-time */}
          {activeTab === 'live' && (
            <GeoList>
              {(!anonData?.recentVisitors?.length && !geoData?.visitors?.length) && (
                <EmptyState>
                  <Eye size={32} />
                  <span>Visitor tracking is active. Data will appear as people visit your site.</span>
                </EmptyState>
              )}
              {anonData?.recentVisitors?.map((v, i) => (
                <LiveRow key={`anon-${i}`} type="button" onClick={() => setSelectedVisitor(v)} $clickable>
                  <LiveDotSmall $recent={Date.now() - new Date(v.lastSeen).getTime() < 300000} />
                  <LiveInfo>
                    <LiveLocation>
                      {countryFlag(v.countryCode)} {v.city || v.country || 'Unknown'}
                      {v.region && v.city && <LiveRegion>, {v.region}</LiveRegion>}
                    </LiveLocation>
                    <LivePages>
                      {v.pages.slice(-3).map(p => pageName(p)).join(' → ')}
                      {v.pageCount > 3 && <span> (+{v.pageCount - 3} more)</span>}
                    </LivePages>
                  </LiveInfo>
                  <LiveMeta>
                    <SourceBadge $variant="anonymous">anon</SourceBadge>
                    <LiveTime>{timeAgo(v.lastSeen)}</LiveTime>
                  </LiveMeta>
                  <MutedChevron size={14} />
                </LiveRow>
              ))}
              {geoData?.visitors?.slice(0, 10).map((v, i) => (
                <LiveRow key={`user-${v.userId || i}`} type="button" onClick={() => setSelectedVisitor(v)} $clickable>
                  <LiveDotSmall $recent={Date.now() - new Date(v.lastActive).getTime() < 300000} />
                  <LiveInfo>
                    <LiveLocation>
                      {countryFlag(v.countryCode)} {v.name}
                    </LiveLocation>
                    <LivePages>
                      {v.city && `${v.city}, `}{v.country || 'Unknown'}
                    </LivePages>
                  </LiveInfo>
                  <LiveMeta>
                    <SourceBadge $variant={v.source === 'gallery' ? 'gallery' : 'login'}>
                      {v.role === 'gallery_visitor' ? 'gallery' : v.role}
                    </SourceBadge>
                    <LiveTime>{timeAgo(v.lastActive)}</LiveTime>
                  </LiveMeta>
                  <MutedChevron size={14} />
                </LiveRow>
              ))}
            </GeoList>
          )}

          {/* Countries */}
          {activeTab === 'countries' && (
            <GeoList>
              {allCountries.length === 0 && <EmptyState><Globe size={32} /><span>No country data yet</span></EmptyState>}
              {allCountries.map((c, i) => (
                <GeoRow key={c.countryCode || i}>
                  <BarBg $pct={(c.count / maxCountry) * 100} />
                  <GeoFlag>{countryFlag(c.countryCode)}</GeoFlag>
                  <GeoName>{c.country}</GeoName>
                  <GeoCount>{c.count}</GeoCount>
                </GeoRow>
              ))}
            </GeoList>
          )}

          {/* Cities */}
          {activeTab === 'cities' && (
            <GeoList>
              {allCities.length === 0 && <EmptyState><MapPin size={32} /><span>No city data yet</span></EmptyState>}
              {allCities.map((c, i) => (
                <GeoRow key={`${c.city}-${i}`}>
                  <BarBg $pct={(c.count / maxCity) * 100} />
                  <GeoFlag>{countryFlag(c.countryCode)}</GeoFlag>
                  <GeoName>
                    {c.city}
                    <CityCountry>{c.country}</CityCountry>
                  </GeoName>
                  <GeoCount>{c.count}</GeoCount>
                </GeoRow>
              ))}
            </GeoList>
          )}

          {/* Top Pages */}
          {activeTab === 'pages' && (
            <GeoList>
              {(!anonData?.topPages?.length) && <EmptyState><FileText size={32} /><span>Page view data will appear as visitors browse your site</span></EmptyState>}
              {anonData?.topPages?.map((p, i) => {
                const maxP = anonData.topPages[0]?.views || 1;
                return (
                  <GeoRow key={p.page}>
                    <BarBg $pct={(p.views / maxP) * 100} />
                    <PageRank>#{i + 1}</PageRank>
                    <GeoName>{pageName(p.page)}</GeoName>
                    <PageViews>
                      <TrendingUp size={12} />
                      {p.views}
                    </PageViews>
                  </GeoRow>
                );
              })}
              {anonData?.totalPageViews ? (
                <TotalRow>
                  Total Page Views (24h): <strong>{anonData.totalPageViews}</strong>
                </TotalRow>
              ) : null}
            </GeoList>
          )}

          {/* Recent Users (logged in + gallery) */}
          {activeTab === 'recent' && (
            <GeoList>
              {!geoData?.visitors?.length && <EmptyState><Users size={32} /><span>No user visitor data yet</span></EmptyState>}
              {geoData?.visitors?.map((v) => (
                <RecentRow key={v.userId || v.name}>
                  <RecentInfo>
                    <RecentName>{v.name}</RecentName>
                    <RecentMeta>
                      {countryFlag(v.countryCode)} {v.city && `${v.city}, `}{v.country || 'Unknown'}
                    </RecentMeta>
                  </RecentInfo>
                  <RecentRight>
                    <SourceBadge $variant={v.source === 'gallery' ? 'gallery' : 'login'}>
                      {v.role === 'gallery_visitor' ? 'gallery' : v.role}
                    </SourceBadge>
                    <RecentTime>{timeAgo(v.lastActive)}</RecentTime>
                  </RecentRight>
                </RecentRow>
              ))}
            </GeoList>
          )}
        </ContentArea>
      )}
      {/* ── Visitor Detail Panel ── */}
      {selectedVisitor && (
        <DetailPanel>
          <DetailHeader>
            <DetailTitle>Visitor Details</DetailTitle>
            <CloseDetailBtn onClick={() => setSelectedVisitor(null)}><X size={16} /></CloseDetailBtn>
          </DetailHeader>
          <DetailContent>
            {'pages' in selectedVisitor && Array.isArray((selectedVisitor as AnonVisitor).pages) ? (
              // Anonymous visitor
              <>
                <DetailRow>
                  <DetailLabel>Location</DetailLabel>
                  <DetailValue>
                    {countryFlag((selectedVisitor as AnonVisitor).countryCode)}{' '}
                    {(selectedVisitor as AnonVisitor).city || 'Unknown'}
                    {(selectedVisitor as AnonVisitor).region && `, ${(selectedVisitor as AnonVisitor).region}`}
                    {(selectedVisitor as AnonVisitor).country && ` — ${(selectedVisitor as AnonVisitor).country}`}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>First Seen</DetailLabel>
                  <DetailValue>{new Date((selectedVisitor as AnonVisitor).firstSeen).toLocaleString()}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Last Seen</DetailLabel>
                  <DetailValue>{timeAgo((selectedVisitor as AnonVisitor).lastSeen)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Page Views</DetailLabel>
                  <DetailValue>{(selectedVisitor as AnonVisitor).pageCount}</DetailValue>
                </DetailRow>
                {(selectedVisitor as AnonVisitor).referrer && (
                  <DetailRow>
                    <DetailLabel>Referrer</DetailLabel>
                    <DetailValue>{(selectedVisitor as AnonVisitor).referrer}</DetailValue>
                  </DetailRow>
                )}
                <DetailRow>
                  <DetailLabel>Pages Visited</DetailLabel>
                  <DetailValue>
                    <PagesList>
                      {(selectedVisitor as AnonVisitor).pages.map((p, i) => (
                        <PageTag key={i}>{pageName(p)}</PageTag>
                      ))}
                    </PagesList>
                  </DetailValue>
                </DetailRow>
              </>
            ) : (
              // Logged-in / gallery visitor
              <>
                <DetailRow>
                  <DetailLabel>Name</DetailLabel>
                  <DetailValue>{(selectedVisitor as GeoVisitor).name}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Role</DetailLabel>
                  <DetailValue>{(selectedVisitor as GeoVisitor).role}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Location</DetailLabel>
                  <DetailValue>
                    {countryFlag((selectedVisitor as GeoVisitor).countryCode)}{' '}
                    {(selectedVisitor as GeoVisitor).city && `${(selectedVisitor as GeoVisitor).city}, `}
                    {(selectedVisitor as GeoVisitor).country || 'Unknown'}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Last Active</DetailLabel>
                  <DetailValue>{timeAgo((selectedVisitor as GeoVisitor).lastActive)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Source</DetailLabel>
                  <DetailValue>{(selectedVisitor as GeoVisitor).source}</DetailValue>
                </DetailRow>
              </>
            )}
          </DetailContent>
        </DetailPanel>
      )}

      {/* ── Full-Screen Modal ── */}
      {showFullModal && createPortal(
        <ModalOverlay
          role="button"
          tabIndex={0}
          aria-label="Close visitor intelligence modal"
          onClick={handleModalOverlayClick}
          onKeyDown={handleModalOverlayKeyDown}
        >
          <ModalContent
            role="dialog"
            aria-modal="true"
            aria-labelledby="visitor-intelligence-title"
            tabIndex={-1}
          >
            <ModalHeader>
              <ModalTitle id="visitor-intelligence-title">
                <Globe size={20} />
                Visitor Intelligence — Full View
              </ModalTitle>
              <CloseDetailBtn onClick={() => setShowFullModal(false)}><X size={20} /></CloseDetailBtn>
            </ModalHeader>
            <ModalBody>
              {/* Live / In-Memory Visitors */}
              <ModalSection>
                <ModalSectionTitle>
                  <Activity size={16} /> Live Visitors ({anonData?.recentVisitors?.length || 0})
                </ModalSectionTitle>
                <ModalList>
                  {anonData?.recentVisitors?.map((v, i) => (
                    <ModalRow key={`anon-${i}`} type="button" onClick={() => setSelectedVisitor(v)}>
                      <LiveDotSmall $recent={Date.now() - new Date(v.lastSeen).getTime() < 300000} />
                      <ModalRowInfo>
                        <span>{countryFlag(v.countryCode)} {v.city || v.country || 'Unknown'}</span>
                        <ModalRowMeta>
                          {v.pageCount} pages · {timeAgo(v.lastSeen)}
                          {v.referrer && ` · from ${v.referrer}`}
                        </ModalRowMeta>
                      </ModalRowInfo>
                      <ModalRowPages>
                        {v.pages.map((p, j) => (
                          <PageTag key={j}>{pageName(p)}</PageTag>
                        ))}
                      </ModalRowPages>
                    </ModalRow>
                  ))}
                  {(!anonData?.recentVisitors?.length) && (
                    <EmptyState><Eye size={24} /><span>No live visitors right now</span></EmptyState>
                  )}
                </ModalList>
              </ModalSection>

              {/* Registered Users */}
              <ModalSection>
                <ModalSectionTitle>
                  <Users size={16} /> Registered Users ({geoData?.visitors?.length || 0})
                </ModalSectionTitle>
                <ModalList>
                  {geoData?.visitors?.map((v, i) => (
                    <ModalRow key={`user-${v.userId || i}`} type="button" onClick={() => setSelectedVisitor(v)}>
                      <LiveDotSmall $recent={Date.now() - new Date(v.lastActive).getTime() < 300000} />
                      <ModalRowInfo>
                        <span>{countryFlag(v.countryCode)} {v.name}</span>
                        <ModalRowMeta>
                          {v.role} · {v.city && `${v.city}, `}{v.country || 'Unknown'} · {timeAgo(v.lastActive)}
                        </ModalRowMeta>
                      </ModalRowInfo>
                      <SourceBadge $variant={v.source === 'gallery' ? 'gallery' : 'login'}>
                        {v.role === 'gallery_visitor' ? 'gallery' : v.role}
                      </SourceBadge>
                    </ModalRow>
                  ))}
                  {(!geoData?.visitors?.length) && (
                    <EmptyState><Users size={24} /><span>No registered user data yet</span></EmptyState>
                  )}
                </ModalList>
              </ModalSection>

              {/* Persistent History from Database */}
              <ModalSection>
                <ModalSectionTitle>
                  <Clock size={16} /> Visitor History {historyData ? `(${historyData.total} total)` : ''}
                </ModalSectionTitle>
                {historyLoading && !historyData && (
                  <LoadingState>Loading visitor history...</LoadingState>
                )}
                {historyError && (
                  <ErrorState role="alert">
                    <Clock size={24} />
                    <span>Visitor history unavailable. Retry before treating history as empty.</span>
                  </ErrorState>
                )}
                <ModalList>
                  {historyData?.visitors?.map((v: any) => (
                    <ModalRow key={v.id} type="button" onClick={() => setSelectedVisitor({
                      ip: v.ip,
                      country: v.country || 'Unknown',
                      countryCode: v.country_code,
                      city: v.city,
                      region: v.region,
                      pages: v.pages || [],
                      pageCount: v.page_count || 1,
                      firstSeen: v.first_seen || v.createdAt,
                      lastSeen: v.last_seen || v.updatedAt,
                      referrer: v.referrer,
                    })}>
                      <LiveDotSmall $recent={false} />
                      <ModalRowInfo>
                        <span>{countryFlag(v.country_code)} {v.city || v.country || 'Unknown'}</span>
                        <ModalRowMeta>
                          {v.page_count || 1} pages · {timeAgo(v.last_seen || v.createdAt)}
                        </ModalRowMeta>
                      </ModalRowInfo>
                      <ModalRowPages>
                        {(v.pages || []).slice(-3).map((p: string, j: number) => (
                          <PageTag key={j}>{pageName(p)}</PageTag>
                        ))}
                      </ModalRowPages>
                    </ModalRow>
                  ))}
                  {historyData && historyData.visitors.length === 0 && (
                    <EmptyState><Clock size={24} /><span>No persistent history yet — data accumulates over time</span></EmptyState>
                  )}
                </ModalList>
                {/* Pagination */}
                {historyData && historyData.totalPages > 1 && (
                  <PaginationRow>
                    <PaginationBtn
                      disabled={historyData.page <= 1 || historyLoading}
                      onClick={() => fetchHistory(historyData.page - 1)}
                    >
                      Previous
                    </PaginationBtn>
                    <PaginationInfo>
                      Page {historyData.page} of {historyData.totalPages}
                    </PaginationInfo>
                    <PaginationBtn
                      disabled={historyData.page >= historyData.totalPages || historyLoading}
                      onClick={() => fetchHistory(historyData.page + 1)}
                    >
                      Next
                    </PaginationBtn>
                  </PaginationRow>
                )}
              </ModalSection>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>,
        document.body
      )}
    </WidgetCard>
  );
};

// ── Keyframes ──────────────────────────────────────────────────────────────

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulseRing = keyframes`
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
`;

const fadeSlideUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fillBar = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

// ── Styled Components ──────────────────────────────────────────────────────

const WidgetCard = styled.div`
  background: rgba(0, 32, 96, 0.45);
  backdrop-filter: blur(20px) saturate(160%);
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.15);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  max-height: 520px;
  overflow: hidden;
  margin-bottom: 24px;

  @media (max-width: 768px) { max-height: none; }
`;

const Header = styled.div`
  padding: 20px 24px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LiveDot = styled.div`
  position: relative;
  width: 10px;
  height: 10px;
  background: #22C55E;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);

  @media (prefers-reduced-motion: no-preference) {
    &::before {
      content: '';
      position: absolute;
      left: -3px; top: -3px;
      width: 16px; height: 16px;
      background: rgba(34, 197, 94, 0.4);
      border-radius: 50%;
      animation: ${pulseRing} 2s infinite ease-out;
    }
  }
`;

const HeaderTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${FROST};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderStats = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const StatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(96, 192, 240, 0.1);
  color: rgba(224, 236, 244, 0.6);
  font-size: 0.75rem;

  svg { color: ${ICE_WING}; opacity: 0.7; }
`;

const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-weight: 700;
  color: ${ICE_WING};
`;

const StatLabel = styled.span`
  color: rgba(224, 236, 244, 0.4);
  font-size: 0.7rem;

  @media (max-width: 768px) { display: none; }
`;

const RefreshBtn = styled.button`
  width: 44px; height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(139, 92, 246, 0.15);
  color: rgba(224, 236, 244, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  min-width: 44px;

  &:hover { background: rgba(139, 92, 246, 0.15); color: ${WING_PURPLE}; }
  &:focus-visible { outline: 2px solid ${WING_PURPLE}; outline-offset: 2px; }
  .spinning { animation: ${spin} 1s linear infinite; }
`;

const SourceBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 0 24px 12px;
  flex-wrap: wrap;
`;

type BadgeVariant = 'login' | 'gallery' | 'anonymous' | 'stat';

const SourceChip = styled.span<{ $variant: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  ${p => p.$variant === 'login' && css`
    color: ${GILDED};
    background: rgba(198, 168, 75, 0.1);
    border: 1px solid rgba(198, 168, 75, 0.2);
  `}
  ${p => p.$variant === 'gallery' && css`
    color: ${ICE_WING};
    background: rgba(96, 192, 240, 0.1);
    border: 1px solid rgba(96, 192, 240, 0.2);
  `}
  ${p => p.$variant === 'anonymous' && css`
    color: ${WING_PURPLE};
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.2);
  `}
  ${p => p.$variant === 'stat' && css`
    color: rgba(224, 236, 244, 0.5);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
  `}
`;

const SourceBadge = styled(SourceChip)`
  height: 20px;
  font-size: 0.6rem;
`;

const TabRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;

  &::-webkit-scrollbar { height: 0; }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 14px;
  min-height: 44px;
  border: none;
  border-bottom: 2px solid ${p => p.$active ? WING_PURPLE : 'transparent'};
  border-radius: 0;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: ${p => p.$active ? FROST : 'rgba(224, 236, 244, 0.45)'};
  background: transparent;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &:hover { color: ${FROST}; }
  svg { opacity: ${p => p.$active ? 1 : 0.5}; }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  animation: ${fadeSlideUp} 0.25s ease-out;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 4px;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px 16px;
  color: rgba(224, 236, 244, 0.4);
  font-size: 0.85rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: rgba(224, 236, 244, 0.3);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  svg { opacity: 0.3; }
`;

const ErrorState = styled(EmptyState)`
  color: var(--warning, #E5C76B);

  svg { opacity: 0.7; }
`;

const GeoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

// ── Live Feed Rows ──
const LiveRow = styled.button<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  transition: all 0.2s;
  cursor: ${p => p.$clickable ? 'pointer' : 'default'};

  &:hover {
    background: rgba(139, 92, 246, 0.08);
    transform: translateX(2px);
  }
`;

const LiveDotSmall = styled.div<{ $recent: boolean }>`
  width: 8px; height: 8px;
  min-width: 8px;
  border-radius: 50%;
  background: ${p => p.$recent ? '#22C55E' : 'rgba(224, 236, 244, 0.2)'};
  box-shadow: ${p => p.$recent ? '0 0 6px rgba(34, 197, 94, 0.5)' : 'none'};
`;

const LiveInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LiveLocation = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${FROST};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LiveRegion = styled.span`
  color: rgba(224, 236, 244, 0.4);
  font-weight: 400;
`;

const LivePages = styled.div`
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span { color: rgba(224, 236, 244, 0.25); }
`;

const LiveMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
`;

const LiveTime = styled.span`
  font-size: 0.68rem;
  color: rgba(224, 236, 244, 0.25);
  font-family: 'Fira Code', monospace;
`;

// ── Geo Rows (Countries/Cities) ──
const GeoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  position: relative;
  transition: all 0.2s;
  overflow: hidden;

  &:hover {
    background: rgba(96, 192, 240, 0.05);
    transform: translateX(2px);
  }
`;

const BarBg = styled.div<{ $pct: number }>`
  position: absolute;
  left: 0; top: 0;
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.08), rgba(96, 192, 240, 0.06));
  border-radius: 10px;
  transform-origin: left;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${fillBar} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
`;

const GeoFlag = styled.span`
  font-size: 1.1rem;
  width: 28px;
  text-align: center;
  position: relative;
  z-index: 1;
`;

const GeoName = styled.span`
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${FROST};
  position: relative;
  z-index: 1;
`;

const CityCountry = styled.span`
  display: block;
  font-size: 0.7rem;
  font-weight: 400;
  color: rgba(224, 236, 244, 0.4);
`;

const GeoCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${ICE_WING};
  min-width: 28px;
  text-align: right;
  position: relative;
  z-index: 1;
`;

// ── Pages Tab ──
const PageRank = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.3);
  width: 28px;
  text-align: center;
  position: relative;
  z-index: 1;
`;

const PageViews = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${WING_PURPLE};
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1;
`;

const TotalRow = styled.div`
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.15);
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.5);
  text-align: center;

  strong {
    color: ${ICE_WING};
    font-family: 'Fira Code', monospace;
  }
`;

// ── Recent Users Tab ──
const RecentRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  transition: all 0.15s;

  &:hover { background: rgba(255, 255, 255, 0.03); }
`;

const RecentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const RecentName = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${FROST};
`;

const RecentMeta = styled.span`
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.4);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RecentRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const RecentTime = styled.span`
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.25);
  font-family: 'Fira Code', monospace;
`;

// ── View All Button ──
const ViewAllBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: ${WING_PURPLE};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: ${WING_PURPLE};
  }
  &:focus-visible { outline: 2px solid ${WING_PURPLE}; outline-offset: 2px; }
`;

// ── Detail Panel (inline, slides up from bottom of widget) ──
const DetailPanel = styled.div`
  border-top: 1px solid rgba(139, 92, 246, 0.15);
  padding: 16px 24px;
  background: rgba(0, 32, 96, 0.6);
  animation: ${fadeSlideUp} 0.3s ease-out;
`;

const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const DetailTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${FROST};
  margin: 0;
`;

const CloseDetailBtn = styled.button`
  width: 44px; height: 44px;
  min-width: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(224, 236, 244, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover { background: rgba(139, 92, 246, 0.15); color: ${WING_PURPLE}; }
  &:focus-visible { outline: 2px solid ${WING_PURPLE}; outline-offset: 2px; }
`;

const DetailContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DetailRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 0.8rem;
`;

const DetailLabel = styled.span`
  color: rgba(224, 236, 244, 0.4);
  min-width: 90px;
  flex-shrink: 0;
  font-weight: 600;
`;

const DetailValue = styled.span`
  color: ${FROST};
  word-break: break-all;
`;

const PagesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const PageTag = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.15);
  font-size: 0.7rem;
  color: ${ICE_WING};
`;

const MutedChevron = styled(ChevronRight)`
  opacity: 0.3;
  flex-shrink: 0;
`;

// ── Full-Screen Modal ──
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: ${fadeSlideUp} 0.3s ease-out;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  background: rgba(0, 32, 96, 0.95);
  backdrop-filter: blur(20px) saturate(160%);
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const ModalTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${FROST};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const ModalSection = styled.div`
  margin-bottom: 24px;

  &:last-child { margin-bottom: 0; }
`;

const ModalSectionTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${ICE_WING};
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ModalRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 12px 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.08);
    transform: translateX(2px);
  }
`;

const ModalRowInfo = styled.div`
  flex: 1;
  min-width: 0;

  span {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: ${FROST};
  }
`;

const ModalRowMeta = styled.div`
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.4);
  margin-top: 2px;
`;

const ModalRowPages = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  max-width: 200px;
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const PaginationBtn = styled.button`
  padding: 8px 18px;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: ${WING_PURPLE};
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.2);
    border-color: ${WING_PURPLE};
  }
  &:focus-visible { outline: 2px solid ${WING_PURPLE}; outline-offset: 2px; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const PaginationInfo = styled.span`
  font-size: 0.78rem;
  color: rgba(224, 236, 244, 0.5);
  font-family: 'Fira Code', monospace;
`;

export default VisitorGeoWidget;
