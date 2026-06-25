import { describe, expect, it } from 'vitest';
import {
  buildSocialPostDashboardRedirect,
  buildSocialPostSharePath,
  buildSocialPostShareUrl,
} from './socialPostShareUrl';

describe('social post share URLs', () => {
  it('builds the routed social post path with an encoded id', () => {
    expect(buildSocialPostSharePath('post 42/abc')).toBe('/social/posts/post%2042%2Fabc');
  });

  it('builds absolute share URLs from the active origin', () => {
    expect(buildSocialPostShareUrl('reel-1', 'https://sswanstudios.com/')).toBe(
      'https://sswanstudios.com/social/posts/reel-1',
    );
  });

  it('preserves the post id when redirecting legacy social post links into the dashboard', () => {
    expect(buildSocialPostDashboardRedirect('reel-1')).toBe('/user-dashboard?postId=reel-1');
  });
});