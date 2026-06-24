/**
 * FILE: HomeTabSelectedMediaPreview.tsx
 * PURPOSE: Selected Quick Post media preview for the user-dashboard Home composer.
 */
import React from 'react';
import { X } from 'lucide-react';
import { GlassButton } from './HomeTabVisionCards.styles';
import {
  SelectedMediaCopy,
  SelectedMediaFrame,
  SelectedMediaPreview,
} from './HomeTabVisionCenter.styles';

interface HomeTabSelectedMediaPreviewProps {
  previewUrl: string;
  mediaType?: string;
  fileName?: string;
  onClear: () => void;
}

const HomeTabSelectedMediaPreview: React.FC<HomeTabSelectedMediaPreviewProps> = ({
  previewUrl,
  mediaType,
  fileName,
  onClear,
}) => {
  const selectedMediaIsVideo = !!mediaType?.startsWith('video/');

  return (
    <SelectedMediaPreview>
      <SelectedMediaFrame>
        {selectedMediaIsVideo ? (
          <video src={previewUrl} controls muted playsInline preload="metadata" aria-label="Selected media preview" />
        ) : (
          <img src={previewUrl} alt="Selected media preview" />
        )}
      </SelectedMediaFrame>
      <SelectedMediaCopy>
        <span>Selected media preview</span>
        <strong>{fileName || 'Media ready'}</strong>
      </SelectedMediaCopy>
      <GlassButton type="button" $variant="ghost" onClick={onClear} aria-label="Remove selected media">
        <X size={15} aria-hidden="true" />
        Remove media
      </GlassButton>
    </SelectedMediaPreview>
  );
};

export default HomeTabSelectedMediaPreview;