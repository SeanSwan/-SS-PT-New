import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const socialFeedSource = readFileSync(resolve(__dirname, './SocialFeed.tsx'), 'utf8');

describe('SocialFeed retry contract', () => {
  it('retries the feed request through useSocialFeed instead of reloading the page', () => {
    expect(socialFeedSource).not.toContain('window.location.reload()');
    expect(socialFeedSource).toMatch(/refreshPosts,\s*\n\s*\}/);
    expect(socialFeedSource).toContain('onClick={() => void refreshPosts()}');
  });
});
