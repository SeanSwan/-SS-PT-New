import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('WorkoutLogger shared theme bridge', () => {
  it('keeps the active dashboard logger path wired to the shared crystalline palette', () => {
    const dashboardRoutesSource = read('../DashBoard/UniversalDashboardLayout.routes.tsx');
    const enhancedLogger = read('../TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx');
    const enhancedLoggerView = read('../TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.view.tsx');
    const logger = read('WorkoutLogger.tsx');
    const loggerStyles = read('WorkoutLogger.styles.ts');
    const contextBar = read('runner/shell/zones/ContextBar.tsx');
    const footer = read('WorkoutLoggerFooter.tsx');

    expect(dashboardRoutesSource).toMatch(/path: '\/log-workout', component: EnhancedWorkoutLogger/);
    expect(dashboardRoutesSource).toMatch(/path: '\/log-workout', component: WorkoutLogger/);
    expect(enhancedLogger).toContain("import EnhancedWorkoutLoggerView from './EnhancedWorkoutLogger.view'");
    expect(enhancedLogger).toContain('<EnhancedWorkoutLoggerView');
    expect(enhancedLoggerView).toContain("import WorkoutLogger from '../../WorkoutLogger/WorkoutLogger'");
    expect(enhancedLoggerView).toContain('<WorkoutLogger');
    expect(logger).toContain('<ContextBar');
    expect(logger).toContain('<WorkoutLoggerFooter');
    expect(logger).toContain('<WorkoutLoggerConfirmDialog');
    expect(loggerStyles).toContain("from './WorkoutLoggerCS'");
    expect(contextBar).toMatch(/var\(--/);
    expect(footer).toContain("from './WorkoutLoggerCS'");
  });

  it('routes shared logger color primitives through dashboard theme variables', () => {
    const source = read('WorkoutLoggerCS.ts');

    expect(source).toContain("'var(--bg-elevated, #141419)'");
    expect(source).toContain("'var(--bg-surface, #1A1A24)'");
    expect(source).toContain("'var(--accent-gold, #C6A84B)'");
    expect(source).toContain("'var(--accent-primary, #60C0F0)'");
    expect(source).toContain("'var(--accent-secondary, #8B5CF6)'");
    expect(source).toContain("'var(--text-primary, #E0ECF4)'");
    expect(source).toContain("'var(--success, #10b981)'");
    expect(source).toContain("'var(--warning, #f59e0b)'");
    expect(source).toContain("'var(--danger, #ef4444)'");
    expect(source).toContain("withAlpha('var(--warning, #f59e0b)', 0.12)");

    expect(source).not.toMatch(/bg:\s*'#141419'/);
    expect(source).not.toMatch(/surface:\s*'#1A1A24'/);
    expect(source).not.toMatch(/gaming:\s*'#60C0F0'/);
    expect(source).not.toMatch(/secondary:\s*'#8B5CF6'/);
    expect(source).not.toMatch(/text:\s*'#E0ECF4'/);
    expect(source).not.toMatch(/warningBg:\s*withAlpha\('#f59e0b'/);
  });

  it('supports alpha overlays for CSS theme variables instead of assuming hex only', () => {
    const source = read('WorkoutLoggerCS.ts');

    expect(source).toContain("color.startsWith('var(')");
    expect(source).toContain('color-mix(in srgb, ${color}');
    expect(source).toContain('clampOpacity');
  });
});
