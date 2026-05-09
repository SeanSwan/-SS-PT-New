import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const FRONTEND_ROOT = join(__dirname, '..', '..', '..', '..', '..');
const ADMIN_GAMIFICATION_SHELL_FILES = [
  'src/components/DashBoard/Pages/admin-gamification/AdminGamificationTabs.tsx',
  'src/components/DashBoard/Pages/admin-gamification/admin-gamification-view.tsx',
  'src/components/DashBoard/Pages/admin-gamification/admin-gamification.mappers.ts',
  'src/components/DashBoard/Pages/admin-gamification/admin-gamification.styles.ts',
  'src/components/DashBoard/Pages/admin-gamification/admin-gamification.types.ts',
  'src/components/DashBoard/Pages/admin-gamification/useAdminGamificationController.ts',
];
const ADMIN_GAMIFICATION_RPG_PANEL_FILES = [
  'src/components/DashBoard/Pages/admin-gamification/components/RPGFeaturesPanel.tsx',
  'src/components/DashBoard/Pages/admin-gamification/components/RPGFeaturesPanel.data.ts',
  'src/components/DashBoard/Pages/admin-gamification/components/RPGFeaturesPanel.styles.ts',
];

function readSource(path: string) {
  return readFileSync(join(FRONTEND_ROOT, path), 'utf8');
}

describe('admin gamification economy guardrail contract', () => {
  it('keeps the live admin route on AdminGamificationView instead of the dormant workspace wrapper', () => {
    const layoutSource = readSource('src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(layoutSource).toContain("path: '/gamification'");
    expect(layoutSource).toContain('component: AdminGamificationView');
    expect(layoutSource).not.toContain('component: GamificationWorkspace');
  });

  it('renders a reward economy guardrail on the canonical admin surface', () => {
    const viewSource = readSource('src/components/DashBoard/Pages/admin-gamification/admin-gamification-view.tsx');

    expect(viewSource).toContain('GamificationEconomyGuardrail');
    expect(viewSource).toContain('<GamificationEconomyGuardrail />');
  });

  it('anchors rewards to truthful health behavior categories', () => {
    const guardrailSource = readSource(
      'src/components/DashBoard/Pages/admin-gamification/components/GamificationEconomyGuardrail.tsx'
    );

    for (const category of ['Completion', 'Consistency', 'Mastery', 'Recovery', 'Contribution', 'Education']) {
      expect(guardrailSource).toContain(category);
    }

    expect(guardrailSource).toContain('Rewards only count when they map to real health behavior.');
  });

  it('keeps the canonical admin gamification shell and cleaned RPG panel under the file-size rule', () => {
    [...ADMIN_GAMIFICATION_SHELL_FILES, ...ADMIN_GAMIFICATION_RPG_PANEL_FILES].forEach(file => {
      const source = readSource(file);
      const lineCount = source.split(/\r?\n/).length;

      expect(lineCount, `${file} has ${lineCount} lines`).toBeLessThanOrEqual(300);
    });
  });

  it('wraps gamification tabs on phone widths instead of letting labels collide', () => {
    const stylesSource = readSource('src/components/DashBoard/Pages/admin-gamification/admin-gamification.styles.ts');

    expect(stylesSource).toContain('@media (max-width: 430px)');
    expect(stylesSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(stylesSource).toContain('flex-shrink: 0');
  });
});
