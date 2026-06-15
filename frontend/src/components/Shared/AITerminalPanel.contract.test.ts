import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PANEL_PATH = resolve(__dirname, './AITerminalPanel.tsx');
const STYLES_PATH = resolve(__dirname, './AITerminalPanel.styles.ts');
const TYPES_PATH = resolve(__dirname, './AITerminalPanel.types.ts');
const WORKOUT_LOGGER_COACH_ROUTE_PATH = resolve(__dirname, '../WorkoutLogger/workoutLoggerCoachRoute.ts');

const panelSource = readFileSync(PANEL_PATH, 'utf8');
const typesSource = readFileSync(TYPES_PATH, 'utf8');
const stylesSource = readFileSync(STYLES_PATH, 'utf8');
const workoutLoggerCoachRouteSource = readFileSync(WORKOUT_LOGGER_COACH_ROUTE_PATH, 'utf8');

describe('AITerminalPanel contract', () => {
  it('keeps the active Swan Coach terminal below the component line cap by extracting styles', () => {
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(existsSync(STYLES_PATH)).toBe(true);
    expect(panelSource).toContain("from './AITerminalPanel.styles'");
    expect(panelSource).toContain("from './AITerminalPanel.types'");
    expect(panelSource).not.toContain('const PanelWrapper = styled.');
  });

  it('accepts every dashboard context used by mounted workspace consumers', () => {
    for (const context of [
      'coach_assistant',
      'general',
      'macro_logging',
      'form_tips',
      'workout_suggestions',
      'workout_generation',
      'client_review',
      'data_management',
      'scheduling',
      'progress_analysis',
      'exercise_library',
      'gamification',
      'client_onboarding',
    ]) {
      expect(typesSource).toContain(`'${context}'`);
    }
  });

  it('keeps canonical admin client hub routing in the workout logger route builder', () => {
    expect(panelSource).not.toContain('/dashboard/admin/client-management');
    expect(panelSource).not.toContain('/dashboard/client-management');
    expect(workoutLoggerCoachRouteSource).toContain('/dashboard/admin/client-management');
    expect(workoutLoggerCoachRouteSource).not.toContain('/dashboard/client-management');
  });

  it('keeps voice and error controls at the dashboard touch target minimum', () => {
    expect(stylesSource).toMatch(/export const TtsToggle[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
    expect(stylesSource).toMatch(/button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/);
  });

  it('keeps terminal input controls mobile-wrapping and token-backed', () => {
    expect(stylesSource).toMatch(/export const InputArea[\s\S]*?@media \(max-width:\s*430px\)[\s\S]*?flex-wrap:\s*wrap;/);
    expect(stylesSource).toMatch(/export const ChatInput[\s\S]*?min-width:\s*min\(100%,\s*14rem\);/);
    expect(stylesSource).toMatch(/export const SendButton[\s\S]*?background:\s*linear-gradient\([^`]*var\(--ai-terminal-send-bg-a/);
    expect(stylesSource).toMatch(/export const PanelHeader[\s\S]*?color:\s*var\(--ai-terminal-header-text,/);
  });
});
