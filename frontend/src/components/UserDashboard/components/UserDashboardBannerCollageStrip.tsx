import React from 'react';
import { Film, Image, Plus } from 'lucide-react';
import {
  BannerCollageControlGrid,
  BannerCollageThumb,
  BannerCollageThumbButton,
  BannerCollageThumbVideo,
  BannerCropHint,
  BannerCropModeButton,
  BannerCropModeRow,
  BannerCropResetButton,
} from '../styles/DashboardV3Styles';
import {
  BANNER_COLLAGE_MEDIA_TYPES,
  MAX_BANNER_COLLAGE_PHOTOS,
  type BannerObjectPosition,
} from '../../../services/profileService';
import { isBannerVideoUrl } from '../utils/bannerCompositionMedia';

const COLLAGE_FOCUS_OPTIONS: Array<{ label: string; aria: string; position: BannerObjectPosition }> = [
  { label: 'Top', aria: 'Collage focus top', position: '50% 0%' },
  { label: 'Center', aria: 'Collage focus center', position: '50% 50%' },
  { label: 'Bottom', aria: 'Collage focus bottom', position: '50% 100%' },
  { label: 'Left', aria: 'Collage focus left', position: '0% 50%' },
  { label: 'Right', aria: 'Collage focus right', position: '100% 50%' },
];

interface UserDashboardBannerCollageStripProps {
  photos: string[];
  position: BannerObjectPosition;
  onFiles: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
  onFocusChange: (position: BannerObjectPosition) => void;
}

const UserDashboardBannerCollageStrip: React.FC<UserDashboardBannerCollageStripProps> = ({
  photos,
  position,
  onFiles,
  onRemove,
  onFocusChange,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isFull = photos.length >= MAX_BANNER_COLLAGE_PHOTOS;
  const accept = BANNER_COLLAGE_MEDIA_TYPES.join(',');

  return (
    <>
      <BannerCropHint>Collage mode layers up to six photos or short videos.</BannerCropHint>
      <BannerCropHint>Set a shared focal point, then use Collage media size to tighten or reveal each frame.</BannerCropHint>
      <BannerCropModeRow>
        {COLLAGE_FOCUS_OPTIONS.map((option) => (
          <BannerCropModeButton
            key={option.aria}
            type="button"
            $active={position === option.position}
            aria-label={option.aria}
            aria-pressed={position === option.position}
            onClick={() => onFocusChange(option.position)}
          >
            {option.label}
          </BannerCropModeButton>
        ))}
      </BannerCropModeRow>
      <BannerCropResetButton
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isFull}
      >
        <Plus size={16} />
        {isFull ? 'Full' : 'Add photos/videos'}
      </BannerCropResetButton>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        aria-label="Add collage media"
        onChange={(event) => {
          if (event.target.files) onFiles(event.target.files);
          event.currentTarget.value = '';
        }}
      />
      {photos.length > 0 ? (
        <BannerCollageControlGrid>
          {photos.map((photo, index) => (
            <BannerCollageThumbButton
              key={`${photo}-${index}`}
              type="button"
              aria-label={`Remove collage media ${index + 1}`}
              onClick={() => onRemove(index)}
            >
              {isBannerVideoUrl(photo) ? (
                <BannerCollageThumbVideo src={photo} muted playsInline preload="metadata" />
              ) : (
                <BannerCollageThumb src={photo} alt="" />
              )}
            </BannerCollageThumbButton>
          ))}
        </BannerCollageControlGrid>
      ) : (
        <BannerCropHint>
          <Image size={14} aria-hidden="true" /> <Film size={14} aria-hidden="true" /> Add media to build a futuristic banner grid.
        </BannerCropHint>
      )}
    </>
  );
};

export default React.memo(UserDashboardBannerCollageStrip);
