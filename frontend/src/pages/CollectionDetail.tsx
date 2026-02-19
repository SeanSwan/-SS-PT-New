/**
 * CollectionDetail.tsx
 * ====================
 * Public collection (playlist/series/course) detail page.
 * Shows collection info and its published videos in sort order.
 *
 * Route: /collections/:slug
 * API: GET /api/v2/videos/collections/:slug
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Eye, Youtube, Upload, FolderOpen, Lock } from 'lucide-react';

interface CollectionVideoItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  contentType: string;
  source: 'upload' | 'youtube';
  visibility: string;
  accessTier: string;
  durationSeconds: number;
  thumbnail: string | null;
  viewCount: number;
  locked: boolean;
  collectionSortOrder: number;
}

interface CollectionData {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  visibility: string;
  accessTier: string;
  thumbnail: string | null;
  videoCount: number;
  videos: CollectionVideoItem[];
}

const API_URL = import.meta.env.VITE_API_URL || '';

const CollectionDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchCollection = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/v2/videos/collections/${slug}`);
        const data = await res.json();
        if (data.success && data.data?.collection) {
          setCollection(data.data.collection);
        } else {
          setError('Collection not found');
        }
      } catch (err) {
        setError('Failed to load collection');
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, [slug]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <PageContainer>
        <ContentSection>
          <LoadingState>Loading collection...</LoadingState>
        </ContentSection>
      </PageContainer>
    );
  }

  if (error || !collection) {
    return (
      <PageContainer>
        <ContentSection>
          <ErrorState>
            <h2>{error || 'Collection not found'}</h2>
            <BackLink onClick={() => navigate('/video-library')}>
              <ArrowLeft size={18} /> Back to Video Library
            </BackLink>
          </ErrorState>
        </ContentSection>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HeroSection>
        <HeroContent>
          <BackLink onClick={() => navigate('/video-library')}>
            <ArrowLeft size={18} /> Back to Video Library
          </BackLink>
          <HeroTitle>{collection.title}</HeroTitle>
          {collection.description && (
            <HeroSubtitle>{collection.description}</HeroSubtitle>
          )}
          <HeroMeta>
            <MetaBadge>{collection.type}</MetaBadge>
            <span>{collection.videoCount} video{collection.videoCount !== 1 ? 's' : ''}</span>
          </HeroMeta>
        </HeroContent>
      </HeroSection>

      <ContentSection>
        {collection.videos.length === 0 ? (
          <EmptyState>
            <FolderOpen size={48} />
            <EmptyTitle>No Videos Yet</EmptyTitle>
            <EmptyText>This collection doesn't have any published videos yet.</EmptyText>
          </EmptyState>
        ) : (
          <VideoList>
            {collection.videos.map((video, index) => (
              <VideoRow key={video.id} onClick={() => navigate(`/watch/${video.slug}`)}>
                <VideoIndex>{index + 1}</VideoIndex>
                <ThumbnailWrap>
                  {video.thumbnail ? (
                    <Thumbnail src={video.thumbnail} alt={video.title} loading="lazy" />
                  ) : (
                    <ThumbnailPlaceholder>
                      {video.source === 'youtube' ? <Youtube size={24} /> : <Upload size={24} />}
                    </ThumbnailPlaceholder>
                  )}
                  <PlayOverlay><Play size={24} /></PlayOverlay>
                  {video.durationSeconds > 0 && (
                    <DurationBadge>
                      <Clock size={10} /> {formatDuration(video.durationSeconds)}
                    </DurationBadge>
                  )}
                </ThumbnailWrap>
                <VideoInfo>
                  <VideoTitle>{video.title}</VideoTitle>
                  <VideoMeta>
                    {video.contentType && (
                      <span>{video.contentType.replace(/_/g, ' ')}</span>
                    )}
                    <span><Eye size={12} /> {video.viewCount}</span>
                    {video.source === 'youtube' && <SourceTag>YouTube</SourceTag>}
                  </VideoMeta>
                </VideoInfo>
                {video.locked && (
                  <LockBadge><Lock size={14} /> Members</LockBadge>
                )}
              </VideoRow>
            ))}
          </VideoList>
        )}
      </ContentSection>
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
  background: linear-gradient(180deg, rgba(0, 206, 209, 0.08) 0%, transparent 100%);
`;

const HeroContent = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #B8B8B8;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 16px;
  min-height: 44px;
  transition: color 0.2s;

  &:hover {
    color: #00CED1;
  }
`;

const HeroTitle = styled.h1`
  font-size: clamp(24px, 4vw, 40px);
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 12px;
  background: linear-gradient(135deg, #00CED1, #9D4EDD);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeroSubtitle = styled.p`
  font-size: clamp(14px, 2vw, 16px);
  color: #B8B8B8;
  line-height: 1.6;
  margin: 0 0 16px;
`;

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #B8B8B8;
`;

const MetaBadge = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(157, 78, 221, 0.3);
  color: #d4a5ff;
  text-transform: capitalize;
`;

const ContentSection = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px 80px;
`;

const VideoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const VideoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(10, 14, 26, 0.7);
  border: 1px solid rgba(0, 206, 209, 0.1);
  border-radius: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.2s;

  &:hover {
    transform: translateX(4px);
    border-color: #00CED1;
  }

  @media (max-width: 600px) {
    padding: 10px 12px;
    gap: 10px;
  }
`;

const VideoIndex = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.25);
  width: 28px;
  text-align: center;
  flex-shrink: 0;

  @media (max-width: 600px) {
    display: none;
  }
`;

const ThumbnailWrap = styled.div`
  position: relative;
  width: 120px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #0a0e1a;

  @media (max-width: 600px) {
    width: 90px;
  }
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

  ${VideoRow}:hover & {
    opacity: 1;
  }
`;

const DurationBadge = styled.div`
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(0, 0, 0, 0.85);
  color: #FFF;
  border-radius: 3px;
  padding: 2px 5px;
  font-size: 11px;
  font-weight: 600;
`;

const VideoInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const VideoTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const VideoMeta = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #B8B8B8;
  text-transform: capitalize;

  svg {
    vertical-align: middle;
  }
`;

const SourceTag = styled.span`
  color: rgba(239, 68, 68, 0.7);
  font-size: 11px;
  font-weight: 600;
`;

const LockBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #9D4EDD;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(157, 78, 221, 0.1);
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 100px 24px;
  color: #B8B8B8;
  font-size: 16px;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 100px 24px;
  color: #B8B8B8;

  h2 {
    color: #FFFFFF;
    font-size: 20px;
    margin: 0 0 16px;
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

export default CollectionDetail;
