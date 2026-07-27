import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, Search, Video, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScrollReveal from '../components/ui-kit/cinematic/ScrollReveal';
import ParallaxHero from '../components/ui-kit/cinematic/ParallaxHero';
import SectionDivider from '../components/ui-kit/cinematic/SectionDivider';
import apiService from '../services/api.service';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { logger } from '../utils/logger';
import {
  buildVideoListPath,
  DEFAULT_VIDEO_PAGINATION,
  VIDEO_COLLECTIONS_LOAD_ERROR,
  VIDEO_LIBRARY_LOAD_ERROR,
  getCollectionPath,
  getVisiblePaginationPages,
  hasActiveVideoFilters,
  normalizeCollectionCatalogResponse,
  normalizeContentTypeLabel,
  normalizeVideoCatalogResponse,
  videoLibraryErrorMeta,
} from './VideoLibraryV3.logic';
import { CONTENT_TYPES, CollectionItem, VideoItem, VideoPagination } from './VideoLibraryV3.types';
import {
  BarInner, ContentSection, EmptyState, EmptyText, EmptyTitle, ExternalVideoLink, FilterSelect, HeroSubtitle, HeroTitle,
  LoadingGrid, NoiseOverlay, PageWrapper, ResultCount, SearchGroup, SearchIcon, SearchInput,
  SectionHeading, SkeletonCard, StatusBanner, StickyBar,
} from './VideoLibraryV3.layoutStyles';
import {
  ActiveFilterSummary, ClearFiltersButton, PageButton, PaginationRow, PaginationStatus, SearchButton,
} from './VideoLibraryV3.controlStyles';
import {
  CollectionArrow, CollectionBody, CollectionCard, CollectionImage,
  CollectionMeta, CollectionThumb, CollectionTitle, CollectionsGrid, VideoGrid,
} from './VideoLibraryV3.cardStyles';
import { HeroKicker, HeroStat, HeroStats } from './VideoLibraryV3.heroStyles';
import VideoCardItem from './VideoLibraryV3.VideoCardItem';

const VideoLibraryV3: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [contentType, setContentType] = useState('');
  const [pagination, setPagination] = useState<VideoPagination>(DEFAULT_VIDEO_PAGINATION);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [libraryIssue, setLibraryIssue] = useState<string | null>(null);
  const [collectionsIssue, setCollectionsIssue] = useState<string | null>(null);

  const fetchVideos = useCallback(
    async (page = 1) => {
      setLoading(true);
      setLibraryIssue(null);

      try {
        const res = await apiService.get(buildVideoListPath(page, contentType, activeSearch));
        const catalog = normalizeVideoCatalogResponse(res.data);

        if (!catalog) {
          logger.warn('Video library videos response unexpected.');
          throw new Error('video_catalog_unavailable');
        }

        setVideos(catalog.videos);
        setPagination(catalog.pagination);
      } catch (error) {
        logger.warn('Video library videos load failed.', videoLibraryErrorMeta(error));
        setVideos([]);
        setPagination(DEFAULT_VIDEO_PAGINATION);
        setLibraryIssue(VIDEO_LIBRARY_LOAD_ERROR);
      } finally {
        setLoading(false);
      }
    },
    [contentType, activeSearch]
  );

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    const fetchCollections = async () => {
      setCollectionsLoading(true);
      setCollectionsIssue(null);

      try {
        const res = await apiService.get('/api/v2/videos/collections?limit=6');
        const nextCollections = normalizeCollectionCatalogResponse(res.data);

        if (!nextCollections) throw new Error('video_collections_unavailable');
        setCollections(nextCollections);
      } catch (error) {
        logger.warn('Video library collections load failed.', videoLibraryErrorMeta(error));
        setCollections([]);
        setCollectionsIssue(VIDEO_COLLECTIONS_LOAD_ERROR);
      } finally {
        setCollectionsLoading(false);
      }
    };

    fetchCollections();
  }, []);

  const handleSearchSubmit = () => {
    const nextSearch = searchInput.trim();
    if (nextSearch === activeSearch) {
      fetchVideos(1);
      return;
    }
    setActiveSearch(nextSearch);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleSearchSubmit();
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setContentType('');
  };

  const handlePageChange = (page: number) => {
    if (page === pagination.page || page < 1 || page > pagination.totalPages) return;
    fetchVideos(page);
  };

  const filtersActive = hasActiveVideoFilters(contentType, activeSearch);
  const showCollections = !collectionsLoading && collections.length > 0 && !filtersActive;
  const visibleIssue = libraryIssue ?? collectionsIssue;
  const visiblePages = getVisiblePaginationPages(pagination);
  const contentLabel = normalizeContentTypeLabel(contentType);
  const filterSummary = filtersActive
    ? `Showing ${contentLabel}${activeSearch ? ` matching "${activeSearch}"` : ''}.`
    : 'Browse all published training videos and collections.';

  return (
    <PageWrapper>
      <NoiseOverlay aria-hidden="true" />

      <ParallaxHero imageSrc="/images/parallax/video-library-bg.png" overlayOpacity={0.75} minHeight="50vh">
        <HeroKicker>Training Video Vault</HeroKicker>
        <HeroTitle text="Video Library" forwardedAs="h1" speed={55} />
        <HeroSubtitle>Find the right movement demo, coaching lesson, or member story before the next set starts.</HeroSubtitle>
        {(pagination.total > 0 || collections.length > 0) && (
          <HeroStats aria-label="Video library highlights">
            <HeroStat><strong>{pagination.total}</strong><span>Published Videos</span></HeroStat>
            <HeroStat><strong>{collections.length}</strong><span>Collections</span></HeroStat>
            <HeroStat><strong>{contentLabel}</strong><span>Current Filter</span></HeroStat>
          </HeroStats>
        )}
      </ParallaxHero>

      <SectionDivider />

      <ContentSection>
        <StickyBar>
          <BarInner>
            <SearchGroup>
              <SearchIcon aria-hidden="true">
                <Search size={20} />
              </SearchIcon>
              <SearchInput
                aria-label="Search videos"
                type="text"
                placeholder="Search videos..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </SearchGroup>

            <FilterSelect
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              aria-label="Filter by content type"
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </FilterSelect>

            <SearchButton type="button" onClick={handleSearchSubmit} aria-label="Search video library">
              <Search size={18} /> Search
            </SearchButton>
            <ClearFiltersButton type="button" onClick={handleClearFilters} disabled={!filtersActive} aria-label="Clear video filters">
              <X size={18} /> Clear
            </ClearFiltersButton>
            <ActiveFilterSummary role="status" aria-live="polite">{filterSummary}</ActiveFilterSummary>
          </BarInner>
        </StickyBar>

        {visibleIssue && <StatusBanner role="status" aria-live="polite">{visibleIssue}</StatusBanner>}

        {showCollections && (
          <ScrollReveal direction="up">
            <SectionHeading><FolderOpen size={20} /> Collections</SectionHeading>
            <CollectionsGrid>
              {collections.map((collection) => {
                const collectionPath = getCollectionPath(collection.slug);
                const collectionThumbnail = sanitizeImageUrl(collection.thumbnail);

                return (
                  <CollectionCard
                    key={collection.id}
                    type="button"
                    disabled={!collectionPath}
                    onClick={() => collectionPath && navigate(collectionPath)}
                    aria-label={`Open ${collection.title} collection`}
                  >
                    <CollectionThumb $hasImage={Boolean(collectionThumbnail)}>
                      {collectionThumbnail
                        ? <CollectionImage src={collectionThumbnail} alt="" loading="lazy" />
                        : <FolderOpen size={28} />}
                    </CollectionThumb>
                    <CollectionBody>
                      <CollectionTitle>{collection.title}</CollectionTitle>
                      <CollectionMeta>
                        <span>{collection.type || 'Collection'}</span>
                        <span>{collection.videoCount} video{collection.videoCount !== 1 ? 's' : ''}</span>
                      </CollectionMeta>
                    </CollectionBody>
                    <CollectionArrow><ChevronRight size={18} /></CollectionArrow>
                  </CollectionCard>
                );
              })}
            </CollectionsGrid>
          </ScrollReveal>
        )}

        {loading ? (
          <LoadingGrid aria-label="Loading videos">
            {Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)}
          </LoadingGrid>
        ) : videos.length === 0 ? (
          <EmptyState>
            <Video size={48} />
            <EmptyTitle>{filtersActive ? 'No Videos Found' : 'The SwanStudios Video Vault Opens Soon'}</EmptyTitle>
            <EmptyText>
              {filtersActive
                ? 'Clear filters or try a different search to browse more of the library.'
                : 'The first comeback films are being prepared. Follow SwanStudios on YouTube for the latest training story.'}
            </EmptyText>
            {!filtersActive && (
              <ExternalVideoLink href="https://www.youtube.com/@swanstudios2018" target="_blank" rel="noreferrer">
                Watch the SwanStudios comeback on YouTube
              </ExternalVideoLink>
            )}
          </EmptyState>
        ) : (
          <>
            <ResultCount>{pagination.total} video{pagination.total !== 1 ? 's' : ''}</ResultCount>

            <VideoGrid>
              {videos.map((video, index) => (
                <VideoCardItem key={video.id} video={video} index={index} onOpen={(path) => navigate(path)} />
              ))}
            </VideoGrid>

            {pagination.totalPages > 1 && (
              <PaginationRow aria-label="Video pages">
                <PaginationStatus aria-live="polite">Page {pagination.page} of {pagination.totalPages}</PaginationStatus>
                <PageButton type="button" aria-label="Previous page" disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  <ChevronLeft size={16} /> Prev
                </PageButton>
                {visiblePages.map((page) => (
                  <PageButton key={page} type="button" $active={page === pagination.page} aria-current={page === pagination.page ? 'page' : undefined} disabled={page === pagination.page} onClick={() => handlePageChange(page)}>
                    {page}
                  </PageButton>
                ))}
                <PageButton type="button" aria-label="Next page" disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
                  Next <ChevronRight size={16} />
                </PageButton>
              </PaginationRow>
            )}
          </>
        )}
      </ContentSection>
    </PageWrapper>
  );
};

export default VideoLibraryV3;
