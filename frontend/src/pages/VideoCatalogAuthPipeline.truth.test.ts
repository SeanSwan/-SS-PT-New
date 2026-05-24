import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const routeSource = read('../routes/main-routes.tsx');
const dashboardSource = read('../components/DashBoard/UniversalDashboardLayout.tsx');
const backendMountSource = read('../../../backend/core/routes.mjs');
const publicRoutesSource = read('../../../backend/routes/videoCatalogPublicRoutes.mjs');
const memberRoutesSource = read('../../../backend/routes/videoCatalogMemberRoutes.mjs');
const adminRoutesSource = read('../../../backend/routes/videoCatalogRoutes.mjs');

const sources = {
  catalogHook: stripComments(read('../hooks/useVideoCatalog.ts')),
  watchPage: stripComments(read('./VideoWatch.tsx')),
  membersVault: stripComments(read('./MembersVault.tsx')),
  videoPlayer: stripComments(read('../components/video/VideoPlayer.tsx')),
  watchProgress: stripComments(read('../components/video/WatchProgress.tsx')),
  youtubeCta: stripComments(read('../components/video/YouTubeCTA.tsx')),
  libraryV3: stripComments(read('./VideoLibraryV3.tsx')),
  libraryV2: stripComments(read('./VideoLibraryV2.tsx')),
  collectionDetail: stripComments(read('./CollectionDetail.tsx')),
};

const expectSharedTransport = (source: string) => {
  expect(source).toMatch(/import\s+apiService\s+from\s+['"].*services\/api\.service['"]/);
  expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  expect(source).not.toMatch(/Authorization\s*:/);
  expect(source).not.toMatch(/\bfetch\s*\(/);
};

describe('Video catalog auth and playback pipeline', () => {
  it('is mounted through public, member, dashboard, and protected backend routes', () => {
    expect(routeSource).toMatch(/path:\s*'video-library'/);
    expect(routeSource).toMatch(/path:\s*'watch\/:slug'/);
    expect(routeSource).toMatch(/path:\s*'collections\/:slug'/);
    expect(routeSource).toMatch(/path:\s*'members\/videos'/);
    expect(dashboardSource).toMatch(/path:\s*'\/videos', component: VideoLibraryPage/);

    expect(backendMountSource).toMatch(/app\.use\('\/api\/v2\/videos', videoCatalogPublicRoutes\)/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/v2\/videos', videoCatalogMemberRoutes\)/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/v2\/admin\/videos', videoCatalogAdminRoutes\)/);
    expect(publicRoutesSource).toMatch(/router\.use\(optionalAuth\)/);
    expect(memberRoutesSource).toMatch(/router\.use\(protect\)/);
    expect(adminRoutesSource).toMatch(/router\.use\(protect, adminOnly\)/);
  });

  it('keeps active video catalog calls on shared apiService transport', () => {
    Object.values(sources).forEach(expectSharedTransport);
  });

  it('matches the backend watch, progress, signed-url, and outbound-click contracts', () => {
    expect(sources.watchPage).toContain('signedUrl: data.signedUrl ?? videoPayload.signedUrl');
    expect(sources.watchPage).toContain('captionsUrl: data.captionsUrl ?? videoPayload.captionsUrl');
    expect(sources.videoPlayer).toContain('data.data?.signedUrl ?? data.signedUrl');
    expect(sources.watchProgress).toContain('progressSeconds: Math.floor(time)');
    expect(sources.watchProgress).toContain('completionPct');
    expect(sources.watchProgress).not.toContain('currentTime: Math.floor(time)');
    expect(sources.youtubeCta).toContain('clickType');
    expect(sources.youtubeCta).not.toContain('destination');
  });
});
