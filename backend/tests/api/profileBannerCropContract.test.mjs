import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const controllerSource = readFileSync(resolve(process.cwd(), 'controllers/profileController.mjs'), 'utf8');
const userModelSource = readFileSync(resolve(process.cwd(), 'models/User.mjs'), 'utf8');
const migrationSource = readFileSync(resolve(process.cwd(), 'migrations/20260524000100-expand-banner-crop-controls.cjs'), 'utf8');
const startupMigrationSource = readFileSync(resolve(process.cwd(), 'utils/startupMigrations.mjs'), 'utf8');
const profileRoutesSource = readFileSync(resolve(process.cwd(), 'routes/profileRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(process.cwd(), 'core/routes.mjs'), 'utf8');
const coreMiddlewareSource = readFileSync(resolve(process.cwd(), 'core/middleware/index.mjs'), 'utf8');

describe('profile banner crop persistence contract', () => {
  it('accepts free percentage crop coordinates plus fit and scale fields', () => {
    expect(controllerSource).toContain("'bannerObjectFit'");
    expect(controllerSource).toContain("'bannerImageScale'");
    expect(controllerSource).toContain("'bannerFrameHeight'");
    expect(controllerSource).toContain("'bannerCollagePhotos'");
    expect(controllerSource).toContain("'bannerCollageLayout'");
    expect(controllerSource).toContain("'bannerStickyCarousel'");
    expect(controllerSource).toContain("'bannerPresets'");
    expect(controllerSource).toContain("'smart-carousel'");
    expect(controllerSource).toContain("'smart'");
    expect(controllerSource).toContain('isValidBannerObjectPosition');
    expect(controllerSource).toContain('isValidBannerObjectFit');
    expect(controllerSource).toContain('isValidBannerCollageLayout');
    expect(controllerSource).toContain('normalizeBannerImageScale');
    expect(controllerSource).toContain('normalizeBannerCollagePhotos');
    expect(controllerSource).toContain('normalizeBannerPresets');
    expect(controllerSource).toContain('MAX_BANNER_FRAME_HEIGHT = 1000');
    expect(controllerSource).toContain('MAX_BANNER_COLLAGE_PHOTOS = 12');
    expect(controllerSource).toContain('MAX_BANNER_COLLAGE_VIDEOS = 3');
    expect(controllerSource).toContain('videoCount >= MAX_BANNER_COLLAGE_VIDEOS');
    expect(controllerSource).not.toContain('bannerObjectPosition must be one of the 9 supported presets');
  });

  it('models banner crop storage without the old enum-only restriction', () => {
    expect(userModelSource).toMatch(/bannerObjectPosition:\s*{[\s\S]*?DataTypes\.STRING\(32\)/);
    expect(userModelSource).toContain('bannerObjectFit');
    expect(userModelSource).toContain('bannerImageScale');
    expect(userModelSource).toContain('bannerFrameHeight');
    expect(userModelSource).toContain('bannerCollagePhotos');
    expect(userModelSource).toContain('bannerCollageLayout');
    expect(userModelSource).toContain('bannerStickyCarousel');
    expect(userModelSource).toContain('bannerPresets');
    expect(userModelSource).not.toContain('enum_Users_bannerObjectPosition');
  });

  it('ships a Render migration that converts the old enum column to text and adds fit/scale', () => {
    expect(migrationSource).toContain('ALTER TABLE "Users" ALTER COLUMN "bannerObjectPosition" TYPE VARCHAR(32)');
    expect(migrationSource).toContain("addColumn('Users', 'bannerObjectFit'");
    expect(migrationSource).toContain("addColumn('Users', 'bannerImageScale'");
  });

  it('keeps startup repair migrations aligned with free crop storage', () => {
    expect(startupMigrationSource).toContain("'bannerObjectPosition', \"VARCHAR(32) NOT NULL DEFAULT '50% 50%'\"");
    expect(startupMigrationSource).toContain("'bannerObjectFit', \"VARCHAR(12) NOT NULL DEFAULT 'smart'\"");
    expect(startupMigrationSource).toContain("'bannerImageScale', 'DOUBLE PRECISION NOT NULL DEFAULT 1'");
    expect(startupMigrationSource).toContain("'bannerFrameHeight', 'INTEGER NOT NULL DEFAULT 320'");
    expect(startupMigrationSource).toContain("'bannerCollagePhotos', \"JSONB NOT NULL DEFAULT '[]'::jsonb\"");
    expect(startupMigrationSource).toContain("'bannerCollageLayout', \"VARCHAR(24) NOT NULL DEFAULT 'stream'\"");
    expect(startupMigrationSource).toContain("'bannerStickyCarousel', 'BOOLEAN NOT NULL DEFAULT false'");
    expect(startupMigrationSource).toContain("'bannerPresets', \"JSONB NOT NULL DEFAULT '[]'::jsonb\"");
    expect(startupMigrationSource).not.toContain('enum_Users_bannerObjectPosition');
  });

  it('ships a follow-up migration for persisted banner frame height and collage photos', () => {
    const heightMigrationSource = readFileSync(
      resolve(process.cwd(), 'migrations/20260524000200-add-banner-frame-height.cjs'),
      'utf8',
    );

    expect(heightMigrationSource).toContain("addColumn('Users', 'bannerFrameHeight'");
    expect(heightMigrationSource).toContain('defaultValue: 320');
    expect(heightMigrationSource).toContain("addColumn('Users', 'bannerCollagePhotos'");
    expect(heightMigrationSource).toContain('defaultValue: []');
  });

  it('ships a follow-up migration for banner presentation layouts, sticky carousel, and presets', () => {
    const presentationMigrationSource = readFileSync(
      resolve(process.cwd(), 'migrations/20260525000100-add-banner-presentation-presets.cjs'),
      'utf8',
    );

    expect(presentationMigrationSource).toContain("addColumn('Users', 'bannerCollageLayout'");
    expect(presentationMigrationSource).toContain("addColumn('Users', 'bannerStickyCarousel'");
    expect(presentationMigrationSource).toContain("addColumn('Users', 'bannerPresets'");
    expect(presentationMigrationSource).toContain('defaultValue: []');
  });

  it('has a non-destructive collage photo upload route separate from the main cover upload', () => {
    expect(profileRoutesSource).toContain("'/upload-banner-collage-photo'");
    expect(profileRoutesSource).toContain("category: 'banner-collage'");
    expect(profileRoutesSource).toContain("'.mp4'");
    expect(profileRoutesSource).toContain("'video/mp4'");
    expect(profileRoutesSource).not.toContain('await deletePhoto(user.bannerCollagePhotos');
  });

  it('serves uploaded collage media from the photo proxy category allowlists', () => {
    expect(coreRoutesSource).toContain("'banner-collage'");
    expect(coreMiddlewareSource).toContain('banner-collage');
  });
});
