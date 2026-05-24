import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const layoutSource = read('../DashBoard/UniversalDashboardLayout.tsx');
const backendMountSource = read('../../../../backend/core/routes.mjs');
const videoSessionRoutesSource = read('../../../../backend/routes/videoSessionRoutes.mjs');

const sources = {
  page: stripComments(read('./VideoCallPage.tsx')),
  room: stripComments(read('./VideoRoom.tsx')),
  wearable: stripComments(read('./WearableDataPanel.tsx')),
  rom: stripComments(read('./ROMTrackingPanel.tsx')),
};

const expectSharedTransport = (source: string) => {
  expect(source).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/services\/api\.service['"]/);
  expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  expect(source).not.toMatch(/Authorization\s*:/);
  expect(source).not.toMatch(/\bfetch\s*\(/);
};

describe('Video Call auth pipeline', () => {
  it('is mounted as dashboard video-call and backed by protected video session routes', () => {
    expect(layoutSource).toMatch(/const VideoCallPage = React\.lazy\(\(\) => import\('\.\.\/VideoChat\/VideoCallPage'\)\)/);
    const routeMatches = layoutSource.match(/path: '\/video-call', component: VideoCallPage/g) || [];
    expect(routeMatches.length).toBeGreaterThanOrEqual(2);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/video-sessions', videoSessionRoutes\)/);
    expect(videoSessionRoutesSource).toMatch(/router\.use\(protect\)/);
    expect(videoSessionRoutesSource).toMatch(/router\.post\('\/', authorize\(\['admin', 'trainer'\]\),/);
    expect(videoSessionRoutesSource).toMatch(/router\.get\('\/:id\/join',/);
    expect(videoSessionRoutesSource).toMatch(/router\.patch\('\/:id\/notes', authorize\(\['admin', 'trainer'\]\),/);
    expect(videoSessionRoutesSource).toMatch(/router\.post\('\/:id\/micro-win', authorize\(\['admin', 'trainer'\]\),/);
    expect(videoSessionRoutesSource).toMatch(/router\.post\('\/:id\/rom', protect,/);
    expect(videoSessionRoutesSource).toMatch(/router\.post\('\/:id\/wearable', protect,/);
  });

  it('keeps mounted video-call session calls on shared apiService auth transport', () => {
    Object.values(sources).forEach(expectSharedTransport);

    expect(sources.page).toContain('/api/video-sessions');
    expect(sources.page).toContain('/join');
    expect(sources.page).toContain('/transcription');
    expect(sources.page).toMatch(/apiService\.get/);
    expect(sources.page).toMatch(/apiService\.post/);
    expect(sources.page).not.toMatch(/videoSessionId:\s*d\.data\?\.videoSessionId\s*\|\|\s*0/);
    expect(sources.page).not.toMatch(/roomName:\s*d\.data\?\.roomName\s*\|\|\s*''/);
    expect(sources.page).not.toMatch(/livekitUrl:\s*d\.data\?\.livekitUrl\s*\|\|\s*''/);

    expect(sources.room).toContain('/notes');
    expect(sources.room).toContain('/micro-win');
    expect(sources.room).toContain('/end');
    expect(sources.room).toMatch(/apiService\.patch/);
    expect(sources.room).toMatch(/apiService\.post/);

    expect(sources.wearable).toContain('/wearable');
    expect(sources.wearable).toMatch(/apiService\.get/);
    expect(sources.wearable).toMatch(/apiService\.post/);

    expect(sources.rom).toContain('/rom');
    expect(sources.rom).toMatch(/apiService\.post/);
  });
});
