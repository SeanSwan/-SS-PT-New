import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const routeSource = read('src/routes/main-routes.tsx');
const socialPageSource = read('src/pages/Social/SocialPage.V3.tsx');
const socialFeedSource = read('src/components/Social/Feed/SocialFeed.tsx');
const userDashboardTabsSource = read('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
const homeLiveWidgetsSource = read('src/components/UserDashboard/components/useHomeTabLiveWidgets.ts');
const tickerSource = stripComments(read('src/hooks/social/useActivityTicker.ts'));
const socketManagerSource = read('../backend/socket/socketManager.mjs');
const socialAutoPostSource = stripComments(read('../backend/services/socialAutoPost.mjs'));

describe('useActivityTicker socket auth pipeline', () => {
  it('is mounted from the active social and user dashboard surfaces', () => {
    expect(routeSource).toContain("() => import('../pages/Social/SocialPage.V3')");
    expect(routeSource).toContain("() => import('../components/UserDashboard/UserDashboard.V3')");
    expect(socialPageSource).toContain("import SocialFeed from '../../components/Social/Feed/SocialFeed'");
    expect(socialFeedSource).toContain("import { useActivityTicker } from '../../../hooks/social/useActivityTicker'");
    expect(userDashboardTabsSource).toContain("const SocialFeed = lazy(() => import('../../Social/Feed/SocialFeed'))");
    expect(homeLiveWidgetsSource).toContain("import { useActivityTicker } from '../../../hooks/social/useActivityTicker'");
  });

  it('authenticates root socket activity through the central token manager', () => {
    expect(tickerSource).toContain("import { ProductionTokenManager } from '../../services/api.service'");
    expect(tickerSource).toContain('const token = ProductionTokenManager.getToken()');
    expect(tickerSource).toContain("socket.emit('authenticate', { token })");
    expect(tickerSource).toContain("socket.on('authenticated'");
    expect(tickerSource).toContain("socket.on('auth_error'");
    expect(tickerSource).not.toContain("localStorage.getItem('token')");
  });

  it('matches backend root socket auth and authenticated social broadcasts', () => {
    expect(socketManagerSource).toContain('const userId = decoded.userId ?? decoded.id');
    expect(socketManagerSource).toContain('switch (String(userRole || \'\').toUpperCase())');
    expect(socketManagerSource).toContain("socket.on('authenticate'");
    expect(socketManagerSource).toContain("rooms.push('user')");
    expect(socialAutoPostSource).toContain("io.to(['user', 'trainer']).emit('social:activity'");
    expect(socialAutoPostSource).not.toMatch(/\bio\.emit\('social:activity'/);
  });
});
