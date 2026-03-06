import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Play,
  Clock,
  Eye,
  Youtube,
  Upload,
  Video,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import ScrollReveal from '../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../components/ui-kit/cinematic/TypewriterText';
import ParallaxHero from '../components/ui-kit/cinematic/ParallaxHero';
import SectionDivider from '../components/ui-kit/cinematic/SectionDivider';

/* ================================================================
 * VideoLibraryV2 — Cinematic, Theme-Aware Video Library
 * ================================================================
 * Uses Galaxy-Swan cinematic UI kit. All styled tokens pull from
 * the active theme for full theme-switcher support.
 * API contract mirrors original VideoLibrary.tsx.
 * ================================================================ */

// --------------- Types ---------------

interface VideoItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  source: 'upload' | 'youtube';
  contentType: string;
  visibility: string;
  accessTier: string;
  thumbnail: string | null;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  tags: string[];
  featured: boolean;
  publishedAt: string;
  youtubeVideoId: string | null;
  locked: boolean;
}

interface CollectionItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  visibility: string;
  accessTier: string;
  thumbnail: string | null;
  videoCount: number;
  sortOrder: number;
}

// --------------- API ---------------

const API_URL = import.meta.env.VITE_API_URL || '';

// --------------- Animations ---------------

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 0.3; }
`;

// --------------- Layout ---------------

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  overflow-x: hidden;
`;

const ContentSection = styled.div`
  max-width: 1400px;
  width: 92%;
  margin: 0 auto;
  padding: 0 0 5rem;

  @media (max-width: 768px) {
    width: 94%;
  }
  @media (max-width: 430px) {
    width: 96%;
    padding-bottom: 3rem;
  }
  @media (min-width: 1920px) {
    max-width: 1600px;
  }
  @media (min-width: 2560px) {
    max-width: 1800px;
  }
`;

// --------------- Hero ---------------

const HeroTitle = styled(TypewriterText)`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 300;
  letter-spacing: 2px;
  background: ${({ theme }) => theme.gradients.primary};
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  animation: ${shimmer} 6s linear infinite;
  ${reducedMotion}
`;

const HeroSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: ${({ theme }) => theme.text.secondary};
  margin-top: 0.75rem;
  max-width: 550px;
  line-height: 1.7;
  text-align: center;
`;

// --------------- Search + Filter Bar ---------------

const StickyBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 1rem 0;
  background: ${({ theme }) => theme.background.primary};
  border-bottom: ${({ theme }) => theme.borders.subtle};
  margin-bottom: 2rem;

  ${({ theme }) => theme.effects.glassmorphism && css`
    background: ${theme.background.primary}ee;
    backdrop-filter: blur(16px);
  `}
`;

const BarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchGroup = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 12px;
  padding: 0 16px;
  min-height: 48px;
  transition: border-color 0.2s ease;

  &:focus-within {
    border: ${({ theme }) => theme.borders.focus};
  }
`;

const SearchIcon = styled.div`
  color: ${({ theme }) => theme.text.muted};
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  outline: none;
  min-height: 44px;

  &::placeholder {
    color: ${({ theme }) => theme.text.muted};
  }

  @media (max-width: 430px) {
    font-size: 16px;
  }
`;

const FilterSelect = styled.select`
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 12px;
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  padding: 0 16px;
  min-height: 48px;
  min-width: 44px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  text-transform: capitalize;

  &:focus {
    border: ${({ theme }) => theme.borders.focus};
    outline: none;
  }

  option {
    background: ${({ theme }) => theme.background.elevated};
    color: ${({ theme }) => theme.text.primary};
  }
`;

// --------------- Section Heading ---------------

const SectionHeading = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

// --------------- Collections ---------------

const CollectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 2.5rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const CollectionCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 14px;
  padding: 14px 18px;
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(10px);
  `}

  &:hover {
    transform: translateY(-3px);
    border: ${({ theme }) => theme.borders.elegant};
    box-shadow: ${({ theme }) => theme.shadows.elevation};
  }
`;

const CollectionThumb = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.gradients.glass};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.6;
`;

const CollectionBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const CollectionTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CollectionMeta = styled.div`
  display: flex;
  gap: 10px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.text.muted};
  text-transform: capitalize;
`;

const CollectionArrow = styled.div`
  color: ${({ theme }) => theme.text.muted};
  flex-shrink: 0;
  transition: color 0.2s ease;

  ${CollectionCard}:hover & {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

// --------------- Video Grid ---------------

const ResultCount = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text.muted};
  margin-bottom: 1rem;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const VideoCard = styled.div`
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(10px);
  `}

  &:hover {
    transform: translateY(-4px);
    border: ${({ theme }) => theme.borders.elegant};
    box-shadow: ${({ theme }) => theme.shadows.elevation};
  }
`;

const ThumbnailWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${({ theme }) => theme.background.elevated};
  overflow: hidden;
`;

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ThumbnailPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.3;
`;

const PlayOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.9);
  opacity: 0;
  transition: opacity 0.25s ease;

  ${VideoCard}:hover & {
    opacity: 1;
  }
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
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const CardBody = styled.div`
  padding: 14px 16px;
`;

const CardTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ContentTag = styled.span`
  display: inline-block;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.text.muted};
  background: ${({ theme }) => theme.background.elevated};
  border-radius: 6px;
  padding: 3px 8px;
  text-transform: capitalize;
  margin-bottom: 10px;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: ${({ theme }) => theme.borders.subtle};
`;

const ViewCount = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.text.muted};
`;

const LockedBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent};
`;

// --------------- Skeleton / Loading ---------------

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const SkeletonCard = styled.div`
  height: 300px;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.subtle};
  border-radius: 16px;
  animation: ${pulse} 1.5s ease infinite;
  ${reducedMotion}
`;

// --------------- Empty State ---------------

const EmptyState = styled.div`
  text-align: center;
  padding: 5rem 1.5rem;
  color: ${({ theme }) => theme.text.muted};
`;

const EmptyTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
  color: ${({ theme }) => theme.text.heading};
  margin: 1rem 0 0.5rem;
`;

const EmptyText = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.muted};
  margin: 0;
`;

// --------------- Pagination ---------------

const PaginationRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 2.5rem;
`;

const PageButton = styled.button<{ $active: boolean }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: ${({ $active, theme }) =>
    $active ? theme.borders.focus : theme.borders.card};
  background: ${({ $active, theme }) =>
    $active ? theme.gradients.glass : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.text.secondary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border: ${({ theme }) => theme.borders.elegant};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

// ================================================================
// Component
// ================================================================

const CONTENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'behind_scenes', label: 'Behind the Scenes' },
  { value: 'vlog', label: 'Vlog' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'course_lesson', label: 'Course Lesson' },
];

const VideoLibraryV2: React.FC = () => {
  const navigate = useNavigate();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [contentType, setContentType] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  // ---------- Fetch Videos ----------
  const fetchVideos = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (contentType) params.set('contentType', contentType);
        if (activeSearch) params.set('search', activeSearch);

        const res = await fetch(`${API_URL}/api/v2/videos?${params}`);
        const data = await res.json();
        if (data.success) {
          setVideos(data.data.videos);
          setPagination(data.data.pagination);
        }
      } catch (err) {
        console.error('Failed to load videos:', err);
      } finally {
        setLoading(false);
      }
    },
    [contentType, activeSearch]
  );

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ---------- Fetch Collections ----------
  useEffect(() => {
    const fetchCollections = async () => {
      setCollectionsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v2/videos/collections?limit=6`);
        const data = await res.json();
        if (data.success && data.data?.collections) {
          setCollections(data.data.collections);
        }
      } catch (err) {
        console.error('Failed to load collections:', err);
      } finally {
        setCollectionsLoading(false);
      }
    };
    fetchCollections();
  }, []);

  // ---------- Helpers ----------
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const handleSearchSubmit = () => {
    setActiveSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearchSubmit();
  };

  const handleFilterChange = (value: string) => {
    setContentType(value);
  };

  const showCollections =
    !collectionsLoading && collections.length > 0 && !activeSearch && !contentType;

  return (
    <PageWrapper>
      {/* ---- Hero (gradient only, no video) ---- */}
      <ParallaxHero overlayOpacity={0.75} minHeight="50vh">
        <HeroTitle text="Video Library" forwardedAs="h1" speed={55} />
        <HeroSubtitle>Explore our training content</HeroSubtitle>
      </ParallaxHero>

      <SectionDivider />

      <ContentSection>
        {/* ---- Search + Filter Bar ---- */}
        <StickyBar>
          <BarInner>
            <SearchGroup>
              <SearchIcon>
                <Search size={20} />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search videos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </SearchGroup>

            <FilterSelect
              value={contentType}
              onChange={(e) => handleFilterChange(e.target.value)}
              aria-label="Filter by content type"
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </FilterSelect>
          </BarInner>
        </StickyBar>

        {/* ---- Collections ---- */}
        {showCollections && (
          <ScrollReveal direction="up">
            <SectionHeading>
              <FolderOpen size={20} /> Collections
            </SectionHeading>
            <CollectionsGrid>
              {collections.map((col) => (
                <CollectionCard
                  key={col.id}
                  onClick={() => navigate(`/collections/${col.slug}`)}
                >
                  {col.thumbnail ? (
                    <CollectionThumb
                      style={{ backgroundImage: `url(${col.thumbnail})`, opacity: 1 }}
                    />
                  ) : (
                    <CollectionThumb>
                      <FolderOpen size={28} />
                    </CollectionThumb>
                  )}
                  <CollectionBody>
                    <CollectionTitle>{col.title}</CollectionTitle>
                    <CollectionMeta>
                      <span>{col.type}</span>
                      <span>
                        {col.videoCount} video{col.videoCount !== 1 ? 's' : ''}
                      </span>
                    </CollectionMeta>
                  </CollectionBody>
                  <CollectionArrow>
                    <ChevronRight size={18} />
                  </CollectionArrow>
                </CollectionCard>
              ))}
            </CollectionsGrid>
          </ScrollReveal>
        )}

        {/* ---- Videos ---- */}
        {loading ? (
          <LoadingGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </LoadingGrid>
        ) : videos.length === 0 ? (
          <EmptyState>
            <Video size={48} />
            <EmptyTitle>No Videos Found</EmptyTitle>
            <EmptyText>
              {contentType || activeSearch
                ? 'Try adjusting your filters or search terms.'
                : 'Videos will appear here once content is added to the library.'}
            </EmptyText>
          </EmptyState>
        ) : (
          <>
            <ResultCount>
              {pagination.total} video{pagination.total !== 1 ? 's' : ''}
            </ResultCount>

            <VideoGrid>
              {videos.map((video, idx) => (
                <ScrollReveal
                  key={video.id}
                  direction="up"
                  delay={Math.min(idx * 0.05, 0.4)}
                >
                  <VideoCard onClick={() => navigate(`/watch/${video.slug}`)}>
                    <ThumbnailWrap>
                      {video.thumbnail ? (
                        <Thumbnail
                          src={video.thumbnail}
                          alt={video.title}
                          loading="lazy"
                        />
                      ) : (
                        <ThumbnailPlaceholder>
                          {video.source === 'youtube' ? (
                            <Youtube size={40} />
                          ) : (
                            <Upload size={40} />
                          )}
                        </ThumbnailPlaceholder>
                      )}
                      <PlayOverlay>
                        <Play size={40} />
                      </PlayOverlay>
                      {video.durationSeconds > 0 && (
                        <DurationBadge>
                          <Clock size={12} /> {formatDuration(video.durationSeconds)}
                        </DurationBadge>
                      )}
                    </ThumbnailWrap>

                    <CardBody>
                      <CardTitle>{video.title}</CardTitle>
                      {video.contentType && (
                        <ContentTag>
                          {video.contentType.replace(/_/g, ' ')}
                        </ContentTag>
                      )}
                      <CardFooter>
                        <ViewCount>
                          <Eye size={14} /> {video.viewCount}
                        </ViewCount>
                        {video.locked && <LockedBadge>Members Only</LockedBadge>}
                      </CardFooter>
                    </CardBody>
                  </VideoCard>
                </ScrollReveal>
              ))}
            </VideoGrid>

            {/* ---- Pagination ---- */}
            {pagination.totalPages > 1 && (
              <PaginationRow>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <PageButton
                      key={p}
                      $active={p === pagination.page}
                      onClick={() => fetchVideos(p)}
                    >
                      {p}
                    </PageButton>
                  )
                )}
              </PaginationRow>
            )}
          </>
        )}
      </ContentSection>
    </PageWrapper>
  );
};

export default VideoLibraryV2;
