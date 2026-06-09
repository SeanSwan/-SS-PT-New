import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');
const readRepoFile = (path: string) => readFileSync(resolve(repoRoot, path), 'utf8');

const adminCardStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientHubGridCard.styles.ts'
);
const adminCardActions = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientHubGridCardActions.tsx'
);
const trainerCardStyles = readRepoFile(
  'frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.cardStyles.ts'
);
const trainerCard = readRepoFile(
  'frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.clientCard.tsx'
);
const agentsDoc = readRepoFile('AGENTS.md');
const claudeDoc = readRepoFile('CLAUDE.md');

describe('Swan client card system contract', () => {
  it('uses the same lightweight card and button primitives for admin and trainer client cards', () => {
    expect(adminCardStyles).toContain('swanDataCardShell');
    expect(adminCardActions).toContain('swanClientActionButton');
    expect(trainerCardStyles).toContain('swanDataCardShell');
    expect(trainerCardStyles).toContain('swanClientActionButton');
  });

  it('keeps trainer client cards low-motion instead of using hover/tap animation props', () => {
    expect(trainerCard).not.toContain('whileHover');
    expect(trainerCard).not.toContain('whileTap');
  });

  it('codifies the attached store-card visual standard in both project instruction files', () => {
    expect(agentsDoc).toContain('Swan Card/Button Standard');
    expect(claudeDoc).toContain('Swan Card/Button Standard');
    expect(agentsDoc).toContain('store/showcase cards may use the full animated SheenCard/GlowButton treatment');
    expect(claudeDoc).toContain('store/showcase cards may use the full animated SheenCard/GlowButton treatment');
  });
});
