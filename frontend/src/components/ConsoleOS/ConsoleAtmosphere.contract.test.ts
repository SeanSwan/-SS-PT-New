/**
 * Aurora Console contract pins (v2 redesign, direction 3):
 * 1. FAIL-CLOSED — the atmosphere is display:none unless the aurora-console
 *    lens is committed on <html>; other lenses/default render unchanged.
 * 2. THEME-DRIVEN — every --console-* token composes from THEME variables
 *    (theme changer recolors the skin; no raw hex without a var() wrapper).
 * 3. STATE-REACTIVE — presence-as-weather keys off data-voice-state (and the
 *    generic data-console-state for future consoles), with reduced-motion.
 * 4. The Coach Command Center consumes the contract: token bridge in the
 *    shell + a lens-scoped de-box pass + the mounted atmosphere.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const atmosphere = read('./ConsoleAtmosphere.tsx');
const lensCss = read('../../adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts');
const shellStyles = read('../DashBoard/Pages/coach-assistant/CoachCommandCenter.shellStyles.ts');
const auroraStyles = read('../DashBoard/Pages/coach-assistant/CoachCommandCenter.auroraConsoleStyles.ts');
const page = read('../DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx');

describe('Aurora Console skin contract', () => {
  it('atmosphere is fail-closed behind the aurora-console lens attribute', () => {
    expect(atmosphere).toContain('display: none');
    expect(atmosphere).toMatch(/html\[data-style-lens='aurora-console'\] & \{\s*display: block/);
    expect(atmosphere).toContain('pointer-events: none');
    expect(atmosphere).toMatch(/prefers-reduced-motion: reduce/);
  });

  it('atmosphere reacts to both voice and generic console state hooks', () => {
    for (const state of ['idle', 'listening', 'thinking', 'speaking']) {
      expect(atmosphere).toContain(`[data-voice-state='${state}'] &`);
      expect(atmosphere).toContain(`[data-console-state='${state}'] &`);
    }
  });

  it('lens defines the reusable --console-* family composed from theme variables', () => {
    const block = lensCss.split("[data-style-lens='aurora-console']")[1]?.split('}')[0] ?? '';
    for (const token of [
      '--console-surface', '--console-surface-strong', '--console-line', '--console-line-strong',
      '--console-glow', '--console-atmosphere-a', '--console-atmosphere-b',
      '--console-state-idle', '--console-state-listening', '--console-state-thinking', '--console-state-speaking',
    ]) {
      expect(block).toContain(token);
    }
    // Theme-changer compatibility: state + surface tokens derive from theme vars.
    expect(block).toContain('var(--accent-primary');
    expect(block).toContain('var(--accent-secondary');
    expect(block).toContain('var(--bg-elevated');
    expect(block).toContain('var(--accent-gold');
  });

  it('the Coach Command Center consumes the contract fail-closed', () => {
    // Token bridge: console tokens first, previous theme fallbacks preserved.
    expect(shellStyles).toContain('--coach-surface: var(--console-surface, var(--bg-surface');
    expect(shellStyles).toContain('--coach-line: var(--console-line, var(--border-subtle');
    // De-box pass exists ONLY under the lens scope.
    expect(auroraStyles).toContain("html[data-style-lens='aurora-console'] &");
    // Atmosphere mounted inside the state-bearing shell.
    expect(page).toContain('<ConsoleAtmosphere />');
    expect(page).toContain('data-voice-state={resolveCoachPresenceState(commandCenter)}');
  });
});
