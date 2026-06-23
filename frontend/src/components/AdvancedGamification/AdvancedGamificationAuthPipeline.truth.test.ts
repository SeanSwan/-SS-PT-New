import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const dashboardLayoutSource = read('../DashBoard/UniversalDashboardLayout.tsx');
const clientProfileSource = read('../DashBoard/Pages/client-dashboard/ClientProfilePage.tsx');
const clientProgressSource = read('../DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx');
const adminRpgSource = read('../DashBoard/Pages/admin-gamification/components/RPGFeaturesPanel.tsx');
const backendMountSource = read('../../../../backend/core/routes.mjs');
const gamificationV1RoutesSource = read('../../../../backend/routes/gamificationV1Routes.mjs');
const aegisHudComponentSourceRaw = read('./components/AegisHud/AegisHud.tsx');
const aegisHudComponentSource = stripComments(aegisHudComponentSourceRaw);
const companionPetComponentSourceRaw = read('./components/CompanionPet/CompanionPet.tsx');
const companionPetComponentSource = stripComments(companionPetComponentSourceRaw);
const aegisHudTypesSourceRaw = read('./components/AegisHud/AegisHudTypes.ts');
const aegisHudNeedBarSourceRaw = read('./components/AegisHud/NeedBarComponent.tsx');
const aegisHudMoodletSourceRaw = read('./components/AegisHud/MoodletBadge.tsx');
const useAegisHudSourceRaw = read('./components/AegisHud/useAegisHud.ts');
const petSpriteSourceRaw = read('./components/CompanionPet/PetSprite.tsx');
const petSpriteSource = stripComments(petSpriteSourceRaw);
const companionPetStylesSourceRaw = read('./components/CompanionPet/CompanionPetStyles.ts');
const companionPetStylesSource = stripComments(companionPetStylesSourceRaw);
const aegisHudStylesSourceRaw = read('./components/AegisHud/AegisHudStyles.ts');
const aegisHudStylesSource = stripComments(aegisHudStylesSourceRaw);
const jobClassSelectorSourceRaw = read('./components/JobClassSelector/JobClassSelector.tsx');
const jobClassSelectorSource = stripComments(jobClassSelectorSourceRaw);
const jobClassSelectorStylesSourceRaw = read('./components/JobClassSelector/JobClassSelector.styles.ts');
const jobClassSelectorStylesSource = stripComments(jobClassSelectorStylesSourceRaw);
const ghostModeBannerSource = stripComments(read('./components/GhostMode/GhostModeBanner.tsx'));
const ghostModeStylesSource = stripComments(read('./components/GhostMode/GhostModeStyles.ts'));
const vaultAnimationSourceRaw = read('./components/VaultDecryption/VaultDecryptionAnimation.tsx');
const vaultAnimationSource = stripComments(vaultAnimationSourceRaw);
const vaultStylesSourceRaw = read('./components/VaultDecryption/VaultDecryptionStyles.ts');
const vaultStylesSource = stripComments(vaultStylesSourceRaw);
const gamificationPathSource = read('./utils/gamificationPath.ts');

const sources = {
  companionPet: stripComments(read('./components/CompanionPet/useCompanionPet.ts')),
  aegisHud: stripComments(read('./components/AegisHud/useAegisHud.ts')),
  jobClass: stripComments(read('./components/JobClassSelector/JobClassSelector.tsx')),
  ghostMode: stripComments(read('./components/GhostMode/useGhostMode.ts')),
  vault: stripComments(read('./components/VaultDecryption/useVaultDecryption.ts')),
};

const expectSharedTransport = (source: string) => {
  expect(source).toContain("import apiService from '../../../../services/api.service'");
  expect(source).not.toContain("localStorage.getItem('token')");
  expect(source).not.toMatch(/\bfetch\s*\(/);
  expect(source).not.toMatch(/Authorization\s*:/);
};

describe('advanced gamification auth pipeline', () => {
  it('covers mounted companion pet, Aegis HUD, and job-class surfaces', () => {
    expect(dashboardLayoutSource).toContain("const AdminGamificationView = React.lazy(() => import('./Pages/admin-gamification/admin-gamification-view'))");
    expect(dashboardLayoutSource).toContain("{ path: '/gamification', component: AdminGamificationView");
    expect(clientProfileSource).toContain("import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')");
    expect(clientProgressSource).toContain("import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/AegisHud')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/JobClassSelector')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/CompanionPet')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/GhostMode')");
    expect(adminRpgSource).toContain('const safeUserId = getSafeGamificationUserSegment(user?.id)');
    expect(adminRpgSource).toContain('<GhostModeBanner userId={previewUserId} />');
  });

  it('keeps active advanced gamification calls on shared apiService transport', () => {
    [sources.companionPet, sources.aegisHud, sources.jobClass].forEach(expectSharedTransport);
    expect(sources.companionPet).toContain('/api/gamification');
    expect(sources.aegisHud).toContain('/api/gamification');
    expect(sources.jobClass).toContain('/api/gamification');
  });

  it('keeps active ghost mode preview on centralized auth transport', () => {
    expect(sources.ghostMode).toContain("import { useAuth } from '../../../../context/AuthContext'");
    expect(sources.ghostMode).toContain('const { authAxios } = useAuth();');
    expect(sources.ghostMode).toContain("authAxios.get(`${API_BASE}/ghost/config`)");
    expect(sources.ghostMode).toContain('getGamificationUserPath(userId,');
    expect(sources.ghostMode).toContain("authAxios.get(url)");
    expect(sources.ghostMode).not.toContain("authAxios.post(`${API_BASE}/users/${userId}/ghost/compare`");
    expect(sources.ghostMode).not.toContain("localStorage.getItem('token')");
    expect(sources.ghostMode).not.toMatch(/\bfetch\s*\(/);
    expect(sources.ghostMode).not.toMatch(/Authorization\s*:/);
  });

  it('keeps staged vault decryption calls on shared apiService transport', () => {
    expectSharedTransport(sources.vault);
    expect(sources.vault).toContain('/api/gamification');
    expect(sources.vault).toContain('getGamificationUserPath(userId,');
    expect(sources.vault).not.toContain('`/users/${userId}/vault/roll`');
    expect(sources.vault).not.toContain('`/users/${userId}/vault/inventory`');
  });

  it('classifies Vault Decryption as staged outside the mounted dashboard route tree', () => {
    expect(dashboardLayoutSource).not.toContain('VaultDecryption');
    expect(adminRpgSource).not.toContain('VaultDecryption');
    expect(clientProfileSource).not.toContain('VaultDecryption');
    expect(clientProgressSource).not.toContain('VaultDecryption');
  });

  it('keeps dormant Vault Decryption animation safe if it is mounted later', () => {
    expect(vaultAnimationSourceRaw).not.toMatch(/[^\x00-\x7F]/);
    expect(vaultStylesSourceRaw).not.toMatch(/[^\x00-\x7F]/);
    expect(vaultAnimationSource).not.toContain('style={{');
    expect(vaultAnimationSource).toContain('type="button"');
    expect(vaultAnimationSource).toContain('aria-live="polite"');
    expect(vaultStylesSource).not.toContain('rgba(');
    expect(vaultStylesSource).not.toContain('transition: all');
    expect(vaultStylesSource).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps mounted RPG user API paths behind one safe integer-segment helper', () => {
    expect(gamificationPathSource).toContain('export function getSafeGamificationUserSegment');
    expect(gamificationPathSource).toContain('export function getGamificationUserPath');

    for (const source of [
      sources.companionPet,
      sources.aegisHud,
      sources.jobClass,
      sources.ghostMode,
      sources.vault,
    ]) {
      expect(source).toContain("from '../../utils/gamificationPath'");
      expect(source).not.toContain('${userId}');
    }
  });

  it('mounts V1 backend routes for the active pet, Aegis HUD, and job-class endpoints', () => {
    expect(backendMountSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(gamificationV1RoutesSource).toContain("router.get('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), gamificationController.getPet)");
    expect(gamificationV1RoutesSource).toContain("router.get('/users/:userId/aegis-hud', authenticate, authorizeResourceAccess('userId'), gamificationController.getAegisHud)");
    expect(gamificationV1RoutesSource).toContain("router.post('/users/:userId/aegis-hud/replenish', authenticate, authorizeResourceAccess('userId'), gamificationController.replenishAegisHud)");
    expect(gamificationV1RoutesSource).toContain("router.get('/users/:userId/job-class', authenticate, authorizeResourceAccess('userId'), gamificationController.getJobClass)");
    expect(gamificationV1RoutesSource).toContain("router.put('/users/:userId/job-class', authenticate, authorizeResourceAccess('userId'), gamificationController.setJobClass)");
  });

  it('mounts V1 backend routes for active ghost mode endpoints', () => {
    expect(backendMountSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(gamificationV1RoutesSource).toContain("router.get('/ghost/config', authenticate, requireUser, gamificationController.getGhostConfig)");
    expect(gamificationV1RoutesSource).toContain("router.get('/users/:userId/ghost', authenticate, authorizeResourceAccess('userId'), gamificationController.getGhost)");
    expect(gamificationV1RoutesSource).toContain("router.post('/users/:userId/ghost/compare', authenticate, authorizeResourceAccess('userId'), gamificationController.compareGhost)");
  });

  it('mounts V1 backend routes for staged vault decryption endpoints', () => {
    expect(backendMountSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(gamificationV1RoutesSource).toContain("router.get('/vault/config', authenticate, requireUser, gamificationController.getVaultConfig)");
    expect(gamificationV1RoutesSource).toContain("router.post('/users/:userId/vault/roll', authenticate, authorizeResourceAccess('userId'), pointActionLimiter, gamificationController.rollVaultDrop)");
    expect(gamificationV1RoutesSource).toContain("router.get('/users/:userId/vault/inventory', authenticate, authorizeResourceAccess('userId'), gamificationController.getVaultInventory)");
  });

  it('keeps staged vault decryption animation safe for future mounting', () => {
    expect(vaultAnimationSource).not.toContain('style={{');
    expect(vaultAnimationSource).toContain('type="button"');
    expect(vaultAnimationSourceRaw).not.toMatch(/[^\x00-\x7F]/);
    expect(vaultStylesSourceRaw.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(vaultStylesSourceRaw).not.toMatch(/[^\x00-\x7F]/);
    expect(vaultStylesSource).not.toContain('rgba(');
    expect(vaultStylesSource).not.toContain('transition: all');
    expect(vaultStylesSource).toContain('prefers-reduced-motion: reduce');
  });

  it('keeps the mounted Aegis HUD preview from rendering raw backend errors or inline styles', () => {
    expect(aegisHudComponentSource).not.toContain('style={{');
    expect(aegisHudComponentSource).not.toContain('{error}</p>');
    expect(aegisHudComponentSource).not.toContain('error={error}');
    expect(aegisHudComponentSource).toContain('<AegisHudError onRetry={refresh} />');
    expect(useAegisHudSourceRaw).toContain('isAegisHudData');
    expect(useAegisHudSourceRaw).toContain('Array.isArray(data?.needs)');
    expect(useAegisHudSourceRaw).toContain('Number.isFinite(data.overallHealth)');
    expect(useAegisHudSourceRaw).toContain('getValidAegisHudData(result)');
  });

  it('keeps the mounted CompanionPet preview free of inline styles and component-level health colors', () => {
    expect(companionPetComponentSource).not.toContain('style={{');
    expect(companionPetComponentSource).not.toContain('const healthColor');
    expect(companionPetComponentSource).toContain('<SpeciesIcon');
    expect(companionPetComponentSource).toContain('<LoadingPetContainer');
  });

  it('keeps mounted RPG component sources ASCII-clean and lucide-driven', () => {
    for (const source of [
      aegisHudComponentSourceRaw,
      aegisHudTypesSourceRaw,
      aegisHudNeedBarSourceRaw,
      aegisHudMoodletSourceRaw,
      useAegisHudSourceRaw,
      companionPetComponentSourceRaw,
    ]) {
      expect(source).not.toMatch(/[^\x00-\x7F]/);
    }

    expect(companionPetComponentSource).not.toMatch(/icon:\s*['"`]/);
    expect(companionPetComponentSource).toContain('HeartHandshake');
    expect(companionPetComponentSource).toContain('<Icon size={24} aria-hidden />');
    expect(companionPetComponentSource).toContain('<HeartHandshake size={14} aria-hidden />');
  });

  it('keeps the mounted CompanionPet sprite under the file cap without inline SVG styles', () => {
    expect(petSpriteSourceRaw.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(petSpriteSource).not.toContain('style={{');
    expect(petSpriteSourceRaw).not.toMatch(/[^\x00-\x7F]/);
  });

  it('keeps the mounted JobClassSelector under the component line cap with data/styles extracted', () => {
    expect(jobClassSelectorSourceRaw.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(jobClassSelectorSource).not.toContain('styled.');
    expect(jobClassSelectorSource).not.toContain('keyframes');
    expect(jobClassSelectorSource).toContain("from './JobClassSelector.data'");
    expect(jobClassSelectorSource).toContain("from './JobClassSelector.styles'");
  });

  it('keeps mounted RPG preview style files on tokenized alpha colors', () => {
    for (const source of [aegisHudStylesSource, companionPetStylesSource, jobClassSelectorStylesSource]) {
      expect(source).not.toContain('rgba(');
    }
  });

  it('keeps mounted RPG styles ASCII-clean without hex-alpha token fallbacks', () => {
    const activeStylePairs = [
      [aegisHudStylesSourceRaw, aegisHudStylesSource],
      [companionPetStylesSourceRaw, companionPetStylesSource],
      [jobClassSelectorStylesSourceRaw, jobClassSelectorStylesSource],
    ];

    for (const [rawSource, styleSource] of activeStylePairs) {
      expect(rawSource).not.toMatch(/[^\x00-\x7F]/);
      expect(styleSource).not.toMatch(/#[0-9A-Fa-f]{4}\b/);
      expect(styleSource).not.toMatch(/#[0-9A-Fa-f]{8}\b/);
    }
  });

  it('keeps the mounted GhostMode preview from rendering raw hook errors', () => {
    expect(ghostModeBannerSource).not.toContain('{error ||');
    expect(ghostModeBannerSource).not.toContain('error,');
    expect(ghostModeBannerSource).toContain('Your best session becomes the ghost to beat.');
  });

  it('keeps mounted GhostMode failures honest and safe', () => {
    expect(ghostModeBannerSource).toContain('error: ghostError');
    expect(ghostModeBannerSource).toContain('Ghost comparison is temporarily unavailable.');
    expect(ghostModeBannerSource).not.toContain('{ghostError}');
    expect(ghostModeBannerSource).toContain('type="button"');
  });

  it('keeps mounted GhostMode visible copy free of mojibake', () => {
    expect(ghostModeBannerSource).not.toMatch(/[ÂÃ�]|â|ð/);
    expect(ghostModeBannerSource).not.toMatch(/[^\x00-\x7F]/);
    expect(ghostModeBannerSource).toContain('Best volume session');
    expect(ghostModeBannerSource).toContain('Unknown session date');
    expect(ghostModeBannerSource).toContain('Number.isFinite(parsedDate.getTime())');
    expect(ghostModeBannerSource).not.toContain('return dateStr');
  });

  it('keeps mounted GhostMode styles on tokenized color expressions', () => {
    expect(ghostModeStylesSource).not.toContain('rgba(');
    expect(ghostModeStylesSource).not.toContain('#8BA8C8');
  });
});
