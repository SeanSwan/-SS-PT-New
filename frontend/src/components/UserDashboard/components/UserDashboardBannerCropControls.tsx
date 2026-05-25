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
  BannerImage,
  BannerRepositionAnchor,
  BannerRepositionButton,
  BannerRepositionPanel,
  BannerUploadButton,
} from '../styles/DashboardV3Styles';
import {
  BANNER_OBJECT_FIT_OPTIONS,
  DEFAULT_BANNER_IMAGE_SCALE,
  DEFAULT_BANNER_OBJECT_FIT,
  DEFAULT_BANNER_OBJECT_POSITION,
  type BannerCropState,
  type BannerObjectFit,
  type BannerObjectPosition,
} from '../../../services/profileService';

interface UserDashboardBannerCropControlsProps {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  showRepositionPanel: boolean;
  onToggleRepositionPanel: () => void;
  onBannerCropPreview: (next: BannerCropState) => void;
  onBannerCropCommit: (next: BannerCropState) => void;
  onBackgroundClick: () => void;
}

const POSITION_PATTERN = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/;
const FIT_LABELS: Record<BannerObjectFit, string> = {
  cover: 'Crop',
  contain: 'Fit whole',
  fill: 'Stretch',
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
const formatPercent = (value: number) => `${Number(value.toFixed(2))}%`;

const parsePosition = (position: BannerObjectPosition) => {
  const match = position.match(POSITION_PATTERN);
  return {
    x: match ? Number(match[1]) : 50,
    y: match ? Number(match[2]) : 50,
  };
};

const formatPosition = (x: number, y: number): BannerObjectPosition =>
  `${formatPercent(clampPercent(x))} ${formatPercent(clampPercent(y))}`;

const UserDashboardBannerCropControls: React.FC<UserDashboardBannerCropControlsProps> = ({
  backgroundImage,
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  showRepositionPanel,
  onToggleRepositionPanel,
  onBannerCropPreview,
  onBannerCropCommit,
  onBackgroundClick,
}) => {
  const cropState = React.useMemo<BannerCropState>(() => ({
    position: bannerObjectPosition,
    fit: bannerObjectFit,
    scale: bannerImageScale,
  }), [bannerImageScale, bannerObjectFit, bannerObjectPosition]);
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
    onBannerCropPreview({ ...cropStateRef.current, ...next });
  }, [onBannerCropPreview]);

  const commitCrop = React.useCallback((next: Partial<BannerCropState>) => {
    onBannerCropCommit({ ...cropStateRef.current, ...next });
  }, [onBannerCropCommit]);

  const handleBannerPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!showRepositionPanel || !backgroundImage) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: parsePosition(cropStateRef.current.position),
      nextPosition: cropStateRef.current.position,
    };
  }, [backgroundImage, showRepositionPanel]);

  const handleBannerPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = rect.width > 0 ? ((event.clientX - dragState.startX) / rect.width) * 100 : 0;
    const dy = rect.height > 0 ? ((event.clientY - dragState.startY) / rect.height) * 100 : 0;
    const nextPosition = formatPosition(
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

  const handleScaleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    previewCrop({ scale: Number(event.target.value) });
  }, [previewCrop]);

  const handleScaleCommit = React.useCallback(() => {
    commitCrop({ scale: cropStateRef.current.scale });
  }, [commitCrop]);

  const handleCropReset = React.useCallback(() => {
    const resetCrop: BannerCropState = {
      position: DEFAULT_BANNER_OBJECT_POSITION,
      fit: DEFAULT_BANNER_OBJECT_FIT,
      scale: DEFAULT_BANNER_IMAGE_SCALE,
    };
    onBannerCropPreview(resetCrop);
    onBannerCropCommit(resetCrop);
  }, [onBannerCropCommit, onBannerCropPreview]);

  return (
    <>
      <BackgroundSection
        $backgroundImage={backgroundImage}
        $repositioning={showRepositionPanel && Boolean(backgroundImage)}
        onPointerDown={handleBannerPointerDown}
        onPointerMove={handleBannerPointerMove}
        onPointerUp={handleBannerPointerEnd}
        onPointerCancel={handleBannerPointerEnd}
      >
        {backgroundImage && (
          <BannerImage
            src={backgroundImage}
            alt="Profile cover photo"
            style={{
              objectFit: bannerObjectFit,
              objectPosition: bannerObjectPosition,
              '--banner-image-scale': String(bannerImageScale),
            } as React.CSSProperties}
            draggable={false}
          />
        )}
      </BackgroundSection>
      <BannerActionRow>
        {backgroundImage && (
          <BannerRepositionAnchor>
            <BannerRepositionButton
              type="button"
              onClick={onToggleRepositionPanel}
              aria-expanded={showRepositionPanel}
              aria-haspopup="dialog"
              aria-label="Reposition cover photo"
            >
              <Move size={18} />
              Reposition
            </BannerRepositionButton>
            {showRepositionPanel && (
              <BannerRepositionPanel role="dialog" aria-label="Adjust cover photo crop">
                <BannerCropHint>Drag the cover photo to frame it.</BannerCropHint>
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
                <BannerCropField>
                  <span>Zoom</span>
                  <BannerCropValue>{Math.round(bannerImageScale * 100)}%</BannerCropValue>
                  <BannerCropSlider
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={bannerImageScale}
                    onChange={handleScaleChange}
                    onPointerUp={handleScaleCommit}
                    onBlur={handleScaleCommit}
                    aria-label="Cover photo zoom"
                  />
                </BannerCropField>
                <BannerCropResetButton type="button" onClick={handleCropReset}>
                  <RotateCcw size={16} />
                  Reset
                </BannerCropResetButton>
              </BannerRepositionPanel>
            )}
          </BannerRepositionAnchor>
        )}
        <BannerUploadButton onClick={onBackgroundClick}>
          <Camera size={18} />
          {backgroundImage ? 'Change Cover' : 'Add Cover'}
        </BannerUploadButton>
      </BannerActionRow>
    </>
  );
};

export default React.memo(UserDashboardBannerCropControls);
