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
  disabled?: boolean;
}

const CreativeGalleryUploadCard: React.FC<CreativeGalleryUploadCardProps> = ({ disabled = false, onUpload }) => (
  <UploadCard
    type="button"
    aria-label="Share creative media"
    disabled={disabled}
    onClick={onUpload}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <UploadIcon aria-hidden="true">
      <Plus size={32} aria-hidden="true" />
    </UploadIcon>
    <UploadText as="span" aria-hidden="true">Share Your Creativity</UploadText>
    <UploadSubtext as="span" aria-hidden="true">
      Upload your dance moves, workout videos, or musical performances to inspire the community
    </UploadSubtext>
  </UploadCard>
);

export default CreativeGalleryUploadCard;
