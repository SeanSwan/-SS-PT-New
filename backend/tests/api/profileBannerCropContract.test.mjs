import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const controllerSource = readFileSync(resolve(process.cwd(), 'controllers/profileController.mjs'), 'utf8');
const userModelSource = readFileSync(resolve(process.cwd(), 'models/User.mjs'), 'utf8');
const migrationSource = readFileSync(resolve(process.cwd(), 'migrations/20260524000100-expand-banner-crop-controls.cjs'), 'utf8');
const startupMigrationSource = readFileSync(resolve(process.cwd(), 'utils/startupMigrations.mjs'), 'utf8');

describe('profile banner crop persistence contract', () => {
  it('accepts free percentage crop coordinates plus fit and scale fields', () => {
    expect(controllerSource).toContain("'bannerObjectFit'");
    expect(controllerSource).toContain("'bannerImageScale'");
    expect(controllerSource).toContain('isValidBannerObjectPosition');
    expect(controllerSource).toContain('isValidBannerObjectFit');
    expect(controllerSource).toContain('normalizeBannerImageScale');
    expect(controllerSource).not.toContain('bannerObjectPosition must be one of the 9 supported presets');
  });

  it('models banner crop storage without the old enum-only restriction', () => {
    expect(userModelSource).toMatch(/bannerObjectPosition:\s*{[\s\S]*?DataTypes\.STRING\(32\)/);
    expect(userModelSource).toContain('bannerObjectFit');
    expect(userModelSource).toContain('bannerImageScale');
    expect(userModelSource).not.toContain('enum_Users_bannerObjectPosition');
  });

  it('ships a Render migration that converts the old enum column to text and adds fit/scale', () => {
    expect(migrationSource).toContain('ALTER TABLE "Users" ALTER COLUMN "bannerObjectPosition" TYPE VARCHAR(32)');
    expect(migrationSource).toContain("addColumn('Users', 'bannerObjectFit'");
    expect(migrationSource).toContain("addColumn('Users', 'bannerImageScale'");
  });

  it('keeps startup repair migrations aligned with free crop storage', () => {
    expect(startupMigrationSource).toContain("'bannerObjectPosition', \"VARCHAR(32) NOT NULL DEFAULT '50% 50%'\"");
    expect(startupMigrationSource).toContain("'bannerObjectFit', \"VARCHAR(12) NOT NULL DEFAULT 'cover'\"");
    expect(startupMigrationSource).toContain("'bannerImageScale', 'DOUBLE PRECISION NOT NULL DEFAULT 1'");
    expect(startupMigrationSource).not.toContain('enum_Users_bannerObjectPosition');
  });
});
