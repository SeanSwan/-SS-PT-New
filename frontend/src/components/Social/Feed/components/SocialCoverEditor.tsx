/**
 * ============================================================================
 * FILE: SocialCoverEditor.tsx
 * PURPOSE: Embedded cover/banner editor for the canonical user dashboard cover.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-12
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Lazily mounted when the cover's "Edit cover" button is
 * pressed. Reuses the dashboard banner machinery - useProfile,
 * useBannerCompositionState, CoverStudioPanel, and UserDashboardBannerMediaLayer.
 * The preview itself is draggable so users can position the visible media
 * directly, then the crop state persists through the existing profile update
 * lane.
 *
 * KEY DECISIONS:
 * - useProfile is heavy, so it mounts only inside this edit session.
 * - Drag reposition writes percentage object-position values that hydrate across
 *   the live cover, editor preview, and sticky carousel layer.
 * - onClose tells the parent to refresh the live cover once per edit session.
 * ============================================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { useProfile } from '../../../../hooks/profile/useProfile';
import { useBannerCompositionState } from '../../../UserDashboard/hooks/useBannerCompositionState';
import { formatBannerPosition, parseBannerPosition } from '../../../UserDashboard/utils/bannerCompositionMedia';
import type { BannerCropState, BannerObjectPosition } from '../../../../services/profileService';
import CoverStudioPanel from './CoverStudioPanel';
import UserDashboardBannerMediaLayer from '../../../UserDashboard/components/UserDashboardBannerMediaLayer';
import {
  EditorBody,
  EditorButton,
  EditorCard,
  EditorHeader,
  EditorPreviewColumn,
  EditorTitle,
  PanelWell,
  PreviewFrame,
} from './SocialCoverEditor.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface SocialCoverEditorProps {
  /** Close the editor; the parent refreshes the live cover. */
  onClose: () => void;
  dashboardBackgroundControls?: React.ReactNode;
}

const SocialCoverEditor: React.FC<SocialCoverEditorProps> = ({ onClose, dashboardBackgroundControls }) => {
  const {
    profile,
    updateProfile,
    uploadBannerPhoto,
    uploadBannerCollagePhoto,
    isUploading,
  } = useProfile();

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  useEffect(() => {
    setBackgroundImage(profile?.bannerPhoto ?? null);
  }, [profile?.bannerPhoto]);

  const composition = useBannerCompositionState({
    profile,
    updateProfile,
    uploadBannerCollagePhoto,
    onBannerPhotoPreview: setBackgroundImage,
  });

  const currentCropRef = useRef<BannerCropState>({
    position: composition.bannerObjectPosition,
    fit: composition.bannerObjectFit,
    scale: composition.bannerImageScale,
    height: composition.bannerFrameHeight,
  });
  const previewDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPosition: { x: number; y: number };
    startPositionValue: BannerObjectPosition;
    nextPosition: BannerObjectPosition;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    currentCropRef.current = {
      position: composition.bannerObjectPosition,
      fit: composition.bannerObjectFit,
      scale: composition.bannerImageScale,
      height: composition.bannerFrameHeight,
    };
  }, [
    composition.bannerFrameHeight,
    composition.bannerImageScale,
    composition.bannerObjectFit,
    composition.bannerObjectPosition,
  ]);

  const canDragPreview = composition.bannerObjectFit === 'collage'
    ? composition.bannerCollagePhotos.length > 0
    : Boolean(backgroundImage);

  const previewCropAtPosition = React.useCallback((position: BannerObjectPosition) => {
    const next = { ...currentCropRef.current, position };
    currentCropRef.current = next;
    composition.previewBannerCrop(next);
  }, [composition]);

  const commitCropAtPosition = React.useCallback((position: BannerObjectPosition) => {
    const next = { ...currentCropRef.current, position };
    currentCropRef.current = next;
    void composition.handleBannerCropCommit(next);
  }, [composition]);

  const handlePreviewPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!canDragPreview) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    previewDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: parseBannerPosition(currentCropRef.current.position),
      startPositionValue: currentCropRef.current.position,
      nextPosition: currentCropRef.current.position,
      moved: false,
    };
  }, [canDragPreview]);

  const handlePreviewPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = previewDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = rect.width > 0 ? ((event.clientX - dragState.startX) / rect.width) * 100 : 0;
    const dy = rect.height > 0 ? ((event.clientY - dragState.startY) / rect.height) * 100 : 0;
    const nextPosition = formatBannerPosition(
      dragState.startPosition.x - dx,
      dragState.startPosition.y - dy,
    );
    const moved = dragState.moved || nextPosition !== dragState.startPositionValue;
    previewDragRef.current = { ...dragState, nextPosition, moved };
    if (nextPosition !== dragState.nextPosition) {
      previewCropAtPosition(nextPosition);
    }
  }, [previewCropAtPosition]);

  const handlePreviewPointerEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = previewDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    previewDragRef.current = null;
    if (dragState.moved && dragState.nextPosition !== dragState.startPositionValue) {
      commitCropAtPosition(dragState.nextPosition);
    }
  }, [commitCropAtPosition]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadBannerPhoto(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  return (
    <EditorCard aria-label="Edit your cover">
      <EditorHeader>
        <EditorTitle>Edit your cover</EditorTitle>
        <EditorButton
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera size={15} />
          {backgroundImage ? 'Change photo' : 'Add photo'}
        </EditorButton>
        <StyledBox as="input"
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          $style={{ display: 'none' }}
          onChange={handlePhotoSelected}
        />
        <EditorButton type="button" onClick={onClose} aria-label="Accept cover changes">
          <Check size={15} />
          Accept Changes
        </EditorButton>
      </EditorHeader>

      <EditorBody data-testid="cover-editor-workspace">
        <EditorPreviewColumn>
          <PreviewFrame
            data-testid="cover-editor-preview-frame"
            aria-label={canDragPreview ? 'Drag cover preview to reposition' : 'Cover preview'}
            $draggable={canDragPreview}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerEnd}
            onPointerCancel={handlePreviewPointerEnd}
          >
            <UserDashboardBannerMediaLayer
              backgroundImage={backgroundImage}
              bannerObjectPosition={composition.bannerObjectPosition}
              bannerObjectFit={composition.bannerObjectFit}
              bannerImageScale={composition.bannerImageScale}
              bannerCollagePhotos={composition.bannerCollagePhotos}
              bannerCollageLayout={composition.bannerCollageLayout}
              bannerStickyCarousel={false}
            />
          </PreviewFrame>
        </EditorPreviewColumn>

        <PanelWell data-testid="cover-editor-controls">
          <CoverStudioPanel
            dashboardBackgroundControls={dashboardBackgroundControls}
            bannerObjectPosition={composition.bannerObjectPosition}
            bannerObjectFit={composition.bannerObjectFit}
            bannerImageScale={composition.bannerImageScale}
            bannerFrameHeight={composition.bannerFrameHeight}
            bannerCollagePhotos={composition.bannerCollagePhotos}
            bannerCollageLayout={composition.bannerCollageLayout}
            bannerStickyCarousel={composition.bannerStickyCarousel}
            bannerPresets={composition.bannerPresets}
            onBannerCropPreview={composition.previewBannerCrop}
            onBannerCropCommit={composition.handleBannerCropCommit}
            onBannerCollageFiles={composition.handleBannerCollageFiles}
            onBannerCollageRemove={composition.handleBannerCollageRemove}
            onBannerCollageShuffle={composition.handleBannerCollageShuffle}
            onBannerCollageLayoutCommit={composition.handleBannerCollageLayoutCommit}
            onBannerStickyCarouselCommit={composition.handleBannerStickyCarouselCommit}
            onBannerPresetSave={composition.handleBannerPresetSave}
            onBannerPresetApply={composition.handleBannerPresetApply}
            onBannerPresetRemove={composition.handleBannerPresetRemove}
          />
        </PanelWell>
      </EditorBody>
    </EditorCard>
  );
};

export default SocialCoverEditor;
