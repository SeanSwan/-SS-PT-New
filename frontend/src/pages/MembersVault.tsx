import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Play, Clock, Tag, ChevronDown,
  Video, X, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* ---------- helpers ---------- */

const fetchApi = async (path: string, options?: RequestInit) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
};

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

/* ---------- types ---------- */

interface MemberVideo {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  source: 'upload' | 'youtube';
  tags: string[];
  contentType: string;
  progress?: { currentTime: number; completed: boolean };
}

interface PaginationData {
  page: number;
  pages: number;
  total: number;
}

/* ========== Component ========== */

const MembersVault: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  /* redirect unauthenticated users */
  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      navigate(`/login?returnUrl=${encodeURIComponent('/members/videos')}`, { replace: true });
    }
  }, [auth.loading, auth.isAuthenticated, navigate]);

  /* state */
  const [videos, setVideos] = useState<MemberVideo[]>([]);
  const [continueWatching, setContinueWatching] = useState<MemberVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, pages: 1, total: 0 });

  const [searchQuery, setSearchQuery] = useState('');
  const [contentType, setContentType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);

  /* ---------- fetch videos ---------- */
  const fetchVideos = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (searchQuery) params.set('search', searchQuery);
        if (contentType) params.set('contentType', contentType);
        if (selectedTag) params.set('tag', selectedTag);

        const res = await fetchApi(`/api/v2/videos/members?${params}`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        const data = json?.data ?? json;

        setVideos(data.videos ?? []);
        setPagination(data.pagination ?? { page: 1, pages: 1, total: 0 });
        setContinueWatching(data.continueWatching ?? []);

        // derive filter options from first fetch
        if (allTags.length === 0 && data.filterOptions) {
          setAllTags(data.filterOptions.tags ?? []);
          setContentTypes(data.filterOptions.contentTypes ?? []);
        }
      } catch (err) {
        console.error('MembersVault fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, contentType, selectedTag, allTags.length],
  );

  useEffect(() => {
    if (auth.isAuthenticated) fetchVideos();
  }, [auth.isAuthenticated, fetchVideos]);

  const clearFilters = () => {
    setSearchQuery('');
    setContentType('');
    setSelectedTag('');
  };

  const hasActiveFilters = contentType || selectedTag;

  if (auth.loading) {
    return (
      <PageContainer>
        <LoadingWrap><Spinner /><span>Verifying access...</span></LoadingWrap>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Hero */}
      <HeroSection>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <HeroTitle>Members Vault</HeroTitle>
          <HeroSubtitle>
            Your exclusive library of expert training content, workout breakdowns,
            and educational material.
          </HeroSubtitle>
        </motion.div>
      </HeroSection>

      <ContentSection>
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <ContinueSection>
            <SectionHeading>
              <RotateCcw size={18} /> Continue Watching
            </SectionHeading>
            <ContinueGrid>
              {continueWatching.map((v) => (
                <ContinueCard
                  key={v.id}
                  onClick={() => navigate(`/watch/${v.slug}`)}
                >
                  <ContinueThumb>
                    <img src={v.thumbnailUrl} alt={v.title} loading="lazy" />
                    <ContinueOverlay>
                      <Play size={28} />
                    </ContinueOverlay>
                    {v.progress && (
                      <ContinueBar>
                        <ContinueBarFill
                          style={{
                            width: `${Math.min(
                              ((v.progress.currentTime || 0) / Math.max(v.durationSeconds, 1)) * 100,
                              100,
                            )}%`,
                          }}
                        />
                      </ContinueBar>
                    )}
                  </ContinueThumb>
                  <ContinueTitle>{v.title}</ContinueTitle>
                </ContinueCard>
              ))}
            </ContinueGrid>
          </ContinueSection>
        )}

        {/* Search & Filters */}
        <SearchBar>
          <SearchIcon><Search size={20} /></SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
          />
          <FilterToggle
            onClick={() => setShowFilters(!showFilters)}
            $active={showFilters || !!hasActiveFilters}
          >
            <Filter size={18} />
            Filters
            {hasActiveFilters && <ActiveDot />}
          </FilterToggle>
        </SearchBar>

        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              as={motion.div}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FilterGroup>
                <FilterLabel>Content Type</FilterLabel>
                <FilterSelect
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                >
                  <option value="">All</option>
                  {contentTypes.map((ct) => (
                    <option key={ct} value={ct}>{ct.replace(/_/g, ' ')}</option>
                  ))}
                </FilterSelect>
              </FilterGroup>
              <FilterGroup>
                <FilterLabel>Tag</FilterLabel>
                <FilterSelect
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <option value="">All</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </FilterSelect>
              </FilterGroup>
              {hasActiveFilters && (
                <ClearButton onClick={clearFilters}>
                  <X size={16} /> Clear
                </ClearButton>
              )}
            </FilterPanel>
          )}
        </AnimatePresence>

        {/* Results */}
        {loading ? (
          <LoadingGrid>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </LoadingGrid>
        ) : videos.length === 0 ? (
          <EmptyState>
            <Video size={48} />
            <EmptyTitle>No Videos Found</EmptyTitle>
            <EmptyText>
              {hasActiveFilters
                ? 'Try adjusting your filters or search terms.'
                : 'New content is being added regularly. Check back soon!'}
            </EmptyText>
          </EmptyState>
        ) : (
          <>
            <ResultCount>{pagination.total} video{pagination.total !== 1 ? 's' : ''}</ResultCount>
            <VideoGrid>
              {videos.map((v, i) => (
                <VideoCard
                  key={v.id}
                  as={motion.div}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  onClick={() => navigate(`/watch/${v.slug}`)}
                >
                  <ThumbWrap>
                    {v.thumbnailUrl ? (
                      <Thumbnail src={v.thumbnailUrl} alt={v.title} loading="lazy" />
                    ) : (
                      <ThumbPlaceholder><Video size={36} /></ThumbPlaceholder>
                    )}
                    <PlayOverlay><Play size={36} /></PlayOverlay>
                    {v.durationSeconds > 0 && (
                      <DurationBadge><Clock size={12} /> {formatDuration(v.durationSeconds)}</DurationBadge>
                    )}
                  </ThumbWrap>
                  <CardBody>
                    <CardTitle>{v.title}</CardTitle>
                    {v.tags?.length > 0 && (
                      <TagRow>
                        {v.tags.slice(0, 3).map((t) => (
                          <TagChip key={t}><Tag size={10} /> {t}</TagChip>
                        ))}
                      </TagRow>
                    )}
                  </CardBody>
                </VideoCard>
              ))}
            </VideoGrid>

            {pagination.pages > 1 && (
              <Pagination>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <PageBtn
                    key={p}
                    $active={p === pagination.page}
                    onClick={() => fetchVideos(p)}
                  >
                    {p}
                  </PageBtn>
                ))}
              </Pagination>
            )}
          </>
        )}
      </ContentSection>
    </PageContainer>
  );
};

/* ========== Animations ========== */

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ========== Styled Components ========== */

const PageContainer = styled.div`
  min-height: 100vh;
  background: #0a0a1a;
  color: rgba(255, 255, 255, 0.9);
`;

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: rgba(255, 255, 255, 0.6);
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/* ---- Hero ---- */

const HeroSection = styled.section`
  padding: 80px 24px 40px;
  text-align: center;
  background: linear-gradient(180deg, rgba(120, 81, 169, 0.1) 0%, transparent 100%);
`;

const HeroTitle = styled.h1`
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 700;
  margin: 0 0 12px;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeroSubtitle = styled.p`
  font-size: clamp(14px, 2vw, 18px);
  color: rgba(255, 255, 255, 0.55);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;

const ContentSection = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px 80px;

  @media (max-width: 430px) { padding: 0 12px 60px; }
`;

/* ---- Continue Watching ---- */

const ContinueSection = styled.section`
  margin-bottom: 32px;
`;

const SectionHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 16px;
`;

const ContinueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;

  @media (max-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
`;

const ContinueCard = styled.div`
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
  transition: transform 0.2s;
  &:hover { transform: translateY(-3px); }
`;

const ContinueThumb = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: rgba(30, 58, 138, 0.15);
  border-radius: 10px;
  overflow: hidden;

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const ContinueOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
  ${ContinueCard}:hover & { opacity: 1; }
`;

const ContinueBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
`;

const ContinueBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #00ffff);
  border-radius: 2px;
`;

const ContinueTitle = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin: 8px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/* ---- Search & Filters ---- */

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 14, 26, 0.8);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 12px;
  padding: 8px 16px;
  margin-bottom: 16px;
`;

const SearchIcon = styled.div`
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  outline: none;
  min-height: 44px;
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

const FilterToggle = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${(p) => (p.$active ? 'rgba(0, 255, 255, 0.1)' : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.15)')};
  color: ${(p) => (p.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.5)')};
  border-radius: 8px;
  padding: 8px 14px;
  min-height: 44px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s;
  &:hover { border-color: #00ffff; color: #00ffff; }
`;

const ActiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #00ffff;
`;

const FilterPanel = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
  padding: 16px;
  background: rgba(10, 14, 26, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.12);
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
  flex: 1;
`;

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FilterSelect = styled.select`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #fff;
  padding: 10px 12px;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;
  text-transform: capitalize;
  &:focus { border-color: #00ffff; outline: none; }
  option { background: #0a0a1a; }
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid rgba(255, 68, 68, 0.4);
  color: #ff4444;
  border-radius: 8px;
  padding: 10px 14px;
  min-height: 44px;
  cursor: pointer;
  font-size: 13px;
  &:hover { background: rgba(255, 68, 68, 0.1); }
`;

/* ---- Video Grid ---- */

const ResultCount = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 16px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;

  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const VideoCard = styled.div`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  &:hover {
    transform: translateY(-4px);
    border-color: #00ffff;
  }
`;

const ThumbWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #0a0e1a;
  overflow: hidden;
`;

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ThumbPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 255, 255, 0.25);
`;

const PlayOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.9);
  opacity: 0;
  transition: opacity 0.2s;
  ${VideoCard}:hover & { opacity: 1; }
`;

const DurationBadge = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
`;

const CardBody = styled.div`
  padding: 14px 16px;
`;

const CardTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: rgba(0, 255, 255, 0.8);
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 6px;
  padding: 3px 8px;
`;

/* ---- Pagination ---- */

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 32px;
`;

const PageBtn = styled.button<{ $active: boolean }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.15)')};
  background: ${(p) => (p.$active ? 'rgba(0, 255, 255, 0.12)' : 'transparent')};
  color: ${(p) => (p.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.5)')};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #00ffff; color: #00ffff; }
`;

/* ---- Loading & Empty States ---- */

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const SkeletonCard = styled.div`
  height: 280px;
  background: rgba(30, 58, 138, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  animation: skPulse 1.5s ease infinite;
  @keyframes skPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.25; }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 24px;
  color: rgba(255, 255, 255, 0.4);
`;

const EmptyTitle = styled.h3`
  font-size: 20px;
  color: #fff;
  margin: 16px 0 8px;
`;

const EmptyText = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
`;

export default MembersVault;
