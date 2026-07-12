/**
 * Live bridge-shell composition lock.
 * Replaces the retired styleSplit contract, which guarded a LEGACY shell
 * (CommandCenterShell / .app-shell) that rendered nowhere and misled
 * restyles. This lock guards the tree that actually mounts:
 * CommandBridgeShell and its composed fragments — and keeps the dead
 * tree dead.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const LIVE_FRAGMENTS = [
  'coachCommandShellStyles',
  'coachCommandFoundationStyles',
  'coachCommandBridgeStyles',
  'coachCommandHeaderActionStyles',
  'coachCommandNotebookStyles',
  'coachCommandThreadHeaderStyles',
  'coachCommandDockStyles',
  'coachCommandOpsStyles',
  'coachCommandOwnerControlsStyles',
  'coachCommandOpsMissionStyles',
  'coachCommandCrystallineFocusStyles',
  'coachCommandBridgeMobileDockStyles',
  'coachCommandPresenceStyles',
] as const;

const RETIRED_FILES = [
  'CoachCommandCenter.styles.ts',
  'CoachCommandCenter.responsiveStyles.ts',
  'CoachCommandCenter.workspaceStyles.ts',
  'CoachCommandCenter.composerStyles.ts',
  'CoachCommandCenter.mobileDockStyles.ts',
] as const;

describe('CoachCommandCenter bridge split', () => {
  it('CommandBridgeShell composes every live fragment', () => {
    const bridgeSource = readCoachFile('CoachCommandCenter.bridgeStyles.ts');
    for (const fragment of LIVE_FRAGMENTS) {
      expect(bridgeSource, `bridge must compose ${fragment}`).toContain(
        `\${${fragment}}`,
      );
    }
    // the page mounts the bridge shell, not any legacy shell
    const pageSource = readCoachFile('CoachCommandCenterPage.tsx');
    expect(pageSource).toContain('<CommandBridgeShell');
    expect(pageSource).not.toContain('CommandCenterShell');
  });

  it('keeps the retired legacy shell tree dead', () => {
    for (const fileName of RETIRED_FILES) {
      expect(
        existsSync(resolve(__dirname, fileName)),
        `${fileName} was retired 2026-07-12 (rendered nowhere); do not resurrect — restyle the bridge tree`,
      ).toBe(false);
    }
    const shellSource = readCoachFile('CoachCommandCenter.shellStyles.ts');
    expect(shellSource).not.toContain('.app-shell');
  });
});
