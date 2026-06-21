import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeAvatarHomeFactionId } from '../../utils/avatarHomeFactionId.mjs';

const routeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../routes/avatarHomeRoutes.mjs'),
  'utf8'
);

describe('normalizeAvatarHomeFactionId', () => {
  it('accepts trimmed faction IDs within the Avatar Home storage limit', () => {
    expect(normalizeAvatarHomeFactionId(' Swan Team ')).toBe('Swan Team');
    expect(normalizeAvatarHomeFactionId('forge-7')).toBe('forge-7');
  });

  it('maps empty values to null for leaving a faction', () => {
    expect(normalizeAvatarHomeFactionId(null)).toBeNull();
    expect(normalizeAvatarHomeFactionId('   ')).toBeNull();
  });

  it('rejects object-shaped, control-character, and overlong faction IDs', () => {
    expect(normalizeAvatarHomeFactionId({ label: 'raw-provider-object' })).toBeUndefined();
    expect(normalizeAvatarHomeFactionId('Swan\nTeam')).toBeUndefined();
    expect(normalizeAvatarHomeFactionId('x'.repeat(51))).toBeUndefined();
  });

  it('keeps the live Avatar Home faction route wired through the normalizer', () => {
    expect(routeSource).toContain("import { normalizeAvatarHomeFactionId } from '../utils/avatarHomeFactionId.mjs';");
    expect(routeSource).toMatch(/const safeFactionId = normalizeAvatarHomeFactionId\(factionId\);[\s\S]{0,180}safeFactionId === undefined/);
    expect(routeSource).toContain('await home.update({ factionId: safeFactionId });');
    expect(routeSource).toContain("logger.info(`[AUDIT] User ${req.user.id} ${safeFactionId ? 'joined a faction' : 'left faction'}`);");
    expect(routeSource).not.toContain('joined faction "${factionId}"');
    expect(routeSource).toMatch(/const safeFactionId = normalizeAvatarHomeFactionId\(home\.factionId\);[\s\S]{0,160}safeFactionId === undefined \? null : safeFactionId/);
  });
});
