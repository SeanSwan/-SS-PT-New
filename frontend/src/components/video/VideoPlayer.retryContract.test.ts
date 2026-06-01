import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const videoDir = __dirname;
const srcDir = resolve(videoDir, '../..');

const playerSource = readFileSync(resolve(videoDir, './VideoPlayer.tsx'), 'utf8');
const watchPageSource = readFileSync(resolve(srcDir, './pages/VideoWatch.tsx'), 'utf8');
const routeSource = readFileSync(resolve(srcDir, './routes/main-routes.tsx'), 'utf8');

describe('VideoPlayer retry contract', () => {
  it('retries hosted video playback in-app instead of reloading the page', () => {
    expect(routeSource).toMatch(/path:\s*'watch\/:slug'/);
    expect(watchPageSource).toContain("import VideoPlayer from '../components/video/VideoPlayer'");
    expect(watchPageSource).toContain('<VideoPlayer');

    expect(playerSource).not.toContain('window.location.reload()');
    expect(playerSource).toContain('const handleRetryPlayback = useCallback(async () => {');
    expect(playerSource).toContain('await refreshUrl();');
    expect(playerSource).toContain('setRetryNonce(prevNonce => prevNonce + 1);');
    expect(playerSource).toContain('key={`hosted-video-${retryNonce}`}');
    expect(playerSource).toContain('onClick={() => void handleRetryPlayback()}');
  });
});
