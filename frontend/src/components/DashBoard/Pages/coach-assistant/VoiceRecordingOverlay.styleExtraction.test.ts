import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'VoiceRecordingOverlay.tsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, 'VoiceRecordingOverlay.styles.ts'), 'utf8');

describe('VoiceRecordingOverlay style extraction', () => {
  it('keeps the voice overlay component focused on recording orchestration', () => {
    expect(componentSource).toContain("from './VoiceRecordingOverlay.styles'");
    expect(componentSource).not.toContain('styled.button');
    expect(componentSource).not.toContain('styled.div`');
    expect(componentSource).not.toContain('keyframes`');
  });

  it('exports the full overlay visual contract from a dedicated style module', () => {
    [
      'Overlay',
      'OrbContainer',
      'RecordingOrb',
      'PulseRing',
      'DurationText',
      'StatusText',
      'ButtonRow',
      'ActionBtn',
      'SpinIcon',
    ].forEach((exportName) => {
      expect(stylesSource).toContain(`export const ${exportName}`);
    });
  });

  it('keeps the microphone overlay accessible and theme-tokened', () => {
    expect(stylesSource).toContain('min-height: 48px');
    expect(stylesSource).toContain('width: 80px');
    expect(stylesSource).toContain('height: 80px');
    expect(stylesSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stylesSource).toContain('var(--accent-primary, #60C0F0)');
    expect(stylesSource).toContain('var(--accent-secondary, #8B5CF6)');
  });
});
