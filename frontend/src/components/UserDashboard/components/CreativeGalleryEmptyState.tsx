/**
 * Empty state for the active UserDashboard V3 creative gallery.
 */

import React from 'react';
import { Upload } from 'lucide-react';
import { EmptyState } from './CreativeGalleryCard.styles';

const EMPTY_STATE_TITLE_ID = 'creative-gallery-empty-title';

interface CreativeGalleryEmptyStateProps {
  title?: string;
  description?: string;
}

const CreativeGalleryEmptyState: React.FC<CreativeGalleryEmptyStateProps> = ({
  title = 'No media yet',
  description = 'Share photos and videos to build your creative gallery',
}) => (
  <EmptyState role="region" aria-labelledby={EMPTY_STATE_TITLE_ID}>
    <Upload size={48} aria-hidden="true" />
    <h3 id={EMPTY_STATE_TITLE_ID}>{title}</h3>
    <p>{description}</p>
  </EmptyState>
);

export default CreativeGalleryEmptyState;
