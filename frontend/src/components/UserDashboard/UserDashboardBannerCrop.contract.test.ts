import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('UserDashboard banner crop contract', () => {
  const header = read('src/components/UserDashboard/components/UserDashboardProfileHeaderV3.tsx');
  const cropControls = read('src/components/UserDashboard/components/UserDashboardBannerCropControls.tsx');
  const controller = read('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');
  const profileService = read('src/services/profileService.ts');
  const actionStyles = read('src/components/UserDashboard/styles/DashboardV3BannerActionsStyles.ts');

  it('uses free drag crop controls instead of the old 9-preset grid', () => {
    expect(header).not.toContain('BANNER_OBJECT_POSITION_PRESETS.map');
    expect(cropControls).toContain('onPointerDown={handleBannerPointerDown}');
    expect(cropControls).toContain('Drag the cover photo');
    expect(actionStyles).toContain('BannerCropModeButton');
  });

  it('persists position, fit mode, and zoom through the dashboard controller', () => {
    expect(controller).toContain('bannerObjectFit');
    expect(controller).toContain('bannerImageScale');
    expect(controller).toContain('handleBannerCropCommit');
    expect(controller).toContain('updateProfile({');
    expect(controller).toContain('bannerObjectPosition: next.position');
    expect(controller).toContain('bannerObjectFit: next.fit');
    expect(controller).toContain('bannerImageScale: next.scale');
  });

  it('allows percentage object-position strings and fit modes at the profile service boundary', () => {
    expect(profileService).toContain('type BannerObjectFit');
    expect(profileService).toContain('isBannerObjectFit');
    expect(profileService).toContain('normalizeBannerImageScale');
    expect(profileService).toContain('normalizeBannerObjectPosition');
    expect(profileService).toContain('BANNER_OBJECT_FIT_OPTIONS');
  });
});
