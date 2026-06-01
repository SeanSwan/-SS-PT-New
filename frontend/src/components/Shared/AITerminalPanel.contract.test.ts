import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PANEL_PATH = resolve(__dirname, './AITerminalPanel.tsx');
const STYLES_PATH = resolve(__dirname, './AITerminalPanel.styles.ts');
const TYPES_PATH = resolve(__dirname, './AITerminalPanel.types.ts');

const panelSource = readFileSync(PANEL_PATH, 'utf8');
const typesSource = readFileSync(TYPES_PATH, 'utf8');
const stylesSource = readFileSync(STYLES_PATH, 'utf8');

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

  it('documents the canonical admin client hub route instead of the legacy roleless path', () => {
    expect(panelSource).toContain('/dashboard/admin/client-management');
    expect(panelSource).not.toContain('/dashboard/client-management');
  });

  it('keeps voice and error controls at the dashboard touch target minimum', () => {
    expect(stylesSource).toMatch(/export const TtsToggle[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
    expect(stylesSource).toMatch(/button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/);
  });
});
