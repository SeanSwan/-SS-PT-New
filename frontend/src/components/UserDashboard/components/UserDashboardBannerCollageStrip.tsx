import React from 'react';
import { Image, Plus } from 'lucide-react';
import {
  BannerCollageControlGrid,
  BannerCollageThumb,
  BannerCollageThumbButton,
  BannerCropHint,
  BannerCropResetButton,
} from '../styles/DashboardV3Styles';
import { MAX_BANNER_COLLAGE_PHOTOS } from '../../../services/profileService';

interface UserDashboardBannerCollageStripProps {
  photos: string[];
  onFiles: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
}

const UserDashboardBannerCollageStrip: React.FC<UserDashboardBannerCollageStripProps> = ({
  photos,
  onFiles,
  onRemove,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isFull = photos.length >= MAX_BANNER_COLLAGE_PHOTOS;

  return (
    <>
      <BannerCropHint>Collage mode layers up to six cover photos.</BannerCropHint>
      <BannerCropResetButton
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isFull}
      >
        <Plus size={16} />
        {isFull ? 'Full' : 'Add photo'}
      </BannerCropResetButton>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        aria-label="Add collage photos"
        onChange={(event) => {
          if (event.target.files) onFiles(event.target.files);
          event.currentTarget.value = '';
        }}
      />
      {photos.length > 0 ? (
        <BannerCollageControlGrid>
          {photos.map((photo, index) => (
            <BannerCollageThumbButton
              key={`${photo}-${index}`}
              type="button"
              aria-label={`Remove collage photo ${index + 1}`}
              onClick={() => onRemove(index)}
            >
              <BannerCollageThumb src={photo} alt="" />
            </BannerCollageThumbButton>
          ))}
        </BannerCollageControlGrid>
      ) : (
        <BannerCropHint>
          <Image size={14} aria-hidden="true" /> Add more photos to build a futuristic banner grid.
        </BannerCropHint>
      )}
    </>
  );
};

export default React.memo(UserDashboardBannerCollageStrip);
