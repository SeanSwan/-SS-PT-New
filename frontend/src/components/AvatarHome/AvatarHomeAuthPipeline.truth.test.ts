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
const avatarRoutesSource = read('../../../../backend/routes/avatarHomeRoutes.mjs');
const gamificationRoutesSource = read('../../../../backend/routes/gamificationV1Routes.mjs');

const sources = {
  page: stripComments(read('./AvatarHomePage.tsx')),
  petPanel: stripComments(read('./CompanionPetPanel.tsx')),
  adoptionModal: stripComments(read('./PetAdoptionModal.tsx')),
  marketplace: stripComments(read('./CrystallineMarketplace.tsx')),
  factionPanel: stripComments(read('./FactionHooksPanel.tsx')),
  readyPlayerMe: stripComments(read('./ReadyPlayerMeAvatar.tsx')),
};

const expectSharedTransport = (source: string) => {
  expect(source).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/services\/api\.service['"]/);
  expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  expect(source).not.toMatch(/Authorization\s*:/);
  expect(source).not.toMatch(/\bfetch\s*\(/);
};

describe('Avatar Home auth pipeline', () => {
  it('is mounted for dashboard users with protected avatar-home and pet routes', () => {
    expect(layoutSource).toMatch(/const AvatarHomePage = React\.lazy\(\(\) => import\('\.\.\/AvatarHome\/AvatarHomePage'\)\)/);
    const dashboardRouteMatches = layoutSource.match(/path: '\/my-home', component: AvatarHomePage/g) || [];
    expect(dashboardRouteMatches.length).toBeGreaterThanOrEqual(3);

    expect(backendMountSource).toMatch(/app\.use\('\/api\/avatar-home', avatarHomeRoutes\)/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/gamification', gamificationV1Routes\)/);
    expect(avatarRoutesSource).toMatch(/router\.use\(protect\)/);
    expect(gamificationRoutesSource).toMatch(/router\.get\('\/users\/:userId\/pet', authenticate,/);
    expect(gamificationRoutesSource).toMatch(/router\.post\('\/users\/:userId\/pet\/adopt', authenticate,/);
    expect(gamificationRoutesSource).toMatch(/router\.post\('\/users\/:userId\/pet\/interact', authenticate,/);
  });

  it('keeps mounted Avatar Home reads and mutations on shared apiService auth transport', () => {
    Object.values(sources).forEach(expectSharedTransport);

    expect(sources.page).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home'\)/);
    expect(sources.page).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/gamification\/profile'\)/);
    expect(sources.page).toMatch(/apiService\.patch[\s\S]{0,140}\('\/api\/avatar-home\/minimalist-mode'\)/);
    expect(sources.page).toMatch(/apiService\.patch[\s\S]{0,180}\('\/api\/avatar-home\/room',\s*\{\s*room\s*\}\)/);

    expect(sources.petPanel).toMatch(/apiService\.get[\s\S]{0,180}\(`\/api\/gamification\/users\/\$\{userId\}\/pet`\)/);
    expect(sources.petPanel).toMatch(/apiService\.post[\s\S]{0,220}\(`\/api\/gamification\/users\/\$\{userId\}\/pet\/interact`,\s*\{\s*interactionType: type\s*\}\)/);

    expect(sources.adoptionModal).toMatch(/apiService\.post[\s\S]{0,220}\(`\/api\/gamification\/users\/\$\{userId\}\/pet\/adopt`,\s*\{\s*species: selected,\s*petName: petName\.trim\(\),\s*\}\)/);

    expect(sources.marketplace).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home\/marketplace'\)/);
    expect(sources.marketplace).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home\/crystals'\)/);
    expect(sources.marketplace).toContain("('/api/avatar-home/marketplace/purchase', {");
    expect(sources.marketplace).toMatch(/itemId,\s*\}/);

    expect(sources.factionPanel).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home\/faction'\)/);
    const factionPatchMatches = sources.factionPanel.match(/\('\/api\/avatar-home\/faction',\s*\{/g) || [];
    expect(factionPatchMatches.length).toBeGreaterThanOrEqual(2);
    expect(sources.factionPanel).toMatch(/factionId: inputFaction\.trim\(\)/);
    expect(sources.factionPanel).toMatch(/factionId: null/);

    expect(sources.readyPlayerMe).toContain("('/api/avatar-home/ready-player-me', {");
    expect(sources.readyPlayerMe).toMatch(/avatarUrl: urlInput\.trim\(\)/);
  });
});
