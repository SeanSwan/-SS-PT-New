/**
 * Preview rail for the active social post composer.
 */

import React from 'react';
import { Shield } from 'lucide-react';
import type { PlatformConfig } from './marketing.types';
import {
  PreviewAvatar,
  PreviewBody,
  PreviewCard,
  PreviewHeader,
  PreviewName,
  PreviewTags,
  PublishingNote,
  StatusBanner,
} from './SocialPostPreview.styles';

interface SocialPostPreviewProps {
  config: PlatformConfig;
  caption: string;
  selectedTags: string[];
}

const SocialPostPreview: React.FC<SocialPostPreviewProps> = ({ config, caption, selectedTags }) => (
  <div>
    <PreviewCard $color={config.color}>
      <PreviewHeader>
        <PreviewAvatar>SS</PreviewAvatar>
        <PreviewName>SwanStudios</PreviewName>
      </PreviewHeader>
      <PreviewBody>{caption || 'Your post preview will appear here...'}</PreviewBody>
      {selectedTags.length > 0 && <PreviewTags>{selectedTags.join(' ')}</PreviewTags>}
    </PreviewCard>

    <StatusBanner $tone="purple" $spaced>
      <Shield size={14} />
      <PublishingNote>
        All posts checked for FTC/FDA compliance before publishing.
        Powered by SwanStudios native scheduling.
      </PublishingNote>
    </StatusBanner>
  </div>
);

export default SocialPostPreview;
