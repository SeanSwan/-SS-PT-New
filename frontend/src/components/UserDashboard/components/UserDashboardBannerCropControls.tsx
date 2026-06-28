/**
 * Manual cover-photo crop controls for UserDashboard V3.
 */

import React from 'react';
import { Camera, Move } from 'lucide-react';
import {
  BackgroundSection,
  BannerActionRow,
  BannerRepositionAnchor,
  BannerRepositionButton,
  BannerRepositionPanel,
  BannerStage,
  BannerUploadButton,
} from '../styles/DashboardV3Styles';
import {
  type BannerCropState,
  type BannerCollageLayout,
  type BannerPreset,
  type BannerObjectFit,
  type BannerObjectPosition,
} from '../../../services/profileService';
import UserDashboardBannerMediaLayer from './UserDashboardBannerMediaLayer';
import UserDashboardBannerRepositionPanelContent from './UserDashboardBannerRepositionPanelContent';
import {
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
  bannerCollageLayout: BannerCollageLayout;
  bannerStickyCarousel: boolean;
  bannerPresets: BannerPreset[];
  showRepositionPanel: boolean;
  onToggleRepositionPanel: () => void;
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
  onBackgroundClick: () => void;
}

const UserDashboardBannerCropControls: React.FC<UserDashboardBannerCropControlsProps> = ({
  backgroundImage,
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  bannerFrameHeight,
  bannerCollagePhotos,
  bannerCollageLayout,
  bannerStickyCarousel,
  bannerPresets,
  showRepositionPanel,
  onToggleRepositionPanel,
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

  return (
    <>
      <BannerStage>
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
            bannerCollageLayout={bannerCollageLayout}
            bannerStickyCarousel={bannerStickyCarousel}
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
                <UserDashboardBannerRepositionPanelContent
                  backgroundImage={backgroundImage}
                  bannerObjectPosition={bannerObjectPosition}
                  bannerObjectFit={bannerObjectFit}
                  bannerImageScale={bannerImageScale}
                  bannerFrameHeight={bannerFrameHeight}
                  bannerCollagePhotos={bannerCollagePhotos}
                  bannerCollageLayout={bannerCollageLayout}
                  bannerStickyCarousel={bannerStickyCarousel}
                  bannerPresets={bannerPresets}
                  canDragBanner={canDragBanner}
                  onBannerCropPreview={onBannerCropPreview}
                  onBannerCropCommit={onBannerCropCommit}
                  onBannerCollageFiles={onBannerCollageFiles}
                  onBannerCollageRemove={onBannerCollageRemove}
                  onBannerCollageLayoutCommit={onBannerCollageLayoutCommit}
                  onBannerStickyCarouselCommit={onBannerStickyCarouselCommit}
                  onBannerPresetSave={onBannerPresetSave}
                  onBannerPresetApply={onBannerPresetApply}
                  onBannerPresetRemove={onBannerPresetRemove}
                  onBannerCollageShuffle={onBannerCollageShuffle}
                />
              </BannerRepositionPanel>
            )}
          </BannerRepositionAnchor>
          <BannerUploadButton type="button" onClick={onBackgroundClick}>
            <Camera size={18} />
            {backgroundImage ? 'Change Cover' : 'Add Cover'}
          </BannerUploadButton>
        </BannerActionRow>
      </BannerStage>
    </>
  );
};

export default React.memo(UserDashboardBannerCropControls);
