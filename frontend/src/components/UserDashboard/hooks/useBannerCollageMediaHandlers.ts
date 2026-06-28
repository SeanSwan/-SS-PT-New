/**
 * ============================================================================
 * HOOK: useBannerCollageMediaHandlers
 * PURPOSE: Upload, remove, and shuffle dashboard banner collage media while
 *          keeping useBannerCompositionState below the file-size cap.
 * DATA FLOW: useBannerCompositionState -> profile update API -> banner renderer.
 * SAFETY: Client-side media type/size filtering mirrors the existing banner
 *         contract; all persisted URLs are sanitized before state writes.
 * ============================================================================
 */
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import {
  BANNER_COLLAGE_MEDIA_TYPES,
  BANNER_MEDIA_VIDEO_TYPES,
  DEFAULT_BANNER_COLLAGE_LAYOUT,
  MAX_BANNER_COLLAGE_MEDIA_UPLOAD_SIZE,
  MAX_BANNER_COLLAGE_PHOTOS,
  MAX_BANNER_COLLAGE_VIDEOS,
  isBannerCollageVideoUrl,
  normalizeBannerCollageLayout,
  normalizeBannerCollagePhotos,
  type BannerCollageLayout,
  type BannerObjectFit,
  type UserProfile,
} from '../../../services/profileService';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import { logger } from '../../../utils/logger';

interface BannerMediaStateRef {
  photos: string[];
  fit: BannerObjectFit;
  layout: BannerCollageLayout;
}

interface BannerCollageMediaHandlersArgs {
  bannerCollagePhotos: string[];
  bannerObjectFit: BannerObjectFit;
  bannerCollageLayout: BannerCollageLayout;
  bannerStateRef: BannerMediaStateRef;
  setBannerCollagePhotos: Dispatch<SetStateAction<string[]>>;
  setBannerObjectFit: Dispatch<SetStateAction<BannerObjectFit>>;
  setBannerCollageLayout: Dispatch<SetStateAction<BannerCollageLayout>>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadBannerCollagePhoto: (file: File) => Promise<string | null>;
}

const shuffleBannerMedia = (items: string[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  if (next.length > 1 && next.every((item, index) => item === items[index])) {
    next.push(next.shift() as string);
  }
  return next;
};

export function useBannerCollageMediaHandlers({
  bannerCollagePhotos,
  bannerObjectFit,
  bannerCollageLayout,
  bannerStateRef,
  setBannerCollagePhotos,
  setBannerObjectFit,
  setBannerCollageLayout,
  updateProfile,
  uploadBannerCollagePhoto,
}: BannerCollageMediaHandlersArgs) {
  const handleBannerCollageFiles = useCallback(async (filesLike: FileList | File[]) => {
    const previousPhotos = bannerCollagePhotos;
    const previousFit = bannerObjectFit;
    const previousLayout = bannerCollageLayout;
    const capacity = MAX_BANNER_COLLAGE_PHOTOS - bannerCollagePhotos.length;
    if (capacity <= 0) return;
    let nextVideoCount = bannerCollagePhotos.filter(isBannerCollageVideoUrl).length;
    const files: File[] = [];
    for (const file of Array.from(filesLike)) {
      if (files.length >= capacity) break;
      const isAllowedType = (BANNER_COLLAGE_MEDIA_TYPES as readonly string[]).includes(file.type);
      const isAllowedSize = file.size <= MAX_BANNER_COLLAGE_MEDIA_UPLOAD_SIZE;
      if (!isAllowedType || !isAllowedSize) continue;
      const isVideo = (BANNER_MEDIA_VIDEO_TYPES as readonly string[]).includes(file.type);
      if (isVideo) {
        if (nextVideoCount >= MAX_BANNER_COLLAGE_VIDEOS) continue;
        nextVideoCount += 1;
      }
      files.push(file);
    }
    if (files.length === 0) return;

    const uploaded: string[] = [];
    for (const file of files) {
      try {
        const url = sanitizeImageUrl(await uploadBannerCollagePhoto(file));
        if (url) uploaded.push(url);
      } catch {
        logger.warn('User dashboard banner collage media upload failed.');
      }
    }
    if (uploaded.length === 0) return;

    const normalized = normalizeBannerCollagePhotos([...bannerCollagePhotos, ...uploaded]);
    const nextLayout = normalizeBannerCollageLayout(bannerCollageLayout || DEFAULT_BANNER_COLLAGE_LAYOUT);
    Object.assign(bannerStateRef, { photos: normalized, fit: 'collage', layout: nextLayout });
    setBannerCollagePhotos(normalized); setBannerObjectFit('collage'); setBannerCollageLayout(nextLayout);
    try {
      await updateProfile({ bannerCollagePhotos: normalized, bannerObjectFit: 'collage', bannerCollageLayout: nextLayout });
    } catch {
      logger.warn('User dashboard banner collage photos save failed.');
      Object.assign(bannerStateRef, { photos: previousPhotos, fit: previousFit, layout: previousLayout });
      setBannerCollagePhotos(previousPhotos); setBannerObjectFit(previousFit); setBannerCollageLayout(previousLayout);
    }
  }, [bannerCollageLayout, bannerCollagePhotos, bannerObjectFit, bannerStateRef, setBannerCollageLayout, setBannerCollagePhotos, setBannerObjectFit, updateProfile, uploadBannerCollagePhoto]);

  const handleBannerCollageRemove = useCallback(async (index: number) => {
    const previousPhotos = bannerCollagePhotos;
    const normalized = normalizeBannerCollagePhotos(bannerCollagePhotos.filter((_, photoIndex) => photoIndex !== index));
    Object.assign(bannerStateRef, { photos: normalized });
    setBannerCollagePhotos(normalized);
    try {
      await updateProfile({ bannerCollagePhotos: normalized });
    } catch {
      logger.warn('User dashboard banner collage photo removal failed.');
      Object.assign(bannerStateRef, { photos: previousPhotos });
      setBannerCollagePhotos(previousPhotos);
    }
  }, [bannerCollagePhotos, bannerStateRef, setBannerCollagePhotos, updateProfile]);

  const handleBannerCollageShuffle = useCallback(async () => {
    if (bannerCollagePhotos.length < 2) return;
    const previousPhotos = bannerCollagePhotos;
    const previousFit = bannerObjectFit;
    const previousLayout = bannerCollageLayout;
    const normalized = normalizeBannerCollagePhotos(shuffleBannerMedia(bannerCollagePhotos));
    const nextLayout = normalizeBannerCollageLayout(bannerCollageLayout || DEFAULT_BANNER_COLLAGE_LAYOUT);
    Object.assign(bannerStateRef, { photos: normalized, fit: 'collage', layout: nextLayout });
    setBannerCollagePhotos(normalized); setBannerObjectFit('collage'); setBannerCollageLayout(nextLayout);
    try {
      await updateProfile({ bannerCollagePhotos: normalized, bannerObjectFit: 'collage', bannerCollageLayout: nextLayout });
    } catch {
      logger.warn('User dashboard banner collage shuffle save failed.');
      Object.assign(bannerStateRef, { photos: previousPhotos, fit: previousFit, layout: previousLayout });
      setBannerCollagePhotos(previousPhotos); setBannerObjectFit(previousFit); setBannerCollageLayout(previousLayout);
    }
  }, [bannerCollageLayout, bannerCollagePhotos, bannerObjectFit, bannerStateRef, setBannerCollageLayout, setBannerCollagePhotos, setBannerObjectFit, updateProfile]);

  return { handleBannerCollageFiles, handleBannerCollageRemove, handleBannerCollageShuffle };
}