import React from 'react';
import {
  BannerCollageImage,
  BannerCollageLayer,
  BannerImage,
  BannerTileImage,
  BannerTileLayer,
} from '../styles/DashboardV3Styles';
import type { BannerObjectFit, BannerObjectPosition } from '../../../services/profileService';

const TILE_COUNT = 24;
const TILE_INDEXES = Array.from({ length: TILE_COUNT }, (_, index) => index);

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
  const collagePhotos = bannerCollagePhotos.length > 0
    ? bannerCollagePhotos
    : (backgroundImage ? [backgroundImage] : []);

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

  if (bannerObjectFit === 'collage' && collagePhotos.length > 0) {
    return (
      <BannerCollageLayer $count={collagePhotos.length}>
        {collagePhotos.slice(0, 6).map((photo, index) => (
          <BannerCollageImage
            key={`${photo}-${index}`}
            src={photo}
            alt=""
            $feature={index === 0 && collagePhotos.length > 2}
            data-testid="banner-collage-image"
            draggable={false}
          />
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
