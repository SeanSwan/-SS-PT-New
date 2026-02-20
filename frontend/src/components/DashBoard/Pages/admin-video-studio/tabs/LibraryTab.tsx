/**
 * LibraryTab.tsx
 * ==============
 * All videos (upload + YouTube) in a filterable card grid.
 * Filter bar, search, pagination, action buttons for upload & import.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Search,
  Upload,
  Youtube,
  Eye,
  Film,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
} from 'lucide-react';
import VideoUploadForm from '../components/VideoUploadForm';
import YouTubeImportModal from '../components/YouTubeImportModal';

// ─── Helpers ─────────────────────────────────────────
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
};

// ─── Types ───────────────────────────────────────────
interface Video {
  id: number;
  title: string;
  source: 'upload' | 'youtube';
  status: 'draft' | 'published' | 'archived';
  visibility: string;
  contentType: string;
  thumbnailUrl: string | null;
  viewCount: number;
  createdAt: string;
}

// ─── Styled Components ──────────────────────────────
const Container = styled.div``;

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchBox = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: rgba(255, 255, 255, 0.4);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px 10px 36px;
  color: white;
  font-size: 14px;
  min-height: 44px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 13px;
  min-height: 44px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #0a0a1a;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(45deg, #3b82f6, #00ffff);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: rgba(30, 58, 138, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);

  &:hover {
    background: rgba(30, 58, 138, 0.5);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.div)`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

const Thumbnail = styled.div<{ $src?: string | null }>`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${(p) =>
    p.$src ? `url(${p.$src}) center/cover no-repeat` : 'rgba(0, 0, 0, 0.4)'};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    color: rgba(255, 255, 255, 0.3);
    width: 40px;
    height: 40px;
  }
`;

const BadgeRow = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
`;

const Badge = styled.span<{ $color: string }>`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => p.$color};
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CardBody = styled.div`
  padding: 14px;
`;

const CardTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
`;

const PageButton = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(30, 58, 138, 0.15);
  color: ${(p) => (p.$disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)')};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.2);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const PageInfo = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.4);

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
  }

  p {
    font-size: 15px;
  }
`;

const LoadingText = styled.p`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
`;

// ─── Status colors ───────────────────────────────────
const statusColor = (s: string) => {
  switch (s) {
    case 'draft':
      return 'rgba(234, 179, 8, 0.8)';
    case 'published':
      return 'rgba(34, 197, 94, 0.8)';
    case 'archived':
      return 'rgba(107, 114, 128, 0.8)';
    default:
      return 'rgba(107, 114, 128, 0.6)';
  }
};

const sourceColor = (s: string) =>
  s === 'youtube' ? 'rgba(255, 0, 0, 0.75)' : 'rgba(59, 130, 246, 0.75)';

// ─── Component ───────────────────────────────────────
const LibraryTab: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();
  const limit = 12;

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (sourceFilter) params.set('source', sourceFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (visibilityFilter) params.set('visibility', visibilityFilter);
      if (contentTypeFilter) params.set('contentType', contentTypeFilter);

      const data = await fetchWithAuth(`/api/v2/admin/videos?${params.toString()}`);
      setVideos(data.videos || data.data || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit) || 1);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, statusFilter, visibilityFilter, contentTypeFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter, statusFilter, visibilityFilter, contentTypeFilter]);

  return (
    <Container>
      <TopBar>
        <SearchBox>
          <Search />
          <SearchInput
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBox>

        <FilterGroup>
          <FilterSelect value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            <option value="upload">Upload</option>
            <option value="youtube">YouTube</option>
          </FilterSelect>

          <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </FilterSelect>

          <FilterSelect value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
            <option value="">All Visibility</option>
            <option value="public">Public</option>
            <option value="members_only">Members Only</option>
            <option value="private">Private</option>
          </FilterSelect>

          <FilterSelect value={contentTypeFilter} onChange={(e) => setContentTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="tutorial">Tutorial</option>
            <option value="workout">Workout</option>
            <option value="promotional">Promotional</option>
            <option value="testimonial">Testimonial</option>
          </FilterSelect>
        </FilterGroup>

        <ActionButtons>
          <PrimaryButton onClick={() => setShowUpload(true)}>
            <Upload /> Upload Video
          </PrimaryButton>
          <SecondaryButton onClick={() => setShowImport(true)}>
            <Youtube /> Import YouTube
          </SecondaryButton>
        </ActionButtons>
      </TopBar>

      {loading ? (
        <LoadingText>Loading videos...</LoadingText>
      ) : videos.length === 0 ? (
        <EmptyState>
          <Film />
          <p>No videos found. Upload or import your first video to get started.</p>
        </EmptyState>
      ) : (
        <>
          <Grid>
            {videos.map((video) => (
              <Card
                key={video.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/dashboard/content/video-studio/${video.id}`)}
              >
                <Thumbnail $src={video.thumbnailUrl}>
                  {!video.thumbnailUrl && <Play />}
                  <BadgeRow>
                    <Badge $color={sourceColor(video.source)}>
                      {video.source === 'youtube' ? 'YT' : 'UP'}
                    </Badge>
                    <Badge $color={statusColor(video.status)}>{video.status}</Badge>
                  </BadgeRow>
                </Thumbnail>
                <CardBody>
                  <CardTitle>{video.title}</CardTitle>
                  <CardMeta>
                    <span>
                      <Eye /> {video.viewCount ?? 0}
                    </span>
                    <span>{video.visibility}</span>
                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  </CardMeta>
                </CardBody>
              </Card>
            ))}
          </Grid>

          <Pagination>
            <PageButton
              $disabled={page <= 1}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft />
            </PageButton>
            <PageInfo>
              Page {page} of {totalPages}
            </PageInfo>
            <PageButton
              $disabled={page >= totalPages}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight />
            </PageButton>
          </Pagination>
        </>
      )}
      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <ModalOverlay
            key="upload-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUpload(false)}
          >
            <ModalContent
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <VideoUploadForm
                onClose={() => setShowUpload(false)}
                onUploadComplete={() => { setShowUpload(false); fetchVideos(); }}
              />
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* YouTube Import Modal */}
      <YouTubeImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => { setShowImport(false); fetchVideos(); }}
      />
    </Container>
  );
};

// ─── Modal Overlay ──────────────────────────────────
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, rgba(15, 15, 35, 0.98), rgba(25, 25, 55, 0.95));
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 16px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
`;

export default LibraryTab;
