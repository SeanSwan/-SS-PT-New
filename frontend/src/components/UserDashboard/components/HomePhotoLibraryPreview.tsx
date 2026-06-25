import React, { useMemo } from 'react';
import { ArrowRight, Camera, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useProfile } from '../../../hooks/profile/useProfile';
import { mapPostsToPhotoItems } from './PhotoGallery.data';
import type { PhotoGalleryPost } from './PhotoGallery.types';
import { Eyebrow, Panel } from './HomeTabVision.styles';
import { Chip } from './HomeTabVisionCards.styles';
import { EmptyState, FullWidthAction, RailHeader } from './HomeTabVisionRightRail.styles';

const LibraryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
`;

const LibraryFrame = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:first-child {
    grid-row: span 2;
    aspect-ratio: auto;
  }
`;

const LibraryMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0.75rem 0;
  color: var(--vision-soft);
  font: 700 0.76rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

const HomePhotoLibraryPreview: React.FC = () => {
  const navigate = useNavigate();
  const { posts } = useProfile();
  const photos = useMemo(
    () => mapPostsToPhotoItems(posts as PhotoGalleryPost[] | null),
    [posts],
  );
  const previewPhotos = photos.slice(0, 4);

  return (
    <Panel as="section" aria-label="Photo Library">
      <RailHeader $spaced>
        <Eyebrow>
          <ImageIcon size={14} aria-hidden="true" />
          Photo Library
        </Eyebrow>
        <Chip $tone="cyan">{photos.length} uploaded</Chip>
      </RailHeader>

      {previewPhotos.length ? (
        <LibraryGrid>
          {previewPhotos.map((photo) => (
            <LibraryFrame key={photo.id}>
              <img src={photo.url} alt={photo.title} loading="lazy" />
            </LibraryFrame>
          ))}
        </LibraryGrid>
      ) : (
        <EmptyState>
          <Camera size={16} aria-hidden="true" />
          Your uploaded photos will live here, ready to reuse across SwanStudios.
        </EmptyState>
      )}

      <LibraryMeta>
        <span>Uploads ready for profile, progress, and creative posts.</span>
        <ArrowRight size={16} aria-hidden="true" />
      </LibraryMeta>
      <FullWidthAction type="button" $variant="accent" onClick={() => navigate('/user-dashboard/photos')}>
        Open full photo library
      </FullWidthAction>
    </Panel>
  );
};

export default HomePhotoLibraryPreview;
