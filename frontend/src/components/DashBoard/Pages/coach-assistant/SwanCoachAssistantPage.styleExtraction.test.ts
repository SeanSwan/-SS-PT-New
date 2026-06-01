import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SwanCoachAssistantPage style extraction', () => {
  it('keeps page-local styled components in a capped styles module with 44px controls', () => {
    const pageSource = readCoachFile('SwanCoachAssistantPage.tsx');
    const stylesSource = readCoachFile('SwanCoachAssistantPage.styles.ts');

    expect(pageSource).toContain("from './SwanCoachAssistantPage.styles'");
    expect(pageSource).not.toContain('styled.');
    expect(stylesSource).toContain('export const PageShell');
    expect(stylesSource).toContain('export const ErrorBanner');
    expect(stylesSource).toContain('export const TranscriptProcessingCard');
    expect(stylesSource).toContain('export const NeuralLinkPill');
    expect(stylesSource).toContain('export const TeachModeToggle');
    expect(stylesSource).toMatch(/export const SidebarToggle = styled\.button`[\s\S]*height:\s*44px/);
    expect(stylesSource).toMatch(/export const ErrorBannerAction = styled\.button[\s\S]*min-height:\s*44px/);
    expect(stylesSource).toMatch(/export const NeuralLinkPill = styled\.button[\s\S]*min-height:\s*44px/);
    expect(stylesSource).toMatch(/export const TeachModeToggle = styled\.button[\s\S]*height:\s*44px/);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
