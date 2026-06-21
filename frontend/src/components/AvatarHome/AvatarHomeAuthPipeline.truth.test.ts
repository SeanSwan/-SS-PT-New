import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const lineCount = (source: string) => source.trimEnd().split(/\r?\n/).length;

const routeComponentsSource = read('../DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const routeRegistrySource = read('../DashBoard/UniversalDashboardLayout.routes.tsx');
const backendMountSource = read('../../../../backend/core/routes.mjs');
const avatarRoutesSource = read('../../../../backend/routes/avatarHomeRoutes.mjs');
const gamificationRoutesSource = read('../../../../backend/routes/gamificationV1Routes.mjs');
const avatarHomePageStylesSource = read('./AvatarHomePage.styles.ts');
const companionPetStylesSource = read('./CompanionPetPanel.styles.ts');
const petAdoptionModalStylesSource = read('./PetAdoptionModal.styles.ts');
const marketplaceStylesSource = read('./CrystallineMarketplace.styles.ts');

const sources = {
  page: stripComments(read('./AvatarHomePage.tsx')),
  homeWorld: stripComments(read('./HomeWorld.tsx')),
  levelGate: stripComments(read('./LevelGate.tsx')),
  minimalistView: stripComments(read('./MinimalistView.tsx')),
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
    expect(routeComponentsSource).toMatch(/export const AvatarHomePage = React\.lazy\(\(\) => import\('\.\.\/AvatarHome\/AvatarHomePage'\)\)/);
    const dashboardRouteMatches = routeRegistrySource.match(/path: '\/my-home', component: AvatarHomePage/g) || [];
    expect(dashboardRouteMatches.length).toBeGreaterThanOrEqual(3);

    expect(backendMountSource).toMatch(/app\.use\('\/api\/avatar-home', avatarHomeRoutes\)/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/gamification', gamificationV1Routes\)/);
    expect(avatarRoutesSource).toMatch(/router\.use\(protect\)/);
    expect(gamificationRoutesSource).toMatch(/router\.get\('\/users\/:userId\/pet', authenticate,/);
    expect(gamificationRoutesSource).toMatch(/router\.post\('\/users\/:userId\/pet\/adopt', authenticate,/);
    expect(gamificationRoutesSource).toMatch(/router\.post\('\/users\/:userId\/pet\/interact', authenticate,/);
  });

  it('keeps mounted Avatar Home reads and mutations on shared apiService auth transport', () => {
    [
      sources.page,
      sources.petPanel,
      sources.adoptionModal,
      sources.marketplace,
      sources.factionPanel,
      sources.readyPlayerMe,
    ].forEach(expectSharedTransport);

    expect(sources.page).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home'\)/);
    expect(sources.page).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/gamification\/profile'\)/);
    expect(sources.page).toMatch(/apiService\.patch[\s\S]{0,180}'\/api\/avatar-home\/minimalist-mode'/);
    expect(sources.page).toMatch(/apiService\.patch[\s\S]{0,220}'\/api\/avatar-home\/room'[\s\S]{0,80}\{\s*room\s*\}/);
    expect(sources.page).toContain("const AVATAR_HOME_LOAD_ERROR = 'Unable to load Avatar Home. Please try again later.';");
    expect(sources.page).toContain("const AVATAR_HOME_MUTATION_ERROR = 'Unable to update Avatar Home. Please try again.';");
    expect(sources.page).toContain('const [mutationError, setMutationError] = useState<string | null>(null);');
    expect(sources.page).toContain('setMutationError(AVATAR_HOME_MUTATION_ERROR);');
    expect(sources.page).toContain('<ErrorBanner role="status" aria-live="polite">{mutationError}</ErrorBanner>');
    expect(sources.page).not.toContain('catch {}');
    expect(sources.page).toContain('type AvatarHomeResponse = {');
    expect(sources.page).toContain('currentLevel?: unknown');
    expect(sources.page).toContain('const safeHome = normalizeAvatarHomeData(d.data);');
    expect(sources.page).toContain('setHomeData(safeHome);');
    expect(sources.page).toContain("import { normalizeAvatarHomeLevel } from './avatarHomeNumbers';");
    expect(sources.page).toContain('const homeLevel = normalizeAvatarHomeLevel(d.meta?.currentLevel);');
    expect(sources.page).toContain('if (homeLevel !== null) setUserLevel(homeLevel);');
    expect(sources.page).toContain('const profileLevel = normalizeAvatarHomeLevel(profile?.level);');
    expect(sources.page).not.toContain('const numericValue = typeof value === \'number\' ? value : Number(value);');
    expect(sources.page).not.toContain('useState<number>(1)');
    expect(sources.page).not.toContain('setHomeData(d.data || null)');
    expect(sources.page).not.toContain('setError(d.message');
    expect(sources.page).not.toContain("setError('Network error')");
    expect(sources.page).toContain('getSafeGamificationIdSegment');
    expect(sources.page).toContain('const profileUserIdSegment = getSafeGamificationIdSegment');
    expect(sources.page).toContain('userIdSegment={userIdSegment}');
    expect(sources.page).not.toContain('setUserId(profile.id)');
    expect(sources.page).not.toContain('userId={userId}');

    expect(sources.petPanel).toMatch(/apiService\.get[\s\S]{0,220}`\/api\/gamification\/users\/\$\{userIdSegment\}\/pet`/);
    expect(sources.petPanel).toMatch(/apiService\.post[\s\S]{0,220}`\/api\/gamification\/users\/\$\{userIdSegment\}\/pet\/interact`/);
    expect(sources.petPanel).toContain(
      "const COMPANION_LOAD_ERROR = 'Companion data is unavailable. Please try again later.';"
    );
    expect(sources.petPanel).toContain('const [loadError, setLoadError] = useState<string | null>(null);');
    expect(sources.petPanel).toContain('setLoadError(COMPANION_LOAD_ERROR);');
    expect(sources.petPanel).toContain('role="status"');
    expect(sources.petPanel).toContain('setPetData(normalizePetData(d.data));');
    expect(sources.petPanel).not.toContain('setPetData(d.data)');
    expect(sources.petPanel).toMatch(/interactionType: type/);
    expect(sources.petPanel).not.toContain('/api/gamification/users/${userId}/pet');

    expect(sources.adoptionModal).toMatch(/apiService\.post[\s\S]{0,220}\(`\/api\/gamification\/users\/\$\{userIdSegment\}\/pet\/adopt`,\s*\{\s*species: selected,\s*petName: petName\.trim\(\),\s*\}\)/);
    expect(sources.adoptionModal).not.toContain('/api/gamification/users/${userId}/pet/adopt');
    expect(sources.adoptionModal).toContain('const adoptingRef = useRef(false);');
    expect(sources.adoptionModal).toContain(
      "const PET_ADOPTION_ERROR = 'Unable to adopt companion. Please try again.';"
    );
    expect(sources.adoptionModal).toContain('const [status, setStatus] = useState<string | null>(null);');
    expect(sources.adoptionModal).toContain('setStatus(PET_ADOPTION_ERROR);');
    expect(sources.adoptionModal).toContain('role="status"');

    expect(sources.marketplace).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home\/marketplace'\)/);
    expect(sources.marketplace).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home\/crystals'\)/);
    expect(sources.marketplace).toContain("('/api/avatar-home/marketplace/purchase', {");
    expect(sources.marketplace).toMatch(/itemId,\s*\}/);

    expect(sources.factionPanel).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/avatar-home\/faction'\)/);
    expect(sources.factionPanel).toContain('const normalizeFactionId = (value: unknown): string | null =>');
    expect(sources.factionPanel).toContain('const MAX_FACTION_ID_LENGTH = 50;');
    expect(sources.factionPanel).toContain('const CONTROL_CHARS = /[\\u0000-\\u001F\\u007F]/;');
    expect(sources.factionPanel).toContain('if (trimmed.length > MAX_FACTION_ID_LENGTH) return null;');
    expect(sources.factionPanel).toContain('if (CONTROL_CHARS.test(trimmed)) return null;');
    expect(sources.factionPanel).toMatch(/apiService\.patch[\s\S]{0,260}'\/api\/avatar-home\/faction'[\s\S]{0,160}factionId: safeSubmittedFactionId/);
    expect(sources.factionPanel).toMatch(/const trimmedFaction = normalizeFactionId\(inputFaction\)/);
    expect(sources.factionPanel).toMatch(/void updateFaction\(trimmedFaction\)/);
    expect(sources.factionPanel).toMatch(/void updateFaction\(null\)/);
    expect(sources.factionPanel).toContain('const updatingRef = useRef(false);');
    expect(avatarRoutesSource).toContain("import { normalizeAvatarHomeFactionId } from '../utils/avatarHomeFactionId.mjs';");
    expect(avatarRoutesSource).toContain('const safeFactionId = normalizeAvatarHomeFactionId(factionId);');
    expect(avatarRoutesSource).toContain("message: 'Invalid faction ID'");
    expect(avatarRoutesSource).toContain("safeFactionId ? 'joined a faction' : 'left faction'");
    expect(avatarRoutesSource).not.toContain('joined faction "${factionId}"');

    expect(sources.readyPlayerMe).toContain("('/api/avatar-home/ready-player-me', {");
    expect(sources.readyPlayerMe).toMatch(/avatarUrl: urlInput\.trim\(\)/);
    expect(sources.readyPlayerMe).toContain('aria-label="Ready Player Me avatar URL"');
  });

  it('keeps the mounted Avatar Home page shell compact and motion-safe', () => {
    expect(lineCount(read('./AvatarHomePage.tsx'))).toBeLessThanOrEqual(300);
    expect(lineCount(avatarHomePageStylesSource)).toBeLessThanOrEqual(300);
    expect(sources.page).not.toContain('style={{');
    expect(sources.page).not.toContain('rgba(');
    expect(avatarHomePageStylesSource).not.toContain('rgba(');
    expect(avatarHomePageStylesSource).not.toContain('transition: all');
    expect(avatarHomePageStylesSource).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps touched companion pet files compact and motion-safe', () => {
    expect(lineCount(read('./CompanionPetPanel.tsx'))).toBeLessThanOrEqual(300);
    expect(lineCount(companionPetStylesSource)).toBeLessThanOrEqual(300);
    expect(sources.petPanel).not.toContain('style={{');
    expect(sources.adoptionModal).not.toContain('rgba(');
    expect(sources.adoptionModal).not.toContain('style={{');
    expect(sources.adoptionModal).not.toContain("color: '#60C0F0'");
    expect(lineCount(read('./PetAdoptionModal.tsx'))).toBeLessThanOrEqual(300);
    expect(lineCount(petAdoptionModalStylesSource)).toBeLessThanOrEqual(300);
    expect(companionPetStylesSource).not.toContain('rgba(');
    expect(companionPetStylesSource).not.toContain('transition: all');
    expect(petAdoptionModalStylesSource).not.toContain('rgba(');
    expect(petAdoptionModalStylesSource).not.toContain('transition: all');
    expect(companionPetStylesSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(petAdoptionModalStylesSource).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps the mounted Avatar Home faction hook tokenized and free of inline presentation', () => {
    expect(lineCount(read('./FactionHooksPanel.tsx'))).toBeLessThanOrEqual(300);
    expect(read('./FactionHooksPanel.tsx')).not.toMatch(/[^\x00-\x7F]/);
    expect(sources.factionPanel).not.toContain('style={{');
    expect(sources.factionPanel).not.toContain('rgba(');
    expect(sources.factionPanel).not.toContain('transition: all');
    expect(sources.factionPanel).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps the mounted Avatar Home world preview tokenized and free of inline presentation', () => {
    expect(lineCount(read('./HomeWorld.tsx'))).toBeLessThanOrEqual(300);
    expect(sources.homeWorld).not.toContain('style={{');
    expect(sources.homeWorld).not.toContain('rgba(');
    expect(sources.homeWorld).not.toContain('transition: all');
    expect(sources.homeWorld).not.toContain("color: '#8B5CF6'");
    expect(sources.homeWorld).not.toMatch(/react-three|WebGPU|npm install|renderer/i);
  });

  it('keeps locked and minimalist Avatar Home surfaces tokenized, compact, and accessible', () => {
    const lockedAndMinimalistSource = `${sources.levelGate}\n${sources.minimalistView}`;

    expect(lineCount(read('./LevelGate.tsx'))).toBeLessThanOrEqual(300);
    expect(lineCount(read('./MinimalistView.tsx'))).toBeLessThanOrEqual(300);
    expect(lockedAndMinimalistSource).not.toContain('style={{');
    expect(lockedAndMinimalistSource).not.toContain('rgba(');
    expect(sources.levelGate).toContain('role="progressbar"');
    expect(sources.levelGate).toContain('aria-valuenow={safeCurrentLevel}');
    expect(sources.levelGate).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps Ready Player Me saves safe, tokenized, and compact on the mounted Avatar Home route', () => {
    const readyPlayerMeSource = read('./ReadyPlayerMeAvatar.tsx');

    expect(lineCount(readyPlayerMeSource)).toBeLessThanOrEqual(300);
    expect(readyPlayerMeSource).not.toMatch(/[^\x00-\x7F]/);
    expect(sources.readyPlayerMe).toContain(
      "const READY_PLAYER_ME_SAVE_ERROR = 'Unable to link avatar. Please check the URL and try again.';"
    );
    expect(sources.readyPlayerMe).toContain(
      "const READY_PLAYER_ME_NETWORK_ERROR = 'Avatar link service is temporarily unavailable. Please try again.';"
    );
    expect(sources.readyPlayerMe).not.toContain('d.message');
    expect(sources.readyPlayerMe).not.toContain('Failed to save');
    expect(sources.readyPlayerMe).not.toContain('Network error');
    expect(sources.readyPlayerMe).not.toContain('style={{');
    expect(sources.readyPlayerMe).not.toContain('rgba(');
  });

  it('keeps Crystalline Marketplace purchases safe, tokenized, and touch-ready', () => {
    expect(lineCount(read('./CrystallineMarketplace.tsx'))).toBeLessThanOrEqual(300);
    expect(lineCount(marketplaceStylesSource)).toBeLessThanOrEqual(300);
    const marketplaceAllSource = `${sources.marketplace}\n${marketplaceStylesSource}`;
    expect(sources.marketplace).toContain(
      "const MARKETPLACE_LOAD_ERROR = 'Marketplace balances are unavailable. Please try again later.';"
    );
    expect(sources.marketplace).toContain(
      "const MARKETPLACE_PURCHASE_ERROR = 'Unable to complete purchase. Check your crystals and try again.';"
    );
    expect(sources.marketplace).toContain(
      "const MARKETPLACE_NETWORK_ERROR = 'Marketplace service is temporarily unavailable. Please try again.';"
    );
    expect(sources.marketplace).toContain('Promise.allSettled');
    expect(sources.marketplace).toContain("'Balance unavailable'");
    expect(sources.marketplace).toContain('const purchasingRef = useRef<string | null>(null);');
    expect(marketplaceStylesSource).toMatch(/const FilterBtn[\s\S]{0,220}min-height:\s*44px/);
    expect(marketplaceAllSource).not.toContain('d.message');
    expect(marketplaceAllSource).not.toContain('Purchase failed');
    expect(marketplaceAllSource).not.toContain('Network error');
    expect(marketplaceAllSource).not.toContain('style={{');
    expect(marketplaceAllSource).not.toContain('rgba(');
  });
});
