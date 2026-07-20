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
const lensCss = read('../../adapters/style-lens-swan/styles/lensCoreStyles.ts');
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

  it('re-anchors the state layer to the dock on phone, where the operator looks', () => {
    // Measured at 414px: the top-anchored sheet moved only 1.6% of pixels on a
    // state change and 0% below the fold — the aurora was offscreen exactly
    // where the mic and composer are. Desktop (1440/2560) reads well and must
    // keep the top anchor, so this is a phone-tier override only.
    const phoneTier = atmosphere.split('@media (max-width: 768px)')[1] ?? '';
    expect(phoneTier, 'phone tier must exist').not.toBe('');
    expect(phoneTier).toMatch(/top: auto/);
    expect(phoneTier).toMatch(/bottom: -?\d/);
    // The desktop anchor stays put.
    expect(atmosphere).toContain('top: -28%');
  });

  it('every ACTIVE state tints the dock edge — the legible phone state channel', () => {
    // The presence line already covers listening/thinking/speaking. The dock
    // edge once covered only listening/thinking, so `speaking` — the state
    // where the operator stares at the dock awaiting the reply — read as idle.
    for (const state of ['listening', 'thinking', 'speaking']) {
      expect(
        auroraStyles,
        `dock edge must carry the ${state} state`,
      ).toContain(`&[data-voice-state='${state}'] .dock-form`);
    }
    // idle stays untinted on purpose: neutral IS the resting state.
    expect(auroraStyles).not.toContain("&[data-voice-state='idle'] .dock-form");
  });

  it('scopes the --console-* family to declared console roots (no context collapse)', () => {
    // The lens is GLOBAL but this skin is console-SPECIFIC. Defining --console-*
    // on <html> inherits them into every element, so a future non-console
    // surface consuming them would silently wear console chrome the moment an
    // operator picked this lens. Scoping to [data-console-root] means a
    // non-console consumer resolves to nothing and falls back via the bridge.
    expect(lensCss).toContain("html[data-style-lens='aurora-console'] [data-console-root]");
    // The console tokens must live in the SCOPED block, never the global one.
    const globalBlock = lensCss.split("[data-style-lens='aurora-console'] {")[1]?.split('}')[0] ?? '';
    expect(globalBlock, 'global lens block must not leak --console-* to every element').not.toContain('--console-');
    // A console opts in with one attribute — that is the whole adoption cost.
    expect(page).toContain('data-console-root');
  });

  it('lens defines the reusable --console-* family composed from theme variables', () => {
    const block = lensCss.split("html[data-style-lens='aurora-console'] [data-console-root]")[1]?.split('}')[0] ?? '';
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
