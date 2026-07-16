import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const socialFeedSource = readFileSync(resolve(__dirname, './SocialFeed.tsx'), 'utf8');
const stateSource = readFileSync(resolve(__dirname, './components/SocialFeedState.tsx'), 'utf8');
const viewModelSource = readFileSync(resolve(__dirname, './hooks/useSocialFeedViewModel.ts'), 'utf8');

describe('SocialFeed retry contract', () => {
  it('retries the feed request through useSocialFeed instead of reloading the page', () => {
    expect(socialFeedSource).not.toContain('window.location.reload()');
    expect(viewModelSource).toContain('const feed = useSocialFeed();');
    expect(viewModelSource).toContain('...feed,');
    expect(socialFeedSource).toContain('onRetry={() => void viewModel.refreshPosts()}');
    expect(stateSource).toContain('<ContainedButton onClick={onRetry}>');
  });
});
