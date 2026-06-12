import React from 'react';
import { Film, Image, Plus, Save, Trash2 } from 'lucide-react';
import {
  BannerCollageControlGrid,
  BannerCollageThumb,
  BannerCollageThumbButton,
  BannerCollageThumbVideo,
  BannerPresetApplyButton,
  BannerPresetGrid,
  BannerPresetRemoveButton,
  BannerPresetRow,
  BannerStickyToggle,
  BannerCropHint,
  BannerCropModeButton,
  BannerCropModeRow,
  BannerCropResetButton,
} from '../styles/DashboardV3Styles';
import {
  BANNER_COLLAGE_LAYOUT_OPTIONS,
  BANNER_COLLAGE_MEDIA_TYPES,
  MAX_BANNER_COLLAGE_PHOTOS,
  MAX_BANNER_COLLAGE_VIDEOS,
  isBannerCarouselLayout,
  type BannerCollageLayout,
  type BannerObjectPosition,
  type BannerPreset,
} from '../../../services/profileService';
import { isBannerVideoUrl } from '../utils/bannerCompositionMedia';

const COLLAGE_FOCUS_OPTIONS: Array<{ label: string; aria: string; position: BannerObjectPosition }> = [
  { label: 'Top', aria: 'Collage focus top', position: '50% 0%' },
  { label: 'Center', aria: 'Collage focus center', position: '50% 50%' },
  { label: 'Bottom', aria: 'Collage focus bottom', position: '50% 100%' },
  { label: 'Left', aria: 'Collage focus left', position: '0% 50%' },
  { label: 'Right', aria: 'Collage focus right', position: '100% 50%' },
];

const COLLAGE_LAYOUT_LABELS: Record<BannerCollageLayout, { label: string; aria: string }> = {
  stream: { label: 'Stream', aria: 'stream' },
  mosaic: { label: 'Mosaic', aria: 'mosaic' },
  spotlight: { label: 'Spotlight', aria: 'spotlight' },
  crossfade: { label: 'Crossfade', aria: 'cinematic crossfade hero' },
  'carousel-reel': { label: 'Reel', aria: 'reel carousel' },
  'carousel-cinema': { label: 'Cinema', aria: 'cinema carousel' },
  'carousel-coverflow': { label: 'Coverflow', aria: 'coverflow carousel' },
  'carousel-stack': { label: 'Stack', aria: 'stack carousel' },
  'carousel-ticker': { label: 'Ticker', aria: 'ticker carousel' },
};

interface UserDashboardBannerCollageStripProps {
  photos: string[];
  position: BannerObjectPosition;
  layout: BannerCollageLayout;
  stickyCarousel: boolean;
  presets: BannerPreset[];
  onFiles: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
  onFocusChange: (position: BannerObjectPosition) => void;
  onLayoutChange: (layout: BannerCollageLayout) => void;
  onStickyCarouselChange: (sticky: boolean) => void;
  onPresetSave: () => void;
  onPresetApply: (presetId: string) => void;
  onPresetRemove: (presetId: string) => void;
}

const UserDashboardBannerCollageStrip: React.FC<UserDashboardBannerCollageStripProps> = ({
  photos,
  position,
  layout,
  stickyCarousel,
  presets,
  onFiles,
  onRemove,
  onFocusChange,
  onLayoutChange,
  onStickyCarouselChange,
  onPresetSave,
  onPresetApply,
  onPresetRemove,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isFull = photos.length >= MAX_BANNER_COLLAGE_PHOTOS;
  const accept = BANNER_COLLAGE_MEDIA_TYPES.join(',');
  const carouselSelected = isBannerCarouselLayout(layout);

  return (
    <>
      <BannerCropHint>
        Collage mode layers up to {MAX_BANNER_COLLAGE_PHOTOS} media items, with {MAX_BANNER_COLLAGE_VIDEOS} short videos max.
      </BannerCropHint>
      <BannerCropModeRow>
        {BANNER_COLLAGE_LAYOUT_OPTIONS.map((option) => (
          <BannerCropModeButton
            key={option}
            type="button"
            $active={layout === option}
            aria-label={`Collage layout ${COLLAGE_LAYOUT_LABELS[option].aria}`}
            aria-pressed={layout === option}
            onClick={() => onLayoutChange(option)}
          >
            {COLLAGE_LAYOUT_LABELS[option].label}
          </BannerCropModeButton>
        ))}
      </BannerCropModeRow>
      {carouselSelected && (
        <BannerStickyToggle>
          <input
            type="checkbox"
            checked={stickyCarousel}
            aria-label="Keep mini carousel sticky while scrolling"
            onChange={(event) => onStickyCarouselChange(event.target.checked)}
          />
          <span>Sticky mini carousel</span>
        </BannerStickyToggle>
      )}
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
      <BannerCropResetButton
        type="button"
        onClick={onPresetSave}
        aria-label="Save banner preset"
      >
        <Save size={16} />
        Save preset
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
      {presets.length > 0 && (
        <BannerPresetGrid aria-label="Saved banner presets">
          {presets.map((preset) => (
            <BannerPresetRow key={preset.id}>
              <BannerPresetApplyButton
                type="button"
                onClick={() => onPresetApply(preset.id)}
                aria-label={`Apply banner preset ${preset.name}`}
              >
                {preset.name}
              </BannerPresetApplyButton>
              <BannerPresetRemoveButton
                type="button"
                onClick={() => onPresetRemove(preset.id)}
                aria-label={`Remove banner preset ${preset.name}`}
              >
                <Trash2 size={14} />
              </BannerPresetRemoveButton>
            </BannerPresetRow>
          ))}
        </BannerPresetGrid>
      )}
    </>
  );
};

export default React.memo(UserDashboardBannerCollageStrip);
