import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const FRONTEND_ROOT = join(__dirname, '..', '..', '..', '..', '..');

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
});
