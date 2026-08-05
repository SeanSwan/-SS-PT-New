import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { EmptyState } from './PhotoGallery.styles';

interface PhotoGalleryEmptyStateProps {
  /** 'ready' is the only value that licenses "No photos yet". */
  status?: 'loading' | 'ready' | 'unavailable';
}

const PhotoGalleryEmptyState: React.FC<PhotoGalleryEmptyStateProps> = ({ status = 'ready' }) => (
  <EmptyState>
    <ImageIcon size={48} />
    {status === 'unavailable' ? (
      <>
        <h3>We couldn&apos;t load your photos just now</h3>
        <p>Nothing you uploaded is lost — try again in a moment.</p>
      </>
    ) : status === 'loading' ? (
      <>
        <h3>Loading your photos…</h3>
        <p>One moment.</p>
      </>
    ) : (
      <>
        <h3>No photos yet</h3>
        <p>Upload photos or share moments with the community</p>
      </>
    )}
  </EmptyState>
);

export default PhotoGalleryEmptyState;
