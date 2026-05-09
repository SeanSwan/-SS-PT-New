/**
 * Empty state for the active UserDashboard V3 creative gallery.
 */

import React from 'react';
import { Upload } from 'lucide-react';
import { EmptyState } from './CreativeGalleryCard.styles';

const CreativeGalleryEmptyState: React.FC = () => (
  <EmptyState>
    <Upload size={48} />
    <h3>No media yet</h3>
    <p>Share photos and videos to build your creative gallery</p>
  </EmptyState>
);

export default CreativeGalleryEmptyState;
