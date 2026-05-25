/**
 * Manual cover-photo crop controls for UserDashboard V3.
 */

import React from 'react';
import { Camera, Move, RotateCcw } from 'lucide-react';
import {
  BackgroundSection,
  BannerActionRow,
  BannerCropField,
  BannerCropHint,
  BannerCropModeButton,
  BannerCropModeRow,
  BannerCropResetButton,
  BannerCropSlider,
  BannerCropValue,
  BannerRepositionAnchor,
  BannerRepositionButton,
  BannerRepositionPanel,
  BannerUploadButton,
} from '../styles/DashboardV3Styles';
import {
  BANNER_OBJECT_FIT_OPTIONS,
  DEFAULT_BANNER_FRAME_HEIGHT,
  DEFAULT_BANNER_IMAGE_SCALE,
  DEFAULT_BANNER_OBJECT_FIT,
  DEFAULT_BANNER_OBJECT_POSITION,
  MAX_BANNER_FRAME_HEIGHT,
  MIN_BANNER_FRAME_HEIGHT,
  type BannerCropState,
  type BannerObjectFit,
  type BannerObjectPosition,
} from '../../../services/profileService';
import UserDashboardBannerCollageStrip from './UserDashboardBannerCollageStrip';
import UserDashboardBannerMediaLayer from './UserDashboardBannerMediaLayer';
import {
  FIT_LABELS,
  formatBannerPosition,
  parseBannerPosition,
} from '../utils/bannerCompositionMedia';

interface UserDashboardBannerCropControlsProps {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerFrameHeight: number;
  bannerCollagePhotos: string[];
  showRepositionPanel: boolean;
  onToggleRepositionPanel: () => void;
  onBannerCropPreview: (next: BannerCropState) => void;
  onBannerCropCommit: (next: BannerCropState) => void;
  onBannerCollageFiles: (files: FileList | File[]) => void;
  onBannerCollageRemove: (index: number) => void;
  onBackgroundClick: () => void;
}

const UserDashboardBannerCropControls: React.FC<UserDashboardBannerCropControlsProps> = ({
  backgroundImage,
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  bannerFrameHeight,
  bannerCollagePhotos,
  showRepositionPanel,
  onToggleRepositionPanel,
  onBannerCropPreview,
  onBannerCropCommit,
  onBannerCollageFiles,
  onBannerCollageRemove,
  onBackgroundClick,
}) => {
  const canDragBanner = showRepositionPanel
    && (bannerObjectFit === 'collage' ? bannerCollagePhotos.length > 0 : Boolean(backgroundImage))
    && ['cover', 'collage'].includes(bannerObjectFit);
  const designButtonLabel = backgroundImage ? 'Reposition cover photo' : 'Design cover banner';
  const cropState = React.useMemo<BannerCropState>(() => ({
    position: bannerObjectPosition,
    fit: bannerObjectFit,
    scale: bannerImageScale,
    height: bannerFrameHeight,
  }), [bannerFrameHeight, bannerImageScale, bannerObjectFit, bannerObjectPosition]);
  const cropStateRef = React.useRef(cropState);
  const dragStateRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPosition: { x: number; y: number };
    nextPosition: BannerObjectPosition;
  } | null>(null);

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

  const handleBannerPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!showRepositionPanel) return;
    if (cropStateRef.current.fit === 'collage' && bannerCollagePhotos.length === 0) return;
    if (cropStateRef.current.fit !== 'collage' && !backgroundImage) return;
    if (!['cover', 'collage'].includes(cropStateRef.current.fit)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: parseBannerPosition(cropStateRef.current.position),
      nextPosition: cropStateRef.current.position,
    };
  }, [backgroundImage, bannerCollagePhotos.length, showRepositionPanel]);

  const handleBannerPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = rect.width > 0 ? ((event.clientX - dragState.startX) / rect.width) * 100 : 0;
    const dy = rect.height > 0 ? ((event.clientY - dragState.startY) / rect.height) * 100 : 0;
    const nextPosition = formatBannerPosition(
      dragState.startPosition.x - dx,
      dragState.startPosition.y - dy,
    );
    dragStateRef.current = { ...dragState, nextPosition };
    previewCrop({ position: nextPosition });
  }, [previewCrop]);

  const handleBannerPointerEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    commitCrop({ position: dragState.nextPosition });
  }, [commitCrop]);

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

  const handleScaleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    previewCrop({ scale: Number(event.target.value) });
  }, [previewCrop]);

  const handleScaleCommit = React.useCallback(() => {
    commitCrop({ scale: cropStateRef.current.scale });
  }, [commitCrop]);

  const handleHeightChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    previewCrop({ height: Number(event.target.value) });
  }, [previewCrop]);

  const handleHeightCommit = React.useCallback(() => {
    commitCrop({ height: cropStateRef.current.height });
  }, [commitCrop]);

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
  const showScaleControl = bannerObjectFit !== 'contain';
  const cropHint = canDragBanner
    ? bannerObjectFit === 'collage'
      ? 'Drag the collage to set its shared focal point.'
      : 'Drag the cover photo to frame it.'
    : 'Choose a cover mode and frame size.';

  return (
    <>
      <BackgroundSection
        $backgroundImage={backgroundImage}
        $repositioning={canDragBanner}
        style={{ '--banner-frame-height': `${bannerFrameHeight}px` } as React.CSSProperties}
        onPointerDown={handleBannerPointerDown}
        onPointerMove={handleBannerPointerMove}
        onPointerUp={handleBannerPointerEnd}
        onPointerCancel={handleBannerPointerEnd}
      >
        <UserDashboardBannerMediaLayer
          backgroundImage={backgroundImage}
          bannerObjectPosition={bannerObjectPosition}
          bannerObjectFit={bannerObjectFit}
          bannerImageScale={bannerImageScale}
          bannerCollagePhotos={bannerCollagePhotos}
        />
      </BackgroundSection>
      <BannerActionRow>
        <BannerRepositionAnchor>
          <BannerRepositionButton
            type="button"
            onClick={onToggleRepositionPanel}
            aria-expanded={showRepositionPanel}
            aria-haspopup="dialog"
            aria-label={designButtonLabel}
          >
            <Move size={18} />
            {backgroundImage ? 'Reposition' : 'Design Cover'}
          </BannerRepositionButton>
          {showRepositionPanel && (
            <BannerRepositionPanel role="dialog" aria-label="Adjust cover photo crop">
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
                  onFiles={onBannerCollageFiles}
                  onRemove={onBannerCollageRemove}
                  onFocusChange={handleCollageFocusChange}
                />
              )}
              {showScaleControl && (
                <BannerCropField>
                  <span>{scaleLabel}</span>
                  <BannerCropValue>{Math.round(bannerImageScale * 100)}%</BannerCropValue>
                  <BannerCropSlider
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={bannerImageScale}
                    onChange={handleScaleChange}
                    onInput={handleScaleChange}
                    onPointerUp={handleScaleCommit}
                    onBlur={handleScaleCommit}
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
                  onChange={handleHeightChange}
                  onInput={handleHeightChange}
                  onPointerUp={handleHeightCommit}
                  onBlur={handleHeightCommit}
                  aria-label="Cover banner height"
                />
              </BannerCropField>
              <BannerCropResetButton type="button" onClick={handleCropReset}>
                <RotateCcw size={16} />
                Reset
              </BannerCropResetButton>
            </BannerRepositionPanel>
          )}
        </BannerRepositionAnchor>
        <BannerUploadButton onClick={onBackgroundClick}>
          <Camera size={18} />
          {backgroundImage ? 'Change Cover' : 'Add Cover'}
        </BannerUploadButton>
      </BannerActionRow>
    </>
  );
};

export default React.memo(UserDashboardBannerCropControls);
