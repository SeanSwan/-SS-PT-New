import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('CoachCommandCenter theme bridge', () => {
  it('uses CSS variable fallback tokens for queue metric accents', () => {
    const logicSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.logic.ts'), 'utf8');

    expect(logicSource).not.toMatch(/accent:\s*'#[0-9a-fA-F]{3,8}'/);
    expect(logicSource).toContain("accent: 'var(--accent-primary, #60c0f0)'");
    expect(logicSource).toContain("accent: 'var(--success, #47e89a)'");
    expect(logicSource).toContain("accent: 'var(--accent-gold, #c6a84b)'");
    expect(logicSource).toContain("accent: 'var(--error, #ff6d85)'");
  });

  it('keeps Crystalline Focus wired to the universal header theme variables', () => {
    const shellSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.shellStyles.ts'), 'utf8');
    const bridgeSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.bridgeStyles.ts'), 'utf8');
    const focusSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.crystallineFocusStyles.ts'), 'utf8');
    const mobileDockSource = readFileSync(resolve(__dirname, 'CoachCommandCenter.bridgeMobileDockStyles.ts'), 'utf8');
    const headerActionsSource = readFileSync(resolve(__dirname, '../../../Header/components/ActionIcons.tsx'), 'utf8');
    const themeUtilsSource = readFileSync(resolve(__dirname, '../../../../utils/theme/themeUtils.ts'), 'utf8');

    expect(headerActionsSource).toContain("import UniversalThemeToggle from '../../../context/ThemeContext/UniversalThemeToggle'");
    expect(headerActionsSource).toContain('<UniversalThemeToggle size="medium" />');
    expect(themeUtilsSource).toContain('export const injectThemeVariables = (themeId: ThemeId): void => {');
    expect(themeUtilsSource).toContain('--bg-base: ${theme.background.primary};');
    expect(themeUtilsSource).toContain('--accent-primary: ${theme.colors.primary};');
    expect(themeUtilsSource).toContain('--accent-sapphire: ${theme.colors.primaryDeep || theme.colors.primary};');
    expect(shellSource).toContain('--coach-sapphire: var(--brand-primary, var(--accent-secondary, #4070c0));');
    expect(bridgeSource).not.toContain('--coach-sapphire: var(--accent-sapphire, #002060);');
    expect(focusSource).toContain('--coach-focus-canvas: var(--bg-base, #070b12);');
    expect(focusSource).toContain('--coach-focus-surface: var(--bg-surface, #0b111a);');
    expect(focusSource).toContain('--coach-focus-elevated: var(--bg-elevated, #0e1723);');
    expect(focusSource).toContain('--coach-focus-text: var(--text-primary, #f4f7fb);');
    expect(focusSource).toContain('--coach-focus-accent: var(--accent-primary, #69d7d0);');
    expect(focusSource).toContain('--coach-focus-blue: var(--brand-primary, var(--accent-secondary, #7ea5ff));');
    expect(mobileDockSource).toContain('grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));');
    expect(mobileDockSource).toContain('.tab-button {');
    expect(mobileDockSource).toContain('min-width: 0;');
    expect(focusSource).not.toContain('--coach-crystalline-');
  });
});
