/**
 * RelatedVideos — Sidebar recommendations on the watch page
 * ===========================================================
 * Shows videos from the same content type + same collections.
 */

import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { VideoCatalogItem } from '../../hooks/useVideoCatalog';

const Container = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px;
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Card = styled.button`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  min-height: 44px;

  &:hover {
    background: rgba(0, 255, 255, 0.06);
    border-color: rgba(0, 255, 255, 0.2);
  }
`;

const Thumbnail = styled.div<{ $src?: string }>`
  width: 120px;
  min-width: 120px;
  height: 68px;
  border-radius: 6px;
  background: ${({ $src }) =>
    $src ? `url(${$src}) center/cover no-repeat` : 'rgba(255,255,255,0.08)'};
`;

const Info = styled.div`
  flex: 1;
  overflow: hidden;
`;

const Title = styled.p`
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Meta = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
  display: block;
`;

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface RelatedVideosProps {
  videos: VideoCatalogItem[];
  title?: string;
}

export const RelatedVideos: React.FC<RelatedVideosProps> = ({ videos, title = 'Related Videos' }) => {
  const navigate = useNavigate();

  if (!videos.length) return null;

  return (
    <Container>
      <SectionTitle>{title}</SectionTitle>
      <CardList>
        {videos.map((video) => (
          <Card key={video.id} onClick={() => navigate(`/watch/${video.slug}`)}>
            <Thumbnail $src={video.signedThumbnailUrl || video.thumbnailUrl || undefined} />
            <Info>
              <Title>{video.title}</Title>
              <Meta>
                {video.viewCount.toLocaleString()} views
                {video.durationSeconds ? ` \u00b7 ${formatDuration(video.durationSeconds)}` : ''}
              </Meta>
            </Info>
          </Card>
        ))}
      </CardList>
    </Container>
  );
};

export default RelatedVideos;
