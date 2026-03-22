/**
 * ┌─── SUB-COMPONENT: ProfileBanner ──────────────────────────┐
 * | PARENT: UserDashboard                                      |
 * | PURPOSE: Full-width banner with profile pic overlay        |
 * | WIREFRAME:                                                 |
 * | +------------------------------------------+               |
 * | |  [Banner Image / Gradient]               |               |
 * | |       (hover: upload overlay)            |               |
 * | |              +------+                    |               |
 * | |              | AVATAR|                   |               |
 * | |              | [cam] |                   |               |
 * | |              +------+                    |               |
 * | +------------------------------------------+               |
 * | Props: { backgroundImage, profilePhoto, userInitials,      |
 * |          onBannerClick, onProfileImageClick }               |
 * | CLICK-OUTCOMES:                                            |
 * | [Banner] -> onBannerClick -> triggers hidden file input    |
 * | [Camera btn] -> onProfileImageClick -> file input          |
 * +------------------------------------------------------------+
 */

import React from 'react';
import { Camera } from 'lucide-react';
import type { ProfileBannerProps } from '../types/UserDashboardTypes';
import {
  BackgroundSection,
  ProfileImageSection,
  ProfileImageContainer,
  ProfileImage,
  ImageUploadButton,
} from '../styles/ProfileStyles';

/**
 * Renders the banner photo area and the circular profile avatar
 * that overlaps the banner bottom edge. Both are clickable to
 * trigger file upload via hidden inputs managed by the parent.
 */
const ProfileBanner: React.FC<ProfileBannerProps> = React.memo(({
  backgroundImage,
  profilePhoto,
  userInitials,
  onBannerClick,
  onProfileImageClick,
}) => {
  return (
    <>
      <BackgroundSection
        $backgroundImage={backgroundImage || undefined}
        onClick={onBannerClick}
      >
        <div className="upload-overlay">
          <Camera size={48} className="upload-icon" />
          <div className="upload-text">
            {backgroundImage ? 'Change Cover Photo' : 'Add Cover Photo'}
          </div>
        </div>
      </BackgroundSection>

      <ProfileImageSection>
        <ProfileImageContainer
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ProfileImage $image={profilePhoto}>
            {!profilePhoto && userInitials}
          </ProfileImage>

          <ImageUploadButton
            onClick={onProfileImageClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Camera size={20} />
          </ImageUploadButton>
        </ProfileImageContainer>
      </ProfileImageSection>
    </>
  );
});

ProfileBanner.displayName = 'ProfileBanner';

export default ProfileBanner;
