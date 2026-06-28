/**
 * COMPONENT: CoverStudioPanel
 * PURPOSE: Controller shell for the Feed Banner Studio progressive editor.
 * FLOW: Reads banner composition props, computes cover mode, and delegates UI to section components.
 */
import React, { useMemo, useRef } from 'react';
import { MAX_BANNER_COLLAGE_PHOTOS, type BannerObjectFit } from '../../../../services/profileService';
import { formatBannerPosition, parseBannerPosition } from '../../../UserDashboard/utils/bannerCompositionMedia';
import { StudioBody } from './CoverStudioPanel.styles';
import {
  AdvancedCropSection,
  CoverTypeSection,
  FocalSection,
  FramingSection,
  HeightPresetsSection,
  LayoutSection,
  MediaLibrarySection,
  SavedCoversSection,
} from './CoverStudioPanel.sections';
import {
  baseCropFromValues,
  getCoverType,
  getFallbackLayout,
  getLayoutOptions,
  getSingleFit,
  isFocalPoint,
  type CoverStudioPanelProps,
  type CoverType,
} from './CoverStudioPanel.types';

const CoverStudioPanel: React.FC<CoverStudioPanelProps> = ({
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  bannerFrameHeight,
  bannerCollagePhotos,
  bannerCollageLayout,
  bannerStickyCarousel,
  bannerPresets,
  onBannerCropPreview,
  onBannerCropCommit,
  onBannerCollageFiles,
  onBannerCollageRemove,
  onBannerCollageShuffle,
  onBannerCollageLayoutCommit,
  onBannerStickyCarouselCommit,
  onBannerPresetSave,
  onBannerPresetApply,
  onBannerPresetRemove,
}) => {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverType = getCoverType(bannerObjectFit, bannerCollageLayout);
  const layoutOptions = getLayoutOptions(coverType);
  const focal = useMemo(() => parseBannerPosition(bannerObjectPosition), [bannerObjectPosition]);
  const cropValues = {
    position: bannerObjectPosition,
    fit: bannerObjectFit,
    scale: bannerImageScale,
    height: bannerFrameHeight,
  };
  const baseCrop = () => baseCropFromValues(cropValues);

  const selectType = (next: CoverType) => {
    if (next === coverType) return;
    const nextLayout = getFallbackLayout(next, bannerCollageLayout);
    if (nextLayout) {
      onBannerCollageLayoutCommit(nextLayout);
      return;
    }
    onBannerCropCommit({ ...baseCrop(), fit: getSingleFit(bannerObjectFit) });
  };

  const setFit = (fit: BannerObjectFit) => onBannerCropCommit({ ...baseCrop(), fit });
  const setFocal = (x: number, y: number) => onBannerCropCommit({ ...baseCrop(), position: formatBannerPosition(x, y) });
  const setHeight = (height: number) => onBannerCropCommit({ ...baseCrop(), height });
  const previewScale = (scale: number) => onBannerCropPreview({ ...baseCrop(), scale });
  const commitScale = (scale: number) => onBannerCropCommit({ ...baseCrop(), scale });
  const previewHeight = (height: number) => onBannerCropPreview({ ...baseCrop(), height });
  const commitHeight = (height: number) => onBannerCropCommit({ ...baseCrop(), height });

  return (
    <StudioBody>
      <CoverTypeSection coverType={coverType} onSelectType={selectType} />
      <LayoutSection
        coverType={coverType}
        layoutOptions={layoutOptions}
        selectedLayout={bannerCollageLayout}
        stickyCarousel={bannerStickyCarousel}
        onLayoutCommit={onBannerCollageLayoutCommit}
        onStickyCarouselChange={onBannerStickyCarouselCommit}
      />
      <MediaLibrarySection
        coverType={coverType}
        fileRef={fileRef}
        isFull={bannerCollagePhotos.length >= MAX_BANNER_COLLAGE_PHOTOS}
        photos={bannerCollagePhotos}
        onFiles={onBannerCollageFiles}
        onRemove={onBannerCollageRemove}
        onShuffle={onBannerCollageShuffle}
      />
      <FramingSection coverType={coverType} fit={bannerObjectFit} onFitChange={setFit} />
      <FocalSection isFocal={(x, y) => isFocalPoint(focal, x, y)} onSetFocal={setFocal} />
      <HeightPresetsSection height={bannerFrameHeight} onHeightChange={setHeight} />
      <AdvancedCropSection
        open={advancedOpen}
        scale={bannerImageScale}
        height={bannerFrameHeight}
        onToggle={() => setAdvancedOpen((open) => !open)}
        onPreviewScale={previewScale}
        onCommitScale={commitScale}
        onPreviewHeight={previewHeight}
        onCommitHeight={commitHeight}
      />
      <SavedCoversSection
        presets={bannerPresets}
        onSave={onBannerPresetSave}
        onApply={onBannerPresetApply}
        onRemove={onBannerPresetRemove}
      />
    </StudioBody>
  );
};

export default React.memo(CoverStudioPanel);
