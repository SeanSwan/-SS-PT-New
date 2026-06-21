import { describe, expect, it } from 'vitest';
import { normalizeReadyPlayerMeUrl } from '../../utils/readyPlayerMeUrl.mjs';

describe('normalizeReadyPlayerMeUrl', () => {
  it('accepts HTTPS Ready Player Me GLB model URLs', () => {
    expect(normalizeReadyPlayerMeUrl('https://models.readyplayer.me/example.glb')).toBe(
      'https://models.readyplayer.me/example.glb'
    );
    expect(normalizeReadyPlayerMeUrl(' https://api.readyplayer.me/v1/avatars/example.glb?quality=medium ')).toBe(
      'https://api.readyplayer.me/v1/avatars/example.glb?quality=medium'
    );
  });

  it('rejects unsafe schemes, lookalike hosts, and non-model URLs', () => {
    expect(normalizeReadyPlayerMeUrl('javascript:readyplayer.me/example.glb')).toBeNull();
    expect(normalizeReadyPlayerMeUrl('https://evil.test/readyplayer.me/example.glb')).toBeNull();
    expect(normalizeReadyPlayerMeUrl('https://readyplayer.me.evil.test/example.glb')).toBeNull();
    expect(normalizeReadyPlayerMeUrl('https://swanstudios.readyplayer.me/avatar')).toBeNull();
    expect(normalizeReadyPlayerMeUrl('not a url')).toBeNull();
  });
});
