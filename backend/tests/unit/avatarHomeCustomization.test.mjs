import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildAvatarHomeCustomizationUpdates } from '../../utils/avatarHomeCustomization.mjs';

const routeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../routes/avatarHomeRoutes.mjs'),
  'utf8'
);

describe('buildAvatarHomeCustomizationUpdates', () => {
  it('builds valid partial Avatar Home customization updates', () => {
    expect(buildAvatarHomeCustomizationUpdates({
      bodyType: 'muscular',
      skinTone: '#C68642',
      hairStyle: 'short_fade',
      hairColor: '#2C1B0E',
      outfit: 'starter_workout',
    })).toEqual({
      error: null,
      updates: {
        avatarBodyType: 'muscular',
        avatarSkinTone: '#C68642',
        avatarHairStyle: 'short_fade',
        avatarHairColor: '#2C1B0E',
        avatarOutfit: 'starter_workout',
      },
    });
  });

  it('ignores empty values so partial saves remain no-op safe', () => {
    expect(buildAvatarHomeCustomizationUpdates({
      bodyType: '',
      skinTone: null,
      hairStyle: undefined,
    })).toEqual({ error: null, updates: {} });
  });

  it('rejects malformed enum, color, length, and object-shaped values', () => {
    expect(buildAvatarHomeCustomizationUpdates({ bodyType: 'alien' }).error).toBe('Invalid avatar body type');
    expect(buildAvatarHomeCustomizationUpdates({ skinTone: 'blue' }).error).toBe('Invalid avatar skin tone');
    expect(buildAvatarHomeCustomizationUpdates({ hairColor: '#12345Z' }).error).toBe('Invalid avatar hair color');
    expect(buildAvatarHomeCustomizationUpdates({ hairStyle: 'x'.repeat(31) }).error).toBe('Invalid avatar hair style');
    expect(buildAvatarHomeCustomizationUpdates({ outfit: { id: 'starter_workout' } }).error).toBe('Invalid avatar outfit');
  });

  it('keeps the live Avatar Home avatar route wired through the customization validator', () => {
    expect(routeSource).toContain("import { buildAvatarHomeCustomizationUpdates } from '../utils/avatarHomeCustomization.mjs';");
    expect(routeSource).toContain('const { updates, error } = buildAvatarHomeCustomizationUpdates(req.body);');
    expect(routeSource).toContain("return res.status(400).json({ success: false, message: error });");
    expect(routeSource).not.toContain('if (bodyType) updates.avatarBodyType = bodyType;');
  });
});
