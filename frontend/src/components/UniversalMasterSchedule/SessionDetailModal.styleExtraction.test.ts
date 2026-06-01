import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailModal style extraction', () => {
  it('keeps the canonical session detail modal focused on session behavior', () => {
    const source = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const cancelWarningPanelSource = read('SessionDetailClientCancelWarningPanel.tsx');
    const cancelPanelSource = read('SessionDetailCancelOptionsPanel.tsx');
    const infoGridSource = read('SessionDetailInfoGrid.tsx');

    expect(source).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailModal.baseStyles'");
    expect(source).not.toContain("from './SessionDetailModal.feedbackStyles'");
    expect(infoGridSource).toContain("from './SessionDetailModal.feedbackStyles'");
    expect(cancelWarningPanelSource).toContain("from './SessionDetailModal.lateCancelStyles'");
    expect(cancelPanelSource).toContain("from './SessionDetailModal.chargeStyles'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toMatch(/const SpacedErrorText\s*=\s*styled/);
    expect(source).not.toMatch(/const LateCancelWarningPanel\s*=\s*styled/);
    expect(source).not.toMatch(/const ChargeTypeGrid\s*=\s*styled/);
    expect(source).not.toMatch(/const ClientFeedbackPanel\s*=\s*styled/);
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });

  it('keeps extracted session detail style modules below the project file cap', () => {
    [
      'SessionDetailModal.baseStyles.ts',
      'SessionDetailModal.lateCancelStyles.ts',
      'SessionDetailModal.chargeStyles.ts',
      'SessionDetailModal.feedbackStyles.ts',
    ].forEach((fileName) => {
      const source = read(fileName);
      expect(source).toContain('export const ');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
