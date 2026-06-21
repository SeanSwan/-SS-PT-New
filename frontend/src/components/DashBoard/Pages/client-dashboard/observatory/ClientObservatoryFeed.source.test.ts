import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (path: string): string => readFileSync(resolve(__dirname, path), 'utf8');

const SOURCE = readSource('./ClientObservatoryFeed.tsx');
const STYLES_SOURCE = readSource('./ClientObservatoryFeed.styles.ts');
const PREVIEW_SOURCE = readSource('./ClientObservatoryFeed.preview.ts');
const ROUTES_SOURCE = readFileSync(
  resolve(__dirname, '../../../UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const ROUTE_COMPONENTS_SOURCE = readFileSync(
  resolve(__dirname, '../../../UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const CLIENT_HOME_SOURCE = readSource('../ClientHomeTab.tsx');
const OBSERVATORY_HOME_SOURCE = readSource('./ClientObservatoryHome.tsx');

describe('ClientObservatoryFeed mounted source contract', () => {
  it('is the mounted client overview community feed preview', () => {
    expect(ROUTE_COMPONENTS_SOURCE).toContain(
      "export const ClientHomeTab = React.lazy(() => import('./Pages/client-dashboard/ClientHomeTab'))",
    );
    expect(ROUTES_SOURCE).toContain("{ path: '/overview', component: ClientHomeTab");
    expect(CLIENT_HOME_SOURCE).toContain("import ClientObservatoryHome from './observatory/ClientObservatoryHome'");
    expect(CLIENT_HOME_SOURCE).toContain('<ClientObservatoryHome />');
    expect(OBSERVATORY_HOME_SOURCE).toContain('const feedQuery = useSocialFeed({ limit: 6 });');
    expect(OBSERVATORY_HOME_SOURCE).toContain('<ClientObservatoryFeed');
  });

  it('uses deterministic sanitized preview rows instead of index fallback keys', () => {
    expect(SOURCE).not.toContain('post.id || index');
    expect(SOURCE).toContain('normalizeFeedPostPreviews(posts)');
    expect(PREVIEW_SOURCE).toContain('CONTROL_TEXT_PATTERN');
    expect(PREVIEW_SOURCE).toContain('stablePreviewKey');
  });

  it('keeps the mounted feed preview style tokenized and fixed-format', () => {
    expect(STYLES_SOURCE).not.toContain('rgba(');
    expect(STYLES_SOURCE).not.toContain('transition: all');
    expect(STYLES_SOURCE).not.toContain('clamp(');
    expect(STYLES_SOURCE).toContain('font: 900 2rem/1');
  });

  it('renders controlled post-receipt copy instead of raw caller messages', () => {
    expect(SOURCE).toContain('safeObservatoryPostReceiptMessage(postReceipt.message)');
    expect(SOURCE).not.toContain('{postReceipt.message}');
  });

  it('keeps the touched observatory feed sources under line cap and ASCII-clean', () => {
    [
      SOURCE,
      STYLES_SOURCE,
      PREVIEW_SOURCE,
      readSource('./ClientObservatoryFeed.source.test.ts'),
    ].forEach((source) => {
      expect(source.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
      expect(source).not.toMatch(/[\u00e2\uFFFD]/);
    });
  });
});
