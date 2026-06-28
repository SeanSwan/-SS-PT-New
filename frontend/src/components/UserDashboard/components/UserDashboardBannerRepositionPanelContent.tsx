import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  BannerCropField,
  BannerCropHint,
  BannerCropModeButton,
  BannerCropModeRow,
  BannerCropResetButton,
  BannerCropSlider,
  BannerCropValue,
} from '../styles/DashboardV3Styles';
import {
  BANNER_OBJECT_FIT_OPTIONS,
  DEFAULT_BANNER_FRAME_HEIGHT,
  DEFAULT_BANNER_IMAGE_SCALE,
  DEFAULT_BANNER_OBJECT_FIT,
  DEFAULT_BANNER_OBJECT_POSITION,
  MAX_BANNER_FRAME_HEIGHT,
  MIN_BANNER_FRAME_HEIGHT,
  type BannerCollageLayout,
  type BannerCropState,
  type BannerObjectFit,
  type BannerObjectPosition,
  type BannerPreset,
} from '../../../services/profileService';
import UserDashboardBannerCollageStrip from './UserDashboardBannerCollageStrip';
import { FIT_LABELS } from '../utils/bannerCompositionMedia';

interface RepositionPanelContentProps {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerFrameHeight: number;
  bannerCollagePhotos: string[];
  bannerCollageLayout: BannerCollageLayout;
  bannerStickyCarousel: boolean;
  bannerPresets: BannerPreset[];
  canDragBanner: boolean;
  onBannerCropPreview: (next: BannerCropState) => void;
  onBannerCropCommit: (next: BannerCropState) => void;
  onBannerCollageFiles: (files: FileList | File[]) => void;
  onBannerCollageRemove: (index: number) => void;
  onBannerCollageLayoutCommit: (layout: BannerCollageLayout) => void;
  onBannerStickyCarouselCommit: (sticky: boolean) => void;
  onBannerPresetSave: () => void;
  onBannerPresetApply: (presetId: string) => void;
  onBannerPresetRemove: (presetId: string) => void;
  onBannerCollageShuffle?: () => void;
}

const UserDashboardBannerRepositionPanelContent: React.FC<RepositionPanelContentProps> = ({
  backgroundImage,
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  bannerFrameHeight,
  bannerCollagePhotos,
  bannerCollageLayout,
  bannerStickyCarousel,
  bannerPresets,
  canDragBanner,
  onBannerCropPreview,
  onBannerCropCommit,
  onBannerCollageFiles,
  onBannerCollageRemove,
  onBannerCollageLayoutCommit,
  onBannerStickyCarouselCommit,
  onBannerPresetSave,
  onBannerPresetApply,
  onBannerPresetRemove,
  onBannerCollageShuffle,
}) => {
  const cropState = React.useMemo<BannerCropState>(() => ({
    position: bannerObjectPosition,
    fit: bannerObjectFit,
    scale: bannerImageScale,
    height: bannerFrameHeight,
  }), [bannerFrameHeight, bannerImageScale, bannerObjectFit, bannerObjectPosition]);
  const cropStateRef = React.useRef(cropState);

  React.useEffect(() => {
    cropStateRef.current = cropState;
  }, [cropState]);

  const previewCrop = React.useCallback((next: Partial<BannerCropState>) => {
    const merged = { ...cropStateRef.current, ...next };
    cropStateRef.current = merged;
    onBannerCropPreview(merged);
  }, [onBannerCropPreview]);

  const commitCrop = React.useCallback((next: Partial<BannerCropState>) => {
    const merged = { ...cropStateRef.current, ...next };
    cropStateRef.current = merged;
    onBannerCropCommit(merged);
  }, [onBannerCropCommit]);

  const handleFitChange = React.useCallback((fit: BannerObjectFit) => {
    const next: BannerCropState = {
      ...cropStateRef.current,
      fit,
      scale: fit === 'contain' ? Math.min(cropStateRef.current.scale, 1) : cropStateRef.current.scale,
    };
    onBannerCropPreview(next);
    onBannerCropCommit(next);
  }, [onBannerCropCommit, onBannerCropPreview]);

  const handleCollageFocusChange = React.useCallback((position: BannerObjectPosition) => {
    const next: BannerCropState = { ...cropStateRef.current, fit: 'collage', position };
    cropStateRef.current = next;
    onBannerCropPreview(next);
    onBannerCropCommit(next);
  }, [onBannerCropCommit, onBannerCropPreview]);

  const handleCropReset = React.useCallback(() => {
    const resetCrop: BannerCropState = {
      position: DEFAULT_BANNER_OBJECT_POSITION,
      fit: DEFAULT_BANNER_OBJECT_FIT,
      scale: DEFAULT_BANNER_IMAGE_SCALE,
      height: DEFAULT_BANNER_FRAME_HEIGHT,
    };
    onBannerCropPreview(resetCrop);
    onBannerCropCommit(resetCrop);
  }, [onBannerCropCommit, onBannerCropPreview]);

  const scaleLabel = bannerObjectFit === 'tile'
    ? 'Tile size'
    : bannerObjectFit === 'collage'
      ? 'Collage media size'
      : 'Zoom';
  const scaleAriaLabel = bannerObjectFit === 'tile'
    ? 'Banner tile size'
    : bannerObjectFit === 'collage'
      ? 'Collage media size'
      : 'Cover photo zoom';
  const cropHint = canDragBanner
    ? bannerObjectFit === 'collage'
      ? 'Drag the collage to set its shared focal point.'
      : 'Drag the cover photo to frame it.'
    : 'Choose a cover mode and frame size.';

  return (
    <>
      <BannerCropHint>{cropHint}</BannerCropHint>
      <BannerCropModeRow>
        {BANNER_OBJECT_FIT_OPTIONS.map((fit) => (
          <BannerCropModeButton
            key={fit}
            type="button"
            $active={bannerObjectFit === fit}
            onClick={() => handleFitChange(fit)}
            aria-pressed={bannerObjectFit === fit}
          >
            {FIT_LABELS[fit]}
          </BannerCropModeButton>
        ))}
      </BannerCropModeRow>
      {bannerObjectFit === 'collage' && (
        <UserDashboardBannerCollageStrip
          photos={bannerCollagePhotos}
          position={bannerObjectPosition}
          layout={bannerCollageLayout}
          stickyCarousel={bannerStickyCarousel}
          presets={bannerPresets}
          onFiles={onBannerCollageFiles}
          onRemove={onBannerCollageRemove}
          onFocusChange={handleCollageFocusChange}
          onLayoutChange={onBannerCollageLayoutCommit}
          onStickyCarouselChange={onBannerStickyCarouselCommit}
          onPresetSave={onBannerPresetSave}
          onPresetApply={onBannerPresetApply}
          onPresetRemove={onBannerPresetRemove}
          onShuffle={onBannerCollageShuffle}
        />
      )}
      {bannerObjectFit !== 'contain' && (
        <BannerCropField>
          <span>{scaleLabel}</span>
          <BannerCropValue>{Math.round(bannerImageScale * 100)}%</BannerCropValue>
          <BannerCropSlider
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={bannerImageScale}
            onChange={(event) => previewCrop({ scale: Number(event.target.value) })}
            onInput={(event) => previewCrop({ scale: Number(event.currentTarget.value) })}
            onPointerUp={() => commitCrop({ scale: cropStateRef.current.scale })}
            onBlur={() => commitCrop({ scale: cropStateRef.current.scale })}
            aria-label={scaleAriaLabel}
          />
        </BannerCropField>
      )}
      <BannerCropField>
        <span>Height</span>
        <BannerCropValue>{bannerFrameHeight}px</BannerCropValue>
        <BannerCropSlider
          type="range"
          min={MIN_BANNER_FRAME_HEIGHT}
          max={MAX_BANNER_FRAME_HEIGHT}
          step="20"
          value={bannerFrameHeight}
          onChange={(event) => previewCrop({ height: Number(event.target.value) })}
          onInput={(event) => previewCrop({ height: Number(event.currentTarget.value) })}
          onPointerUp={() => commitCrop({ height: cropStateRef.current.height })}
          onBlur={() => commitCrop({ height: cropStateRef.current.height })}
          aria-label="Cover banner height"
        />
      </BannerCropField>
      <BannerCropResetButton type="button" onClick={handleCropReset}>
        <RotateCcw size={16} />
        Reset
      </BannerCropResetButton>
    </>
  );
};

export default React.memo(UserDashboardBannerRepositionPanelContent);
