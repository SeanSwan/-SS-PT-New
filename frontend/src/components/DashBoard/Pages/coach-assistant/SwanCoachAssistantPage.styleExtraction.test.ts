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

  it('keeps the mobile coach page clear of fixed dashboard controls', () => {
    const pageStyles = readCoachFile('SwanCoachAssistantPage.styles.ts');
    const inputStyles = readCoachFile('styles/CoachInputStyles.ts');
    const inputWrapStyles = readCoachFile('CoachInputBar.styles.ts');
    const messageStyles = readCoachFile('styles/CoachMessageStyles.ts');
    const inputBarSource = readCoachFile('CoachInputBar.tsx');
    const hookSource = readCoachFile('hooks/useCoachAssistant.ts');

    expect(pageStyles).toContain('@media (max-width: 1024px)');
    expect(pageStyles).toContain('--coach-dashboard-chrome-offset');
    expect(pageStyles).toContain('height: min(100%, calc(100dvh - var(--coach-dashboard-chrome-offset)));');
    expect(pageStyles).toContain('max-height: calc(100dvh - var(--coach-dashboard-chrome-offset));');
    expect(pageStyles).toContain('@media (max-width: 430px)');
    expect(pageStyles).toContain('@media (max-width: 375px)');
    expect(pageStyles).not.toContain('height: calc(100dvh - 188px);');
    expect(pageStyles).not.toContain('height: calc(100dvh - 180px);');
    expect(pageStyles).not.toContain('height: calc(100dvh - 172px);');
    expect(pageStyles).not.toContain('padding-top: 68px;');
    expect(inputStyles).not.toContain('grid-template-columns: 44px 44px minmax(0, 1fr) 56px 48px;');
    expect(inputStyles).toContain('grid-template-columns: repeat(4, minmax(44px, 1fr));');
    expect(inputWrapStyles).toContain('grid-column: 1 / -1;');
    expect(inputWrapStyles).toContain('order: -1;');
    expect(messageStyles).toContain('@media (max-width: 520px)');
    expect(messageStyles).toContain('font-size: 14px;');
    expect(messageStyles).toContain('max-width: 100%;');
    expect(inputBarSource).toContain("placeholder={listening ? 'Listening...' : 'Ask Swan Coach...'}");
    expect(hookSource).toContain("messages.length === 1 && messages[0]?.id === 'welcome'");
  });
});
