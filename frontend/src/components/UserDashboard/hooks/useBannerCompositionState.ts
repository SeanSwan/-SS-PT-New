import { useCallback, useEffect, useState } from 'react';
import {
  BANNER_COLLAGE_MEDIA_TYPES,
  DEFAULT_BANNER_FRAME_HEIGHT,
  DEFAULT_BANNER_COLLAGE_LAYOUT,
  DEFAULT_BANNER_STICKY_CAROUSEL,
  DEFAULT_BANNER_IMAGE_SCALE,
  DEFAULT_BANNER_OBJECT_FIT,
  DEFAULT_BANNER_OBJECT_POSITION,
  MAX_BANNER_COLLAGE_MEDIA_UPLOAD_SIZE,
  MAX_BANNER_COLLAGE_PHOTOS,
  MAX_BANNER_PRESETS,
  isBannerObjectFit,
  normalizeBannerCollageLayout,
  normalizeBannerCollagePhotos,
  normalizeBannerFrameHeight,
  normalizeBannerImageScale,
  normalizeBannerObjectPosition,
  normalizeBannerPresets,
  normalizeBannerStickyCarousel,
  type BannerCropState,
  type BannerCollageLayout,
  type BannerPreset,
  type BannerObjectFit,
  type BannerObjectPosition,
  type UserProfile,
} from '../../../services/profileService';
import { sanitizeImageUrl } from '../../../utils/imageUrl';

interface BannerCompositionArgs {
  profile: UserProfile | null | undefined;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadBannerCollagePhoto: (file: File) => Promise<string | null>;
  onBannerPhotoPreview?: (url: string | null) => void;
}

export function useBannerCompositionState({
  profile,
  updateProfile,
  uploadBannerCollagePhoto,
  onBannerPhotoPreview,
}: BannerCompositionArgs) {
  const [bannerObjectPosition, setBannerObjectPosition] = useState<BannerObjectPosition>(DEFAULT_BANNER_OBJECT_POSITION);
  const [bannerObjectFit, setBannerObjectFit] = useState<BannerObjectFit>(DEFAULT_BANNER_OBJECT_FIT);
  const [bannerImageScale, setBannerImageScale] = useState<number>(DEFAULT_BANNER_IMAGE_SCALE);
  const [bannerFrameHeight, setBannerFrameHeight] = useState<number>(DEFAULT_BANNER_FRAME_HEIGHT);
  const [bannerCollagePhotos, setBannerCollagePhotos] = useState<string[]>([]);
  const [bannerCollageLayout, setBannerCollageLayout] = useState<BannerCollageLayout>(DEFAULT_BANNER_COLLAGE_LAYOUT);
  const [bannerStickyCarousel, setBannerStickyCarousel] = useState<boolean>(DEFAULT_BANNER_STICKY_CAROUSEL);
  const [bannerPresets, setBannerPresets] = useState<BannerPreset[]>([]);
  const [showRepositionPanel, setShowRepositionPanel] = useState(false);
  const bannerStateRef = useState(() => ({
    position: DEFAULT_BANNER_OBJECT_POSITION,
    fit: DEFAULT_BANNER_OBJECT_FIT,
    scale: DEFAULT_BANNER_IMAGE_SCALE,
    height: DEFAULT_BANNER_FRAME_HEIGHT,
    photos: [] as string[],
    layout: DEFAULT_BANNER_COLLAGE_LAYOUT,
    sticky: DEFAULT_BANNER_STICKY_CAROUSEL,
    presets: [] as BannerPreset[],
  }))[0];

  useEffect(() => {
    const position = normalizeBannerObjectPosition(profile?.bannerObjectPosition);
    const fit = isBannerObjectFit(profile?.bannerObjectFit) ? profile.bannerObjectFit : DEFAULT_BANNER_OBJECT_FIT;
    const scale = normalizeBannerImageScale(profile?.bannerImageScale);
    const height = normalizeBannerFrameHeight(profile?.bannerFrameHeight);
    const photos = normalizeBannerCollagePhotos(profile?.bannerCollagePhotos);
    const layout = normalizeBannerCollageLayout(profile?.bannerCollageLayout);
    const sticky = normalizeBannerStickyCarousel(profile?.bannerStickyCarousel);
    const presets = normalizeBannerPresets(profile?.bannerPresets);
    Object.assign(bannerStateRef, { position, fit, scale, height, photos, layout, sticky, presets });
    setBannerObjectPosition(position);
    setBannerObjectFit(fit);
    setBannerImageScale(scale);
    setBannerFrameHeight(height);
    setBannerCollagePhotos(photos);
    setBannerCollageLayout(layout);
    setBannerStickyCarousel(sticky);
    setBannerPresets(presets);
  }, [
    bannerStateRef,
    profile?.bannerCollageLayout,
    profile?.bannerCollagePhotos,
    profile?.bannerFrameHeight,
    profile?.bannerImageScale,
    profile?.bannerObjectFit,
    profile?.bannerObjectPosition,
    profile?.bannerPresets,
    profile?.bannerStickyCarousel,
  ]);

  const previewBannerCrop = useCallback((next: BannerCropState) => {
    const position = normalizeBannerObjectPosition(next.position);
    const fit = isBannerObjectFit(next.fit) ? next.fit : DEFAULT_BANNER_OBJECT_FIT;
    const scale = normalizeBannerImageScale(next.scale);
    const height = normalizeBannerFrameHeight(next.height);
    Object.assign(bannerStateRef, { position, fit, scale, height });
    setBannerObjectPosition(position);
    setBannerObjectFit(fit);
    setBannerImageScale(scale);
    setBannerFrameHeight(height);
  }, [bannerStateRef]);

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

  const handleBannerCollageLayoutCommit = useCallback(async (layout: BannerCollageLayout) => {
    const normalizedLayout = normalizeBannerCollageLayout(layout);
    const previousLayout = bannerCollageLayout;
    const previousFit = bannerObjectFit;
    Object.assign(bannerStateRef, { layout: normalizedLayout, fit: 'collage' });
    setBannerCollageLayout(normalizedLayout);
    setBannerObjectFit('collage');
    try {
      await updateProfile({ bannerCollageLayout: normalizedLayout, bannerObjectFit: 'collage' });
    } catch (persistError) {
      console.error('Failed to save banner collage layout:', persistError);
      Object.assign(bannerStateRef, { layout: previousLayout, fit: previousFit });
      setBannerCollageLayout(previousLayout);
      setBannerObjectFit(previousFit);
    }
  }, [bannerCollageLayout, bannerObjectFit, bannerStateRef, updateProfile]);

  const handleBannerStickyCarouselCommit = useCallback(async (sticky: boolean) => {
    const previousSticky = bannerStickyCarousel;
    Object.assign(bannerStateRef, { sticky });
    setBannerStickyCarousel(sticky);
    try {
      await updateProfile({ bannerStickyCarousel: sticky });
    } catch (persistError) {
      console.error('Failed to save banner sticky carousel:', persistError);
      Object.assign(bannerStateRef, { sticky: previousSticky });
      setBannerStickyCarousel(previousSticky);
    }
  }, [bannerStateRef, bannerStickyCarousel, updateProfile]);

  const handleBannerCollageFiles = useCallback(async (filesLike: FileList | File[]) => {
    const previousPhotos = bannerCollagePhotos;
    const previousFit = bannerObjectFit;
    const capacity = MAX_BANNER_COLLAGE_PHOTOS - bannerCollagePhotos.length;
    if (capacity <= 0) return;
    const files = Array.from(filesLike).filter((file) =>
      (BANNER_COLLAGE_MEDIA_TYPES as readonly string[]).includes(file.type)
      && file.size <= MAX_BANNER_COLLAGE_MEDIA_UPLOAD_SIZE).slice(0, capacity);
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
    Object.assign(bannerStateRef, { photos: normalized, fit: 'collage' });
    setBannerCollagePhotos(normalized);
    setBannerObjectFit('collage');
    try {
      await updateProfile({ bannerCollagePhotos: normalized, bannerObjectFit: 'collage' });
    } catch (persistError) {
      console.error('Failed to save banner collage photos:', persistError);
      Object.assign(bannerStateRef, { photos: previousPhotos, fit: previousFit });
      setBannerCollagePhotos(previousPhotos);
      setBannerObjectFit(previousFit);
    }
  }, [bannerCollagePhotos, bannerObjectFit, bannerStateRef, updateProfile, uploadBannerCollagePhoto]);

  const handleBannerCollageRemove = useCallback(async (index: number) => {
    const previousPhotos = bannerCollagePhotos;
    const normalized = normalizeBannerCollagePhotos(bannerCollagePhotos.filter((_, photoIndex) => photoIndex !== index));
    Object.assign(bannerStateRef, { photos: normalized });
    setBannerCollagePhotos(normalized);
    try {
      await updateProfile({ bannerCollagePhotos: normalized });
    } catch (persistError) {
      console.error('Failed to remove banner collage photo:', persistError);
      Object.assign(bannerStateRef, { photos: previousPhotos });
      setBannerCollagePhotos(previousPhotos);
    }
  }, [bannerCollagePhotos, bannerStateRef, updateProfile]);

  const handleBannerPresetSave = useCallback(async () => {
    const previousPresets = bannerPresets;
    const id = globalThis.crypto?.randomUUID?.() ?? `banner-preset-${Date.now()}`;
    const preset = {
      id,
      name: `Saved banner ${Math.min(bannerPresets.length + 1, MAX_BANNER_PRESETS)}`,
      bannerPhoto: sanitizeImageUrl(profile?.bannerPhoto) ?? undefined,
      bannerObjectPosition: bannerStateRef.position,
      bannerObjectFit: bannerStateRef.fit,
      bannerImageScale: bannerStateRef.scale,
      bannerFrameHeight: bannerStateRef.height,
      bannerCollagePhotos: bannerStateRef.photos,
      bannerCollageLayout: bannerStateRef.layout,
      bannerStickyCarousel: bannerStateRef.sticky,
      createdAt: new Date().toISOString(),
    };
    const normalizedPresets = normalizeBannerPresets([preset, ...bannerPresets]).slice(0, MAX_BANNER_PRESETS);
    Object.assign(bannerStateRef, { presets: normalizedPresets });
    setBannerPresets(normalizedPresets);
    try {
      await updateProfile({ bannerPresets: normalizedPresets });
    } catch (persistError) {
      console.error('Failed to save banner preset:', persistError);
      Object.assign(bannerStateRef, { presets: previousPresets });
      setBannerPresets(previousPresets);
    }
  }, [bannerPresets, bannerStateRef, profile?.bannerPhoto, updateProfile]);

  const handleBannerPresetApply = useCallback(async (presetId: string) => {
    const preset = normalizeBannerPresets(bannerStateRef.presets).find((item) => item.id === presetId);
    if (!preset) return;
    const previousState = { ...bannerStateRef, photos: [...bannerStateRef.photos], presets: [...bannerStateRef.presets] };
    Object.assign(bannerStateRef, {
      position: preset.bannerObjectPosition,
      fit: preset.bannerObjectFit,
      scale: preset.bannerImageScale,
      height: preset.bannerFrameHeight,
      photos: preset.bannerCollagePhotos,
      layout: preset.bannerCollageLayout,
      sticky: preset.bannerStickyCarousel,
    });
    setBannerObjectPosition(preset.bannerObjectPosition);
    setBannerObjectFit(preset.bannerObjectFit);
    setBannerImageScale(preset.bannerImageScale);
    setBannerFrameHeight(preset.bannerFrameHeight);
    setBannerCollagePhotos(preset.bannerCollagePhotos);
    setBannerCollageLayout(preset.bannerCollageLayout);
    setBannerStickyCarousel(preset.bannerStickyCarousel);
    onBannerPhotoPreview?.(preset.bannerPhoto ?? null);
    try {
      await updateProfile({
        bannerPhoto: preset.bannerPhoto,
        bannerObjectPosition: preset.bannerObjectPosition,
        bannerObjectFit: preset.bannerObjectFit,
        bannerImageScale: preset.bannerImageScale,
        bannerFrameHeight: preset.bannerFrameHeight,
        bannerCollagePhotos: preset.bannerCollagePhotos,
        bannerCollageLayout: preset.bannerCollageLayout,
        bannerStickyCarousel: preset.bannerStickyCarousel,
      });
    } catch (persistError) {
      console.error('Failed to apply banner preset:', persistError);
      Object.assign(bannerStateRef, previousState);
    }
  }, [bannerStateRef, onBannerPhotoPreview, updateProfile]);

  const handleBannerPresetRemove = useCallback(async (presetId: string) => {
    const previousPresets = bannerPresets;
    const normalizedPresets = normalizeBannerPresets(bannerPresets.filter((preset) => preset.id !== presetId));
    Object.assign(bannerStateRef, { presets: normalizedPresets });
    setBannerPresets(normalizedPresets);
    try {
      await updateProfile({ bannerPresets: normalizedPresets });
    } catch (persistError) {
      console.error('Failed to remove banner preset:', persistError);
      Object.assign(bannerStateRef, { presets: previousPresets });
      setBannerPresets(previousPresets);
    }
  }, [bannerPresets, bannerStateRef, updateProfile]);

  const toggleRepositionPanel = useCallback(() => setShowRepositionPanel((open) => !open), []);

  return {
    bannerObjectPosition, bannerObjectFit, bannerImageScale, bannerFrameHeight,
    bannerCollagePhotos, bannerCollageLayout, bannerStickyCarousel, bannerPresets,
    showRepositionPanel, toggleRepositionPanel, previewBannerCrop, handleBannerCropCommit,
    handleBannerCollageLayoutCommit, handleBannerStickyCarouselCommit, handleBannerCollageFiles,
    handleBannerCollageRemove, handleBannerPresetSave, handleBannerPresetApply, handleBannerPresetRemove,
  };
}
