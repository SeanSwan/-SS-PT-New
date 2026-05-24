import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const clientProfileSource = read('../DashBoard/Pages/client-dashboard/ClientProfilePage.tsx');
const clientProgressSource = read('../DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx');
const trainerGamificationSource = read('../DashBoard/Pages/trainer-gamification/trainer-gamification-view.tsx');
const adminRpgSource = read('../DashBoard/Pages/admin-gamification/components/RPGFeaturesPanel.tsx');
const backendMountSource = read('../../../../backend/core/routes.mjs');
const gamificationV1RoutesSource = read('../../../../backend/routes/gamificationV1Routes.mjs');

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
    expect(clientProfileSource).toContain("import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')");
    expect(clientProgressSource).toContain("import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')");
    expect(trainerGamificationSource).toContain("import('../../../AdvancedGamification/components/AegisHud')");
    expect(trainerGamificationSource).toContain("import('../../../AdvancedGamification/components/CompanionPet')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/AegisHud')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/JobClassSelector')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/CompanionPet')");
    expect(adminRpgSource).toContain("import('../../../../AdvancedGamification/components/GhostMode')");
    expect(adminRpgSource).toContain('<GhostModeBanner userId={userId} />');
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
    expect(sources.ghostMode).toContain("authAxios.get(url)");
    expect(sources.ghostMode).toContain("authAxios.post(`${API_BASE}/users/${userId}/ghost/compare`");
    expect(sources.ghostMode).not.toContain("localStorage.getItem('token')");
    expect(sources.ghostMode).not.toMatch(/\bfetch\s*\(/);
    expect(sources.ghostMode).not.toMatch(/Authorization\s*:/);
  });

  it('keeps staged vault decryption calls on shared apiService transport', () => {
    expectSharedTransport(sources.vault);
    expect(sources.vault).toContain('/api/gamification');
    expect(sources.vault).toContain('`/users/${userId}/vault/roll`');
    expect(sources.vault).toContain('`/users/${userId}/vault/inventory`');
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
});
