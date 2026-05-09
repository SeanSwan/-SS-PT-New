/**
 * Upload call-to-action card for the active UserDashboard V3 creative gallery.
 */

import React from 'react';
import { Plus } from 'lucide-react';
import {
  UploadCard,
  UploadIcon,
  UploadSubtext,
  UploadText,
} from './CreativeGalleryCard.styles';

interface CreativeGalleryUploadCardProps {
  onUpload: () => void;
}

const CreativeGalleryUploadCard: React.FC<CreativeGalleryUploadCardProps> = ({ onUpload }) => (
  <UploadCard type="button" onClick={onUpload} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <UploadIcon>
      <Plus size={32} />
    </UploadIcon>
    <UploadText>Share Your Creativity</UploadText>
    <UploadSubtext>
      Upload your dance moves, workout videos, or musical performances to inspire the community
    </UploadSubtext>
  </UploadCard>
);

export default CreativeGalleryUploadCard;
