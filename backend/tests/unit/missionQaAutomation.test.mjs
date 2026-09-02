import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function readRepo(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('mission QA automation guards', () => {
  it('ships a dedicated mission QA launcher with explicit write gates', () => {
    const launcherPath = path.join(repoRoot, 'scripts/qa/playwright-mission.mjs');
    expect(existsSync(launcherPath)).toBe(true);

    const source = readFileSync(launcherPath, 'utf8');
    expect(source).toContain('SWAN_MISSION_QA_MODE');
    expect(source).toContain('SWAN_MISSION_QA_ALLOW_WRITES');
    expect(source).toContain('SWAN_MISSION_QA_CONFIRM_PROD_DB_WRITES');
    expect(source).toContain('SWAN_MISSION_QA_LIVE_API');
    expect(source).toContain('normalizeAuthStatePath');
    expect(source).toContain('SWAN_PROD_ADMIN_AUTH_STATE');
    expect(source).toContain('--prod-live-readonly');
    expect(source).toContain('--grep-invert=@prod-live-readonly');
    expect(source).toContain('--allow-prod-write');
    expect(source).toContain('frontend/e2e/mission');
  });

  // CI-SKIPPED SWA-231: spawns the repo-root Playwright launcher, whose imports
  // live outside backend/node_modules; the backend CI job installs only backend
  // deps, so --help exits 1 there. Runs everywhere locally. Un-skip criteria:
  // a workspace-aware CI job, or a launcher --help path with zero fe deps.
  it.skipIf(!!process.env.CI)('keeps launcher help fast and prevents local Vite child leaks on Windows', () => {
    const launcherPath = path.join(repoRoot, 'scripts/qa/playwright-mission.mjs');
    const result = spawnSync(process.execPath, [launcherPath, '--help'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        BASE_URL: 'http://127.0.0.1:9',
      },
      timeout: 5_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/qa/playwright-mission.mjs');
    expect(result.stdout).toContain('--prod-readonly');
    expect(result.stdout).toContain('--staging-write');
    expect(result.stdout).not.toContain('Running 2 tests');

    const source = readFileSync(launcherPath, 'utf8');
    const helper = readFileSync(path.join(repoRoot, 'scripts/qa/local-frontend-server.mjs'), 'utf8');
    expect(source).toContain('cleanupFrontendProcess');
    expect(helper).toContain('taskkill');
    expect(source).toContain("node_modules', 'vite', 'bin', 'vite.js'");
    expect(source).not.toContain("['run', 'dev'");
  });

  it('guards mission QA against stale local frontend servers', () => {
    const launcherPath = path.join(repoRoot, 'scripts/qa/playwright-mission.mjs');
    const smokePath = path.join(repoRoot, 'scripts/qa/playwright-smoke.mjs');
    const helperPath = path.join(repoRoot, 'scripts/qa/local-frontend-server.mjs');
    expect(existsSync(helperPath)).toBe(true);

    const launcher = readFileSync(launcherPath, 'utf8');
    const smoke = readFileSync(smokePath, 'utf8');
    const helper = readFileSync(helperPath, 'utf8');

    expect(launcher).toContain("from './local-frontend-server.mjs'");
    expect(launcher).toContain('await waitForOwnedFrontendPort(localFrontendPort, frontendProcess)');
    expect(launcher).toContain('http://127.0.0.1:${localFrontendPort || 5173}');
    expect(smoke).toContain("from './local-frontend-server.mjs'");
    expect(smoke).toContain('http://127.0.0.1:${localFrontendPort}');
    expect(smoke).not.toContain('function canListenOnPort');
    expect(helper).toContain("const LOCAL_FRONTEND_HOST = '127.0.0.1'");
    expect(helper).toContain('server.listen({ port, host: LOCAL_FRONTEND_HOST, exclusive: true })');
    expect(helper).toContain('Frontend server exited before becoming ready');
    expect(helper).toContain('child.exitCode !== null || child.signalCode !== null');
  });

  it('can require production auth states so protected live checks do not skip silently', () => {
    const launcherPath = path.join(repoRoot, 'scripts/qa/playwright-mission.mjs');
    const result = spawnSync(process.execPath, [
      launcherPath,
      '--prod-live-readonly',
      '--require-prod-auth-roles=admin',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        SWAN_PROD_AUTH_STATE: '',
        SWAN_PROD_ADMIN_AUTH_STATE: '',
        SWAN_PROD_TRAINER_AUTH_STATE: '',
        SWAN_PROD_CLIENT_AUTH_STATE: '',
        SWAN_PROD_USER_AUTH_STATE: '',
      },
      timeout: 5_000,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing required production auth state for admin');
    expect(result.stderr).toContain('SWAN_PROD_ADMIN_AUTH_STATE');
    expect(result.stdout).not.toContain('Running ');
  });

  it('exposes mission QA root scripts without overloading canonical smoke', () => {
    const rootPackage = JSON.parse(readRepo('package.json'));

    expect(rootPackage.scripts['qa:mission']).toBe('node scripts/qa/playwright-mission.mjs');
    expect(rootPackage.scripts['qa:mission:prod-readonly'])
      .toBe('node scripts/qa/playwright-mission.mjs --prod-readonly');
    expect(rootPackage.scripts['qa:mission:prod-live-readonly'])
      .toBe('node scripts/qa/playwright-mission.mjs --prod-live-readonly');
    expect(rootPackage.scripts['qa:mission:prod-live-readonly:roles'])
      .toBe('node scripts/qa/playwright-mission.mjs --prod-live-readonly --require-prod-auth-roles=admin,trainer,client');
    expect(rootPackage.scripts['qa:dashboard-crawl:prod'])
      .toBe('node scripts/qa/playwright-mission.mjs --prod-live-readonly --require-prod-auth-roles=admin,trainer,client,user --grep=@dashboard-crawl -- --project="Desktop Chrome"');
    expect(rootPackage.scripts['qa:prod-auth:capture'])
      .toBe('node scripts/qa/capture-prod-auth-state.mjs');
    expect(rootPackage.scripts['qa:prod-auth:capture:admin'])
      .toBe('node scripts/qa/capture-prod-auth-state.mjs --role=admin');
    expect(rootPackage.scripts['qa:prod-auth:capture:trainer'])
      .toBe('node scripts/qa/capture-prod-auth-state.mjs --role=trainer');
    expect(rootPackage.scripts['qa:prod-auth:capture:client'])
      .toBe('node scripts/qa/capture-prod-auth-state.mjs --role=client');
    expect(rootPackage.scripts['qa:prod-auth:capture:user'])
      .toBe('node scripts/qa/capture-prod-auth-state.mjs --role=user');
    expect(rootPackage.scripts['qa:mission:cleanup'])
      .toBe('node scripts/qa/mission-qa-cleanup.mjs');
    expect(rootPackage.scripts['qa:mission:report'])
      .toBe('node scripts/qa/mission-report.mjs');
    expect(rootPackage.scripts['qa:smoke']).toBe('node scripts/qa/playwright-smoke.mjs');
  });

  it('ships a safe production auth-state capture helper with no embedded login values', () => {
    const launcherPath = path.join(repoRoot, 'scripts/qa/capture-prod-auth-state.mjs');
    expect(existsSync(launcherPath)).toBe(true);

    const result = spawnSync(process.execPath, [launcherPath, '--help'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 5_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/qa/capture-prod-auth-state.mjs');
    expect(result.stdout).toContain('--role=admin|trainer|client|user');
    expect(result.stdout).toContain('.auth/');
    expect(result.stdout).toContain('SWAN_PROD_ADMIN_AUTH_STATE');
    expect(result.stdout).toContain('SWAN_PROD_USER_AUTH_STATE');

    const source = readFileSync(launcherPath, 'utf8');
    expect(source).toContain('assertInsideAuthDir');
    expect(source).toContain('context.storageState');
    expect(source).toContain('--check-browser-driver');
    expect(source).toContain('playwright.default?.chromium');
    expect(source).not.toMatch(/password|sk_live|pk_live|whsec_/i);
  });

  it('verifies the production auth helper can resolve a Chromium driver without opening login', () => {
    const launcherPath = path.join(repoRoot, 'scripts/qa/capture-prod-auth-state.mjs');
    const result = spawnSync(process.execPath, [launcherPath, '--check-browser-driver'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Chromium browser driver available');
  });

  it('documents mission QA as opt-in and separates contract, read-only, and write modes', () => {
    const matrixPath = path.join(repoRoot, 'docs/qa/SWANSTUDIOS-MISSION-QA-MATRIX.md');
    expect(existsSync(matrixPath)).toBe(true);

    const matrix = readFileSync(matrixPath, 'utf8');
    expect(matrix).toContain('Mission QA Modes');
    expect(matrix).toContain('Contract');
    expect(matrix).toContain('Production Read-Only');
    expect(matrix).toContain('Production Live Read-Only');
    expect(matrix).toContain('SWAN_PROD_AUTH_STATE');
    expect(matrix).toContain('SWAN_PROD_ADMIN_AUTH_STATE');
    expect(matrix).toContain('SWAN_PROD_TRAINER_AUTH_STATE');
    expect(matrix).toContain('SWAN_PROD_CLIENT_AUTH_STATE');
    expect(matrix).toContain('SWAN_PROD_USER_AUTH_STATE');
    expect(matrix).toContain('qa:dashboard-crawl:prod');
    expect(matrix).toContain('qa:prod-auth:capture');
    expect(matrix).toContain('qa:mission:cleanup');
    expect(matrix).toContain('qa:mission:report');
    expect(matrix).toContain('Staging Write');
    expect(matrix).toContain('@swanstudios-qa.local');
    expect(matrix).toContain('Move Fitness');
    expect(matrix).toContain('SwanStudios paid client');
  });

  it('ships targeted QA cleanup and report helpers with production-safe defaults', () => {
    const cleanupPath = path.join(repoRoot, 'scripts/qa/mission-qa-cleanup.mjs');
    const reportPath = path.join(repoRoot, 'scripts/qa/mission-report.mjs');
    expect(existsSync(cleanupPath)).toBe(true);
    expect(existsSync(reportPath)).toBe(true);

    const cleanupHelp = spawnSync(process.execPath, [cleanupPath, '--help'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 5_000,
    });
    expect(cleanupHelp.status).toBe(0);
    expect(cleanupHelp.stdout).toContain('@swanstudios-qa.local');
    expect(cleanupHelp.stdout).toContain('--confirm=delete-qa-only');

    const cleanupSource = readFileSync(cleanupPath, 'utf8');
    expect(cleanupSource).toContain('DRY_RUN');
    expect(cleanupSource).toContain('@swanstudios-qa.local');
    expect(cleanupSource).toContain('DELETE_CLIENT_SESSIONS');
    expect(cleanupSource).not.toMatch(/TRUNCATE|DROP TABLE|DELETE FROM\s+sessions/i);

    const reportSource = readFileSync(reportPath, 'utf8');
    expect(reportSource).toContain('SWANSTUDIOS-MISSION-QA-REPORT');

    // RE-ANCHORED 2026-08-14. These two assertions named `residualRisks` and
    // `blockedWrites` — internal variables of the read-nothing facade that Slice 1
    // replaced (d528fd25f). Neither string has existed since, so this test has
    // been red ever since and nobody noticed: the guard on the QA report was
    // itself unguarded. The INTENT is unchanged — the report must still surface
    // coverage, the ranked findings, and what is being tolerated — so it now
    // asserts the sections the generator really emits, plus the exit-code
    // contract that is the actual CI gate (a report full of critical findings
    // used to exit 0).
    expect(reportSource).toContain('## Coverage');
    expect(reportSource).toContain('## Ranked repair list');
    expect(reportSource).toContain('## Suppressions');
    expect(reportSource).toMatch(/process\.exit\(\s*blocking\.length/);
  });

  it('covers the admin and trainer proof-loop workflow in the mission suite', () => {
    const specPath = path.join(repoRoot, 'frontend/e2e/mission/admin-trainer-proof-loop.contract.mission.spec.ts');
    expect(existsSync(specPath)).toBe(true);

    const spec = readFileSync(specPath, 'utf8');
    expect(spec).toContain('@mission @contract @readonly');
    expect(spec).toContain('/dashboard/trainer/clients');
    expect(spec).toContain('/dashboard/admin/workout-planner');
    expect(spec).toContain('SwanStudios paid client');

    const matrix = readFileSync(path.join(repoRoot, 'docs/qa/SWANSTUDIOS-MISSION-QA-MATRIX.md'), 'utf8');
    expect(matrix).toContain('Admin/trainer proof loop');
  });

  it('covers production live read-only checks without hardcoded production credentials', () => {
    const specPath = path.join(repoRoot, 'frontend/e2e/mission/production-live-readonly.mission.spec.ts');
    expect(existsSync(specPath)).toBe(true);

    const spec = readFileSync(specPath, 'utf8');
    expect(spec).toContain('@mission @prod-live-readonly @readonly');
    expect(spec).toContain('SWAN_MISSION_QA_LIVE_API');
    expect(spec).toContain('SWAN_PROD_AUTH_STATE');
    expect(spec).toContain('SWAN_PROD_ADMIN_AUTH_STATE');
    expect(spec).toContain('SWAN_PROD_TRAINER_AUTH_STATE');
    expect(spec).toContain('SWAN_PROD_CLIENT_AUTH_STATE');
    expect(spec).toContain('/dashboard/admin');
    expect(spec).toContain('/dashboard/trainer/clients');
    expect(spec).toContain('/dashboard/client/progress');
    expect(spec).not.toMatch(/password|sk_live|pk_live|whsec_/i);
  });

  it('covers all production dashboard roles with a read-only console crawler', () => {
    const specPath = path.join(repoRoot, 'frontend/e2e/mission/production-dashboard-crawl.mission.spec.ts');
    const routesPath = path.join(repoRoot, 'frontend/e2e/mission/production-dashboard-crawl.routes.ts');
    expect(existsSync(specPath)).toBe(true);
    expect(existsSync(routesPath)).toBe(true);

    const spec = readFileSync(specPath, 'utf8');
    const routes = readFileSync(routesPath, 'utf8');
    expect(spec).toContain('@dashboard-crawl');
    expect(spec).toContain('SWAN_PROD_ADMIN_AUTH_STATE');
    expect(spec).toContain('SWAN_PROD_TRAINER_AUTH_STATE');
    expect(spec).toContain('SWAN_PROD_CLIENT_AUTH_STATE');
    expect(spec).toContain('SWAN_PROD_USER_AUTH_STATE');
    expect(routes).toContain('/dashboard/admin/coach-assistant');
    expect(routes).toContain('/dashboard/trainer/clients');
    expect(routes).toContain('/dashboard/client/progress');
    expect(routes).toContain('/user-dashboard/progress');
    expect(spec).toContain('writeMethods.has(request.method())');
    expect(`${spec}\n${routes}`).not.toMatch(/password|sk_live|pk_live|whsec_/i);
  });

  it('covers Swan Coach and staging-write mission slices without enabling production writes', () => {
    const coachSpecPath = path.join(repoRoot, 'frontend/e2e/mission/swan-coach.contract.mission.spec.ts');
    const stagingSpecPath = path.join(repoRoot, 'frontend/e2e/mission/staging-write-safety.mission.spec.ts');
    expect(existsSync(coachSpecPath)).toBe(true);
    expect(existsSync(stagingSpecPath)).toBe(true);

    const coachSpec = readFileSync(coachSpecPath, 'utf8');
    expect(coachSpec).toContain('@mission @contract @readonly');
    expect(coachSpec).toContain('/api/ai/chat');
    expect(coachSpec).toContain('coachActionProposals');
    expect(coachSpec).toContain('requires_confirmation');

    const stagingSpec = readFileSync(stagingSpecPath, 'utf8');
    expect(stagingSpec).toContain('@mission @write');
    expect(stagingSpec).toContain('SWAN_MISSION_QA_ALLOW_WRITES');
    expect(stagingSpec).toContain('@swanstudios-qa.local');
    expect(stagingSpec).not.toMatch(/sswanstudios\.com|sk_live|pk_live|whsec_/i);
  });
});
