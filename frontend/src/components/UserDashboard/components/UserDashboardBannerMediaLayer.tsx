import React from 'react';
import {
  BannerCollageImage,
  BannerCollageLayer,
  BannerCollageVideo,
  BannerImage,
  BannerTileImage,
  BannerTileLayer,
} from '../styles/DashboardV3Styles';
import type { BannerObjectFit, BannerObjectPosition } from '../../../services/profileService';
import { isBannerVideoUrl, TILE_REPEAT_COUNT } from '../utils/bannerCompositionMedia';

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
      <BannerCollageLayer $count={bannerCollagePhotos.length}>
        {bannerCollagePhotos.slice(0, 6).map((photo, index) => (
          isBannerVideoUrl(photo) ? (
            <BannerCollageVideo
              key={`${photo}-${index}`}
              src={photo}
              $feature={index === 0 && bannerCollagePhotos.length > 2}
              data-testid="banner-collage-video"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <BannerCollageImage
              key={`${photo}-${index}`}
              src={photo}
              alt=""
              $feature={index === 0 && bannerCollagePhotos.length > 2}
              data-testid="banner-collage-image"
              draggable={false}
            />
          )
        ))}
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
