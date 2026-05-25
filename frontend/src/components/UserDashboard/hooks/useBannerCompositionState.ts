import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_BANNER_FRAME_HEIGHT,
  DEFAULT_BANNER_IMAGE_SCALE,
  DEFAULT_BANNER_OBJECT_FIT,
  DEFAULT_BANNER_OBJECT_POSITION,
  MAX_BANNER_COLLAGE_PHOTOS,
  isBannerObjectFit,
  normalizeBannerCollagePhotos,
  normalizeBannerFrameHeight,
  normalizeBannerImageScale,
  normalizeBannerObjectPosition,
  type BannerCropState,
  type BannerObjectFit,
  type BannerObjectPosition,
  type UserProfile,
} from '../../../services/profileService';
import { sanitizeImageUrl } from '../../../utils/imageUrl';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface BannerCompositionArgs {
  profile: UserProfile | null | undefined;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadBannerCollagePhoto: (file: File) => Promise<string | null>;
}

export function useBannerCompositionState({
  profile,
  updateProfile,
  uploadBannerCollagePhoto,
}: BannerCompositionArgs) {
  const [bannerObjectPosition, setBannerObjectPosition] = useState<BannerObjectPosition>(DEFAULT_BANNER_OBJECT_POSITION);
  const [bannerObjectFit, setBannerObjectFit] = useState<BannerObjectFit>(DEFAULT_BANNER_OBJECT_FIT);
  const [bannerImageScale, setBannerImageScale] = useState<number>(DEFAULT_BANNER_IMAGE_SCALE);
  const [bannerFrameHeight, setBannerFrameHeight] = useState<number>(DEFAULT_BANNER_FRAME_HEIGHT);
  const [bannerCollagePhotos, setBannerCollagePhotos] = useState<string[]>([]);
  const [showRepositionPanel, setShowRepositionPanel] = useState(false);

  useEffect(() => {
    setBannerObjectPosition(normalizeBannerObjectPosition(profile?.bannerObjectPosition));
    setBannerObjectFit(isBannerObjectFit(profile?.bannerObjectFit) ? profile.bannerObjectFit : DEFAULT_BANNER_OBJECT_FIT);
    setBannerImageScale(normalizeBannerImageScale(profile?.bannerImageScale));
    setBannerFrameHeight(normalizeBannerFrameHeight(profile?.bannerFrameHeight));
    setBannerCollagePhotos(normalizeBannerCollagePhotos(profile?.bannerCollagePhotos));
  }, [profile?.bannerCollagePhotos, profile?.bannerFrameHeight, profile?.bannerImageScale, profile?.bannerObjectFit, profile?.bannerObjectPosition]);

  const previewBannerCrop = useCallback((next: BannerCropState) => {
    setBannerObjectPosition(normalizeBannerObjectPosition(next.position));
    setBannerObjectFit(isBannerObjectFit(next.fit) ? next.fit : DEFAULT_BANNER_OBJECT_FIT);
    setBannerImageScale(normalizeBannerImageScale(next.scale));
    setBannerFrameHeight(normalizeBannerFrameHeight(next.height));
  }, []);

  const handleBannerCropCommit = useCallback(async (next: BannerCropState) => {
    const normalizedNext: BannerCropState = {
      position: normalizeBannerObjectPosition(next.position),
      fit: isBannerObjectFit(next.fit) ? next.fit : DEFAULT_BANNER_OBJECT_FIT,
      scale: normalizeBannerImageScale(next.scale),
      height: normalizeBannerFrameHeight(next.height),
    };

    previewBannerCrop(normalizedNext);
    try {
      await updateProfile({
        bannerObjectPosition: normalizedNext.position,
        bannerObjectFit: normalizedNext.fit,
        bannerImageScale: normalizedNext.scale,
        bannerFrameHeight: normalizedNext.height,
      });
    } catch (positionError) {
      console.error('Failed to save banner crop settings:', positionError);
    }
  }, [previewBannerCrop, updateProfile]);

  const handleBannerCollageFiles = useCallback(async (filesLike: FileList | File[]) => {
    const previousPhotos = bannerCollagePhotos;
    const previousFit = bannerObjectFit;
    const capacity = MAX_BANNER_COLLAGE_PHOTOS - bannerCollagePhotos.length;
    if (capacity <= 0) return;
    const files = Array.from(filesLike).filter((file) =>
      ALLOWED_TYPES.includes(file.type) && file.size <= MAX_UPLOAD_SIZE).slice(0, capacity);
    if (files.length === 0) return;

    const uploaded: string[] = [];
    for (const file of files) {
      try {
        const url = sanitizeImageUrl(await uploadBannerCollagePhoto(file));
        if (url) uploaded.push(url);
      } catch (uploadError) {
        console.error('Failed to upload collage photo:', uploadError);
      }
    }
    if (uploaded.length === 0) return;

    const normalized = normalizeBannerCollagePhotos([...bannerCollagePhotos, ...uploaded]);
    setBannerCollagePhotos(normalized);
    setBannerObjectFit('collage');
    try {
      await updateProfile({ bannerCollagePhotos: normalized, bannerObjectFit: 'collage' });
    } catch (persistError) {
      console.error('Failed to save banner collage photos:', persistError);
      setBannerCollagePhotos(previousPhotos);
      setBannerObjectFit(previousFit);
    }
  }, [bannerCollagePhotos, bannerObjectFit, updateProfile, uploadBannerCollagePhoto]);

  const handleBannerCollageRemove = useCallback(async (index: number) => {
    const previousPhotos = bannerCollagePhotos;
    const normalized = normalizeBannerCollagePhotos(bannerCollagePhotos.filter((_, photoIndex) => photoIndex !== index));
    setBannerCollagePhotos(normalized);
    try {
      await updateProfile({ bannerCollagePhotos: normalized });
    } catch (persistError) {
      console.error('Failed to remove banner collage photo:', persistError);
      setBannerCollagePhotos(previousPhotos);
    }
  }, [bannerCollagePhotos, updateProfile]);

  const toggleRepositionPanel = useCallback(() => setShowRepositionPanel((open) => !open), []);

  return {
    bannerObjectPosition,
    bannerObjectFit,
    bannerImageScale,
    bannerFrameHeight,
    bannerCollagePhotos,
    showRepositionPanel,
    toggleRepositionPanel,
    previewBannerCrop,
    handleBannerCropCommit,
    handleBannerCollageFiles,
    handleBannerCollageRemove,
  };
}
