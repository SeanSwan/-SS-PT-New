import React from 'react';
import { Plus } from 'lucide-react';
import { UploadCard, UploadIcon, UploadSubtext, UploadText } from './PhotoGalleryCard.styles';

interface PhotoGalleryUploadCardProps {
  onUpload: () => void;
}

const PhotoGalleryUploadCard: React.FC<PhotoGalleryUploadCardProps> = ({ onUpload }) => (
  <UploadCard type="button" onClick={onUpload} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <UploadIcon>
      <Plus size={24} />
    </UploadIcon>
    <UploadText>Add Photo</UploadText>
    <UploadSubtext>Share your progress, meals, or community moments.</UploadSubtext>
  </UploadCard>
);

export default PhotoGalleryUploadCard;
