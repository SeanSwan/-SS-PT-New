import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { PlayCircle, Upload, Link as LinkIcon, Plus, Search, Filter, Grid, List } from 'lucide-react';
import axios from 'axios';

// Component imports (to be created)
import VideoCard from '../../components/admin/VideoCard';
import CreateExerciseWizard from '../../components/admin/CreateExerciseWizard';
import VideoPlayerModal from '../../components/admin/VideoPlayerModal';
import { useDebounce } from '../../hooks/useDebounce';

// Types
interface ExerciseVideo {
  id: string;
  exercise_id?: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  views: number;
  phases: number[];
  equipment?: string;
  primary_muscle?: string;
  video_type: 'upload' | 'youtube' | 'vimeo';
  created_at: string;
}

interface LibraryStats {
  total_videos: number;
  total_exercises: number;
  total_templates: number;
}

interface FilterOptions {
  phase?: number;
  equipment?: string;
  muscle_group?: string;
  video_type?: string;
}

// Main Component
const AdminVideoLibrary: React.FC = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ExerciseVideo | null>(null);

  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(searchTerm, 300);

  // API calls
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['admin-videos', page, debouncedSearch, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filters.phase && { phase: filters.phase.toString() }),
        ...(filters.equipment && { equipment: filters.equipment }),
        ...(filters.muscle_group && { muscle_group: filters.muscle_group }),
        ...(filters.video_type && { video_type: filters.video_type }),
      });
      const response = await axios.get(`/api/admin/videos?${params}`);
      return response.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-video-stats'],
    queryFn: async () => {
      const response = await axios.get<LibraryStats>('/api/admin/dashboard/stats');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      await axios.delete(`/api/admin/videos/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      queryClient.invalidateQueries({ queryKey: ['admin-video-stats'] });
      toast.success('Video deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete video');
    },
  });

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on search
  }, []);

  const handleFilterChange = useCallback((filterKey: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value || undefined,
    }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
  }, []);

  const handleDeleteVideo = useCallback(async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      deleteMutation.mutate(videoId);
    }
  }, [deleteMutation]);

  const handleVideoClick = useCallback((video: ExerciseVideo) => {
    setSelectedVideo(video);
  }, []);

  const handleCloseVideoPlayer = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
    queryClient.invalidateQueries({ queryKey: ['admin-video-stats'] });
    toast.success('Exercise created successfully!');
  }, [queryClient]);

  // Computed values
  const videos = videosData?.videos || [];
  const pagination = videosData?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0);
  }, [filters, searchTerm]);

  return (
    <Container>
      {/* Header */}
      <Header>
        <HeaderContent>
          <Title>
            <PlayCircle size={32} />
            Video Library
          </Title>
          <Subtitle>Manage exercises, videos, and workout demonstrations</Subtitle>
        </HeaderContent>

        <ActionButtons>
          <ActionButton onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            Create Exercise
          </ActionButton>
        </ActionButtons>
      </Header>

      {/* Stats Banner */}
      {stats && (
        <StatsBanner>
          <StatCard>
            <StatValue>{stats.total_videos}</StatValue>
            <StatLabel>Videos</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.total_exercises}</StatValue>
            <StatLabel>Exercises</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.total_templates}</StatValue>
            <StatLabel>Templates</StatLabel>
          </StatCard>
        </StatsBanner>
      )}

      {/* Toolbar */}
      <Toolbar>
        <SearchContainer>
          <SearchIcon>
            <Search size={20} />
          </SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search videos by name, exercise, or tags..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </SearchContainer>

        <FiltersContainer>
          <FilterSelect
            value={filters.phase || ''}
            onChange={(e) => handleFilterChange('phase', e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Phases</option>
            <option value="1">Phase 1: Stabilization</option>
            <option value="2">Phase 2: Strength Endurance</option>
            <option value="3">Phase 3: Hypertrophy</option>
            <option value="4">Phase 4: Maximal Strength</option>
            <option value="5">Phase 5: Power</option>
          </FilterSelect>

          <FilterSelect
            value={filters.equipment || ''}
            onChange={(e) => handleFilterChange('equipment', e.target.value)}
          >
            <option value="">All Equipment</option>
            <option value="bodyweight">Bodyweight</option>
            <option value="dumbbell">Dumbbell</option>
            <option value="barbell">Barbell</option>
            <option value="cable">Cable</option>
            <option value="machine">Machine</option>
            <option value="resistance_band">Resistance Band</option>
            <option value="kettlebell">Kettlebell</option>
            <option value="medicine_ball">Medicine Ball</option>
          </FilterSelect>

          <FilterSelect
            value={filters.muscle_group || ''}
            onChange={(e) => handleFilterChange('muscle_group', e.target.value)}
          >
            <option value="">All Muscle Groups</option>
            <option value="chest">Chest</option>
            <option value="back">Back</option>
            <option value="shoulders">Shoulders</option>
            <option value="arms">Arms</option>
            <option value="legs">Legs</option>
            <option value="core">Core</option>
            <option value="glutes">Glutes</option>
            <option value="full_body">Full Body</option>
          </FilterSelect>

          <FilterSelect
            value={filters.video_type || ''}
            onChange={(e) => handleFilterChange('video_type', e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="upload">Uploaded Videos</option>
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
          </FilterSelect>

          {activeFiltersCount > 0 && (
            <ClearFiltersButton onClick={handleClearFilters}>
              Clear Filters ({activeFiltersCount})
            </ClearFiltersButton>
          )}
        </FiltersContainer>

        <ViewToggle>
          <ViewButton active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
            <Grid size={20} />
          </ViewButton>
          <ViewButton active={viewMode === 'list'} onClick={() => setViewMode('list')}>
            <List size={20} />
          </ViewButton>
        </ViewToggle>
      </Toolbar>

      {/* Video Grid/List */}
      {videosLoading ? (
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Loading videos...</LoadingText>
        </LoadingContainer>
      ) : videos.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <PlayCircle size={64} />
          </EmptyIcon>
          <EmptyTitle>No videos found</EmptyTitle>
          <EmptyText>
            {activeFiltersCount > 0
              ? 'Try adjusting your filters or search term'
              : 'Get started by creating your first exercise with a video'}
          </EmptyText>
          <ActionButton onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            Create Exercise
          </ActionButton>
        </EmptyState>
      ) : (
        <>
          <VideoGrid viewMode={viewMode}>
            {videos.map((video: ExerciseVideo) => (
              <VideoCard
                key={video.id}
                video={video}
                viewMode={viewMode}
                onClick={() => handleVideoClick(video)}
                onDelete={() => handleDeleteVideo(video.id)}
              />
            ))}
          </VideoGrid>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination>
              <PaginationButton
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </PaginationButton>

              <PaginationInfo>
                Page {pagination.page} of {pagination.totalPages}
              </PaginationInfo>

              <PaginationButton
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </PaginationButton>
            </Pagination>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateExerciseWizard
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {selectedVideo && (
        <VideoPlayerModal
          video={selectedVideo}
          onClose={handleCloseVideoPlayer}
        />
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  padding: 32px;
  max-width: 1600px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary, #FFFFFF);
  margin: 0 0 8px 0;

  svg {
    color: var(--primary-cyan, #00CED1);
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: var(--text-secondary, #B8B8B8);
  margin: 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--primary-cyan, #00CED1), var(--accent-purple, #9D4EDD));
  color: var(--text-primary, #FFFFFF);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsBanner = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  backdrop-filter: blur(10px);
`;

const StatValue = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: var(--primary-cyan, #00CED1);
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: var(--text-secondary, #B8B8B8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;

  @media (max-width: 768px) {
    width: 100%;
    min-width: auto;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #B8B8B8);
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 12px 16px 12px 48px;
  font-size: 16px;
  color: var(--text-primary, #FFFFFF);
  backdrop-filter: blur(10px);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-cyan, #00CED1);
  }

  &::placeholder {
    color: var(--text-secondary, #B8B8B8);
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const FilterSelect = styled.select`
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-primary, #FFFFFF);
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-cyan, #00CED1);
  }

  option {
    background: var(--dark-bg, #0a0e1a);
    color: var(--text-primary, #FFFFFF);
  }

  @media (max-width: 768px) {
    flex: 1;
    min-width: 140px;
  }
`;

const ClearFiltersButton = styled.button`
  background: transparent;
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--primary-cyan, #00CED1);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: var(--glass-bg, rgba(0, 206, 209, 0.1));
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 4px;
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 4px;
`;

const ViewButton = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.active ? 'var(--primary-cyan, #00CED1)' : 'transparent'};
  border: none;
  border-radius: 6px;
  padding: 8px;
  color: ${props => props.active ? '#FFFFFF' : 'var(--text-secondary, #B8B8B8)'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${props => props.active ? '#FFFFFF' : 'var(--primary-cyan, #00CED1)'};
  }
`;

const VideoGrid = styled.div<{ viewMode: 'grid' | 'list' }>`
  display: grid;
  grid-template-columns: ${props => props.viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr'};
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-top-color: var(--primary-cyan, #00CED1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  margin-top: 16px;
  font-size: 16px;
  color: var(--text-secondary, #B8B8B8);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  color: var(--text-secondary, #B8B8B8);
  opacity: 0.5;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  margin: 0 0 8px 0;
`;

const EmptyText = styled.p`
  font-size: 16px;
  color: var(--text-secondary, #B8B8B8);
  margin: 0 0 24px 0;
  max-width: 400px;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
`;

const PaginationButton = styled.button`
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  color: var(--text-primary, #FFFFFF);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--primary-cyan, #00CED1);
    background: var(--glass-bg, rgba(0, 206, 209, 0.1));
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PaginationInfo = styled.div`
  font-size: 14px;
  color: var(--text-secondary, #B8B8B8);
`;

export default AdminVideoLibrary;
