import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Search, Filter, Play, Clock, Eye, Youtube, Upload, Video, X, ChevronDown } from 'lucide-react';
import VideoPlayerModal from '../components/Admin/VideoPlayerModal';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  video_type: 'upload' | 'youtube';
  video_id: string;
  thumbnail_url: string;
  duration_seconds: number;
  views: number;
  tags: string[];
  createdAt: string;
  exercise_name: string;
  primary_muscle: string;
  equipment: string;
  difficulty: string;
  phases: number[];
}

interface Filters {
  muscle: string;
  equipment: string;
  phase: string;
  type: string;
  search: string;
  sort: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const VideoLibrary: React.FC = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    muscle: '', equipment: '', phase: '', type: '', search: '', sort: 'newest',
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filterOptions, setFilterOptions] = useState({
    muscles: [] as string[], equipment: [] as string[],
  });

  const fetchVideos = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filters.muscle) params.set('muscle', filters.muscle);
      if (filters.equipment) params.set('equipment', filters.equipment);
      if (filters.phase) params.set('phase', filters.phase);
      if (filters.type) params.set('type', filters.type);
      if (filters.search) params.set('search', filters.search);
      if (filters.sort) params.set('sort', filters.sort);

      const res = await fetch(`${API_URL}/api/videos?${params}`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    fetch(`${API_URL}/api/videos/filters`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setFilterOptions({ muscles: data.muscles, equipment: data.equipment });
        }
      })
      .catch(() => {});
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const clearFilters = () => {
    setFilters({ muscle: '', equipment: '', phase: '', type: '', search: '', sort: 'newest' });
  };

  const hasActiveFilters = filters.muscle || filters.equipment || filters.phase || filters.type;

  return (
    <PageContainer>
      <HeroSection>
        <HeroContent>
          <HeroTitle>Exercise Video Library</HeroTitle>
          <HeroSubtitle>
            Expert-guided exercise demonstrations with NASM-certified form cues.
            Upload your own training videos or browse our curated YouTube collection.
          </HeroSubtitle>
        </HeroContent>
      </HeroSection>

      <ContentSection>
        <SearchBar>
          <SearchIcon><Search size={20} /></SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search exercises..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
          />
          <FilterToggle onClick={() => setShowFilters(!showFilters)} $active={showFilters || !!hasActiveFilters}>
            <Filter size={18} />
            Filters
            {hasActiveFilters && <ActiveDot />}
          </FilterToggle>
        </SearchBar>

        {showFilters && (
          <FilterPanel>
            <FilterGroup>
              <FilterLabel>Muscle Group</FilterLabel>
              <FilterSelect value={filters.muscle} onChange={e => setFilters(f => ({ ...f, muscle: e.target.value }))}>
                <option value="">All</option>
                {filterOptions.muscles.map(m => (
                  <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                ))}
              </FilterSelect>
            </FilterGroup>
            <FilterGroup>
              <FilterLabel>Equipment</FilterLabel>
              <FilterSelect value={filters.equipment} onChange={e => setFilters(f => ({ ...f, equipment: e.target.value }))}>
                <option value="">All</option>
                {filterOptions.equipment.map(e => (
                  <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
                ))}
              </FilterSelect>
            </FilterGroup>
            <FilterGroup>
              <FilterLabel>NASM Phase</FilterLabel>
              <FilterSelect value={filters.phase} onChange={e => setFilters(f => ({ ...f, phase: e.target.value }))}>
                <option value="">All</option>
                {[1, 2, 3, 4, 5].map(p => (
                  <option key={p} value={p}>Phase {p}</option>
                ))}
              </FilterSelect>
            </FilterGroup>
            <FilterGroup>
              <FilterLabel>Video Type</FilterLabel>
              <FilterSelect value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="">All</option>
                <option value="youtube">YouTube</option>
                <option value="upload">Uploaded</option>
              </FilterSelect>
            </FilterGroup>
            <FilterGroup>
              <FilterLabel>Sort By</FilterLabel>
              <FilterSelect value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}>
                <option value="newest">Newest</option>
                <option value="popular">Most Viewed</option>
                <option value="title">A-Z</option>
                <option value="oldest">Oldest</option>
              </FilterSelect>
            </FilterGroup>
            {hasActiveFilters && (
              <ClearButton onClick={clearFilters}>
                <X size={16} /> Clear
              </ClearButton>
            )}
          </FilterPanel>
        )}

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
                : 'Videos will appear here once exercises are added to the library.'}
            </EmptyText>
          </EmptyState>
        ) : (
          <>
            <ResultCount>{pagination.total} video{pagination.total !== 1 ? 's' : ''}</ResultCount>
            <VideoGrid>
              {videos.map(video => (
                <VideoCard key={video.id} onClick={() => setSelectedVideo(video)}>
                  <ThumbnailWrap>
                    {video.thumbnail_url ? (
                      <Thumbnail src={video.thumbnail_url} alt={video.title} loading="lazy" />
                    ) : (
                      <ThumbnailPlaceholder>
                        {video.video_type === 'youtube' ? <Youtube size={40} /> : <Upload size={40} />}
                      </ThumbnailPlaceholder>
                    )}
                    <PlayOverlay><Play size={40} /></PlayOverlay>
                    {video.duration_seconds > 0 && (
                      <DurationBadge><Clock size={12} /> {formatDuration(video.duration_seconds)}</DurationBadge>
                    )}
                    <TypeBadge>
                      {video.video_type === 'youtube' ? <Youtube size={14} /> : <Upload size={14} />}
                    </TypeBadge>
                  </ThumbnailWrap>
                  <CardBody>
                    <CardTitle>{video.title}</CardTitle>
                    {video.exercise_name && <ExerciseName>{video.exercise_name}</ExerciseName>}
                    <MetaRow>
                      {video.primary_muscle && <MetaTag>{video.primary_muscle.replace(/_/g, ' ')}</MetaTag>}
                      {video.equipment && <MetaTag>{video.equipment.replace(/_/g, ' ')}</MetaTag>}
                    </MetaRow>
                    <CardFooter>
                      <Views><Eye size={14} /> {video.views}</Views>
                      {video.phases && video.phases.length > 0 && (
                        <Phases>{video.phases.map(p => `P${p}`).join(', ')}</Phases>
                      )}
                    </CardFooter>
                  </CardBody>
                </VideoCard>
              ))}
            </VideoGrid>

            {pagination.pages > 1 && (
              <Pagination>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <PageButton key={p} $active={p === pagination.page} onClick={() => fetchVideos(p)}>
                    {p}
                  </PageButton>
                ))}
              </Pagination>
            )}
          </>
        )}
      </ContentSection>

      {selectedVideo && (
        <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </PageContainer>
  );
};

// ========== Styled Components ==========

const PageContainer = styled.div`
  min-height: 100vh;
  background: #0a0a1a;
`;

const HeroSection = styled.section`
  padding: 80px 24px 48px;
  text-align: center;
  background: linear-gradient(180deg, rgba(0, 206, 209, 0.08) 0%, transparent 100%);
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const HeroTitle = styled.h1`
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #00CED1, #9D4EDD);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeroSubtitle = styled.p`
  font-size: clamp(14px, 2vw, 18px);
  color: #B8B8B8;
  line-height: 1.6;
  margin: 0;
`;

const ContentSection = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px 80px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 14, 26, 0.8);
  border: 1px solid rgba(0, 206, 209, 0.2);
  border-radius: 12px;
  padding: 8px 16px;
  margin-bottom: 16px;
`;

const SearchIcon = styled.div`
  color: #B8B8B8;
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: #FFFFFF;
  font-size: 16px;
  outline: none;
  min-height: 44px;
  &::placeholder { color: #666; }
`;

const FilterToggle = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${p => p.$active ? 'rgba(0, 206, 209, 0.15)' : 'transparent'};
  border: 1px solid ${p => p.$active ? '#00CED1' : 'rgba(255,255,255,0.15)'};
  color: ${p => p.$active ? '#00CED1' : '#B8B8B8'};
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
  min-height: 44px;
  white-space: nowrap;
  transition: all 0.2s;
  &:hover { border-color: #00CED1; color: #00CED1; }
`;

const ActiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00CED1;
`;

const FilterPanel = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
  padding: 16px;
  background: rgba(10, 14, 26, 0.6);
  border: 1px solid rgba(0, 206, 209, 0.15);
  border-radius: 12px;
  margin-bottom: 24px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  flex: 1;
`;

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: #B8B8B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FilterSelect = styled.select`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #FFFFFF;
  padding: 10px 12px;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;
  text-transform: capitalize;
  &:focus { border-color: #00CED1; outline: none; }
  option { background: #0a0e1a; }
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid rgba(255, 68, 68, 0.4);
  color: #FF4444;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  min-height: 44px;
  &:hover { background: rgba(255, 68, 68, 0.1); }
`;

const ResultCount = styled.div`
  font-size: 14px;
  color: #B8B8B8;
  margin-bottom: 16px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const VideoCard = styled.div`
  background: rgba(10, 14, 26, 0.7);
  border: 1px solid rgba(0, 206, 209, 0.15);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  &:hover {
    transform: translateY(-4px);
    border-color: #00CED1;
  }
`;

const ThumbnailWrap = styled.div`
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

const ThumbnailPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 206, 209, 0.3);
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
  color: #FFF;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
`;

const TypeBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #FFF;
  border-radius: 4px;
  padding: 4px 6px;
  display: flex;
  align-items: center;
`;

const CardBody = styled.div`
  padding: 14px 16px;
`;

const CardTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ExerciseName = styled.div`
  font-size: 12px;
  color: #00CED1;
  margin-bottom: 8px;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const MetaTag = styled.span`
  font-size: 11px;
  color: #B8B8B8;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 3px 8px;
  text-transform: capitalize;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 206, 209, 0.1);
`;

const Views = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #B8B8B8;
`;

const Phases = styled.span`
  font-size: 11px;
  color: #9D4EDD;
  font-weight: 600;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 32px;
`;

const PageButton = styled.button<{ $active: boolean }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${p => p.$active ? '#00CED1' : 'rgba(255,255,255,0.15)'};
  background: ${p => p.$active ? 'rgba(0, 206, 209, 0.15)' : 'transparent'};
  color: ${p => p.$active ? '#00CED1' : '#B8B8B8'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #00CED1; color: #00CED1; }
`;

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const SkeletonCard = styled.div`
  height: 300px;
  background: rgba(10, 14, 26, 0.7);
  border: 1px solid rgba(0, 206, 209, 0.1);
  border-radius: 14px;
  animation: pulse 1.5s ease infinite;
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.3; }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 24px;
  color: #B8B8B8;
`;

const EmptyTitle = styled.h3`
  font-size: 20px;
  color: #FFFFFF;
  margin: 16px 0 8px;
`;

const EmptyText = styled.p`
  font-size: 14px;
  color: #B8B8B8;
  margin: 0;
`;

export default VideoLibrary;
