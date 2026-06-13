/**
 * ============================================================================
 * FILE: SocialCoverEditor.tsx
 * PURPOSE: The cover/banner editor embedded on /social (merge M6a) — edit the
 *          cover where you see it, least clicks (Sean's option 2).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-12
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Lazily mounted when the cover's "Edit cover" button is
 * pressed. Reuses the SAME battle-tested banner machinery the dashboard editor
 * used — useProfile (save/upload lanes), useBannerCompositionState (state +
 * commit handlers), UserDashboardBannerRepositionPanelContent (fit modes,
 * collage strip incl. Crossfade, focus, presets) — plus a live preview frame
 * and a single-photo upload button. Nothing was forked; the M6 redirect can
 * retire the dashboard surface without losing the editor.
 *
 * KEY DECISIONS:
 * - useProfile is heavy, so it mounts ONLY inside this lazily-rendered editor
 *   (an edit session, not a feed-load cost).
 * - canDragBanner is false on /social v1 — repositioning uses the panel's
 *   focus controls; pointer-drag stays a dashboard-era affordance.
 * - onClose tells the parent to refresh the live cover (one refetch per edit
 *   session instead of per keystroke).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { useProfile } from '../../../../hooks/profile/useProfile';
import { useBannerCompositionState } from '../../../UserDashboard/hooks/useBannerCompositionState';
import CoverStudioPanel from './CoverStudioPanel';
import UserDashboardBannerMediaLayer from '../../../UserDashboard/components/UserDashboardBannerMediaLayer';
import {
  EditorButton,
  EditorCard,
  EditorHeader,
  EditorTitle,
  PanelWell,
  PreviewFrame,
} from './SocialCoverEditor.styles';

interface SocialCoverEditorProps {
  /** Close the editor; the parent refreshes the live cover. */
  onClose: () => void;
}

const SocialCoverEditor: React.FC<SocialCoverEditorProps> = ({ onClose }) => {
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
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handlePhotoSelected}
        />
        <EditorButton type="button" onClick={onClose} aria-label="Close cover editor">
          <X size={15} />
          Done
        </EditorButton>
      </EditorHeader>

      <PreviewFrame aria-hidden="true">
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

      <PanelWell>
        <CoverStudioPanel
          bannerObjectPosition={composition.bannerObjectPosition}
          bannerObjectFit={composition.bannerObjectFit}
          bannerImageScale={composition.bannerImageScale}
          bannerFrameHeight={composition.bannerFrameHeight}
          bannerCollagePhotos={composition.bannerCollagePhotos}
          bannerCollageLayout={composition.bannerCollageLayout}
          bannerPresets={composition.bannerPresets}
          onBannerCropPreview={composition.previewBannerCrop}
          onBannerCropCommit={composition.handleBannerCropCommit}
          onBannerCollageFiles={composition.handleBannerCollageFiles}
          onBannerCollageRemove={composition.handleBannerCollageRemove}
          onBannerCollageLayoutCommit={composition.handleBannerCollageLayoutCommit}
          onBannerPresetSave={composition.handleBannerPresetSave}
          onBannerPresetApply={composition.handleBannerPresetApply}
          onBannerPresetRemove={composition.handleBannerPresetRemove}
        />
      </PanelWell>
    </EditorCard>
  );
};

export default SocialCoverEditor;
