/**
 * Social post deletion cleanup parity
 * ===================================
 * Locks all hard-delete entry points to the shared media/hashtag cleanup.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('social post deletion cleanup parity', () => {
  it('routes the public social delete path through the shared cleanup helper', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/social/posts.mjs'), 'utf8');
    const cleanupIndex = source.indexOf('cleanupSocialPostDeletionSideEffects(post');
    const destroyIndex = source.indexOf('await post.destroy()');

    expect(source).toContain('cleanupSocialPostDeletionSideEffects');
    expect(cleanupIndex).toBeGreaterThan(-1);
    expect(destroyIndex).toBeGreaterThan(-1);
    expect(cleanupIndex).toBeLessThan(destroyIndex);
    expect(source).not.toContain('Hashtag count decrement failed');
  });

  it('keeps admin content deletion on the same shared cleanup helper', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/adminContentModerationController.mjs'), 'utf8');
    const cleanupIndex = source.indexOf('cleanupSocialPostDeletionSideEffects(post');
    const destroyIndex = source.indexOf('post.destroy({ transaction })');

    expect(cleanupIndex).toBeGreaterThan(-1);
    expect(destroyIndex).toBeGreaterThan(-1);
    expect(cleanupIndex).toBeLessThan(destroyIndex);
  });
});
