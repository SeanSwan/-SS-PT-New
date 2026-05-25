import React from 'react';
import {
  BannerCollageImage,
  BannerCollageLayer,
  BannerCollageMediaFrame,
  BannerCollageVideo,
  BannerImage,
  BannerTileImage,
  BannerTileLayer,
} from '../styles/DashboardV3Styles';
import type { BannerObjectFit, BannerObjectPosition } from '../../../services/profileService';
import {
  buildBannerCollageFrameStyle,
  DEFAULT_BANNER_COLLAGE_ASPECT_RATIO,
  isBannerVideoUrl,
  normalizeBannerMediaAspectRatio,
  TILE_REPEAT_COUNT,
} from '../utils/bannerCompositionMedia';

const TILE_INDEXES = Array.from({ length: TILE_REPEAT_COUNT }, (_, index) => index);

interface UserDashboardBannerMediaLayerProps {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerCollagePhotos: string[];
}

const UserDashboardBannerMediaLayer: React.FC<UserDashboardBannerMediaLayerProps> = ({
  backgroundImage,
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  bannerCollagePhotos,
}) => {
  const [collageAspectRatios, setCollageAspectRatios] = React.useState<Record<string, number>>({});
  const updateCollageAspectRatio = React.useCallback((key: string, width: number, height: number) => {
    const nextAspectRatio = normalizeBannerMediaAspectRatio(width, height);
    setCollageAspectRatios((current) => (
      current[key] === nextAspectRatio ? current : { ...current, [key]: nextAspectRatio }
    ));
  }, []);

  if (bannerObjectFit === 'tile' && backgroundImage) {
    return (
      <BannerTileLayer style={{ '--banner-image-scale': String(bannerImageScale) } as React.CSSProperties}>
        {TILE_INDEXES.map((index) => (
          <BannerTileImage
            key={index}
            src={backgroundImage}
            alt=""
            data-testid="banner-tile-image"
            draggable={false}
          />
        ))}
      </BannerTileLayer>
    );
  }

  if (bannerObjectFit === 'collage' && bannerCollagePhotos.length > 0) {
    return (
      <BannerCollageLayer
        style={{
          '--banner-image-scale': String(bannerImageScale),
          '--banner-object-position': bannerObjectPosition,
        } as React.CSSProperties}
      >
        {bannerCollagePhotos.slice(0, 6).map((photo, index) => {
          const mediaKey = `${photo}-${index}`;
          const aspectRatio = collageAspectRatios[mediaKey] ?? DEFAULT_BANNER_COLLAGE_ASPECT_RATIO;
          return (
            <BannerCollageMediaFrame
              key={mediaKey}
              style={buildBannerCollageFrameStyle(aspectRatio, bannerImageScale)}
            >
              {isBannerVideoUrl(photo) ? (
                <BannerCollageVideo
                  src={photo}
                  data-testid="banner-collage-video"
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(event) => updateCollageAspectRatio(
                    mediaKey,
                    event.currentTarget.videoWidth,
                    event.currentTarget.videoHeight,
                  )}
                />
              ) : (
                <BannerCollageImage
                  src={photo}
                  alt=""
                  data-testid="banner-collage-image"
                  draggable={false}
                  onLoad={(event) => updateCollageAspectRatio(
                    mediaKey,
                    event.currentTarget.naturalWidth,
                    event.currentTarget.naturalHeight,
                  )}
                />
              )}
            </BannerCollageMediaFrame>
          );
        })}
      </BannerCollageLayer>
    );
  }

  if (!backgroundImage) return null;

  return (
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
  );
};

export default React.memo(UserDashboardBannerMediaLayer);
