import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { EmptyState } from './PhotoGallery.styles';

const PhotoGalleryEmptyState: React.FC = () => (
  <EmptyState>
    <ImageIcon size={48} />
    <h3>No photos yet</h3>
    <p>Upload photos or share moments with the community</p>
  </EmptyState>
);

export default PhotoGalleryEmptyState;
