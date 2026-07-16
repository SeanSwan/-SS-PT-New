/**
 * ============================================================================
 * FILE: TodayTrainingModule.mount.test.ts
 * PURPOSE: Lock the shared Today module into both canonical Home hosts.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Inspects source wiring, rollback fallbacks, rollout flags, and UI safeguards.
 * HOW IT FITS IN THE APP: Guards the canonical client Today rollout before release.
 * KEY DECISIONS: Assertions use public state and source contracts, never private data.
 * NASM PROTOCOL CONTEXT: Verifies presentation and routing truth, not prescriptions.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('TodayTrainingModule canonical mounts', () => {
  it('mounts the same shared module in both verified Home compositions', () => {
    const userHome = read('src/components/UserDashboard/components/HomeTab.tsx');
    const clientHome = read('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');

    expect(userHome).toContain("import TodayTrainingModule from '../../DashBoard/shared/client-training/TodayTrainingModule'");
    expect(clientHome).toContain("import TodayTrainingModule from '../../DashBoard/shared/client-training/TodayTrainingModule'");
    expect(userHome).toContain('<TodayTrainingModule');
    expect(clientHome).toContain('<TodayTrainingModule');
  });

  it('preserves the former command strip and embedded Today row as flag-off fallbacks', () => {
    const userHome = read('src/components/UserDashboard/components/HomeTab.tsx');
    const clientHome = read('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');
    const shelf = read('src/components/DashBoard/Pages/client-dashboard/plan/ClientProgramShelf.tsx');

    expect(userHome).toContain('clientTodayTrainingModuleEnabled()');
    expect(userHome).toContain('<HomeTrainingCommandStrip');
    expect(clientHome).toContain('clientTodayTrainingModuleEnabled()');
    expect(clientHome).toContain('showTodayAssignment={!todayTrainingEnabled}');
    expect(shelf).toContain('showTodayAssignment?: boolean');
  });
  it('locks rollout, responsive, touch, and reduced-motion safeguards', () => {
    const renderConfig = read('../render.yaml');
    const envExample = read('../.env.example');
    const styles = read('src/components/DashBoard/shared/client-training/TodayTrainingModule.styles.ts');
    const productionFiles = [
      'src/components/DashBoard/shared/client-training/TodayTrainingModule.tsx',
      'src/components/DashBoard/shared/client-training/TodayTrainingModule.logic.ts',
      'src/components/DashBoard/shared/client-training/TodayTrainingModule.styles.ts',
    ];

    expect(renderConfig.match(/VITE_CLIENT_TODAY_TRAINING_MODULE/g)).toHaveLength(2);
    expect(renderConfig).toContain('TRAINING_PLAN_PDF_DERIVATIVES');
    expect(envExample).toContain('VITE_CLIENT_TODAY_TRAINING_MODULE=false');
    expect(styles).toContain('min-height: 44px');
    expect(styles).toContain('@media (max-width: 640px)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    productionFiles.forEach((path) => expect(read(path).split(/\r?\n/).length, path).toBeLessThanOrEqual(300));
  });
});
