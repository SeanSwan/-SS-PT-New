import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const readSourceIfPresent = (fileName: string) => {
  const filePath = resolve(__dirname, fileName);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
};

const PANEL_SOURCE = readSourceIfPresent('./SwanCoachMessagesPanel.tsx');
const STYLES_SOURCE = readSourceIfPresent('./SwanCoachAssistantPage.styles.ts');

describe('SwanCoachAssistantPage messages panel split', () => {
  it('page delegates the conversation log to SwanCoachMessagesPanel', () => {
    expect(PAGE_SOURCE).toContain("from './SwanCoachMessagesPanel'");
    expect(PAGE_SOURCE).toMatch(/<SwanCoachMessagesPanel[\s\S]*messages=\{coach\.messages\}/);
    expect(PAGE_SOURCE).not.toContain("from './CoachMessage'");
    expect(PAGE_SOURCE).not.toContain("from './ThinkingIndicator'");
    expect(PAGE_SOURCE).not.toContain("from './SuggestedPrompts'");
    expect(PAGE_SOURCE).not.toContain('safeAttachmentSourceLabel');
    expect(PAGE_SOURCE).not.toMatch(/<MessagesArea/);
    expect(PAGE_SOURCE).not.toMatch(/coach\.messages\.map/);
    expect(PAGE_SOURCE).not.toMatch(/<ErrorBanner/);
    expect(PAGE_SOURCE).not.toMatch(/<TranscriptProcessingCard/);
  });

  it('messages panel owns prompts, message cards, processing state, retry, and scroll anchor', () => {
    expect(PANEL_SOURCE).toMatch(/<MessagesArea\s+role="log"/);
    expect(PANEL_SOURCE).toMatch(/<SuggestedPrompts/);
    expect(PANEL_SOURCE).toMatch(/messages\.map/);
    expect(PANEL_SOURCE).toMatch(/<CoachMessage/);
    expect(PANEL_SOURCE).toMatch(/<ThinkingIndicator/);
    expect(PANEL_SOURCE).toMatch(/<TranscriptProcessingCard/);
    expect(PANEL_SOURCE).toMatch(/safeAttachmentSourceLabel/);
    expect(PANEL_SOURCE).toMatch(/<ErrorBanner/);
    expect(PANEL_SOURCE).toMatch(/onClick=\{\(\)\s*=>\s*\{\s*void onSend\(lastAttempt\)/);
    expect(PANEL_SOURCE).toMatch(/ref=\{messagesEndRef\}/);
  });

  it('uses explicit themed error banner action controls instead of raw nested buttons', () => {
    expect(PANEL_SOURCE).not.toMatch(/<button\b/);
    expect(PANEL_SOURCE).toContain('ErrorBannerActions');
    expect(PANEL_SOURCE).toContain('ErrorBannerAction');
    expect(STYLES_SOURCE).toMatch(/export const ErrorBannerActions = styled\.div/);
    expect(STYLES_SOURCE).toMatch(/export const ErrorBannerAction = styled\.button/);
    expect(STYLES_SOURCE).toMatch(/min-height:\s*44px/);
    expect(STYLES_SOURCE).toMatch(/&:focus-visible/);
    expect(STYLES_SOURCE).not.toMatch(/\n\s*button\s*\{/);
  });

  it('keeps both the page and extracted panel under the project file-size ceiling', () => {
    expect(PAGE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(PANEL_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
