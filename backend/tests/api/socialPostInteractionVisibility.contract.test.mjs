/**
 * socialPostInteractionVisibility — SWA-129 Kimi call 6.
 * assertGroupPostAccess returns ok:true for ANY non-group post regardless of
 * visibility, so the like / unreact / comment / report handlers used to let a
 * stranger interact with a `private` or `friends`-only post by enumerating
 * postId (privacy breach + existence oracle + harassment/point-farm). The fix
 * routes those four handlers through assertPostInteractionAccess, which adds the
 * non-group visibility gate (private → owner only; friends → owner or an
 * accepted friendship), mirroring the single-post GET. This contract pins it in
 * place, matching the repo's source-slice contract style for posts.mjs.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const src = readFileSync(resolve(__dirname, '../../routes/social/posts.mjs'), 'utf8');

const helperSlice = () => {
  const start = src.indexOf('async function assertPostInteractionAccess');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n}', start);
  return src.slice(start, end + 2);
};

describe('assertPostInteractionAccess — non-group visibility gate', () => {
  it('is defined', () => {
    expect(src).toContain('async function assertPostInteractionAccess(post, user)');
  });

  it('still applies the group gate first', () => {
    expect(helperSlice()).toContain('await assertGroupPostAccess(post, user)');
  });

  it('denies a non-owner interacting with a private non-group post', () => {
    const slice = helperSlice();
    expect(slice).toMatch(/visibility === 'private' && post\.userId !== user\?\.id/);
  });

  it('requires an accepted friendship for a friends-only non-group post', () => {
    const slice = helperSlice();
    expect(slice).toMatch(/visibility === 'friends'/);
    expect(slice).toContain("status: 'accepted'");
    expect(slice).toContain('Friendship.findOne');
  });

  it('returns a 403-shaped denial', () => {
    expect(helperSlice()).toMatch(/ok:\s*false,\s*status:\s*403/);
  });
});

describe('the four interaction handlers route through the visibility-aware gate', () => {
  it.each([
    ['reportGate', 'report'],
    ['reactGate', 'like'],
    ['unreactGate', 'unreact'],
    ['commentGate', 'comment'],
  ])('%s uses assertPostInteractionAccess (not the bare group gate)', (varName) => {
    expect(src).toContain(`const ${varName} = await assertPostInteractionAccess(post, req.user)`);
    expect(src).not.toContain(`const ${varName} = await assertGroupPostAccess(post, req.user)`);
  });

  it('no interaction site still calls the bare group gate directly', () => {
    // The only assertGroupPostAccess call left is inside the helper itself.
    const bareCalls = (src.match(/= await assertGroupPostAccess\(post, req\.user\)/g) || []);
    expect(bareCalls.length).toBe(0);
  });
});
