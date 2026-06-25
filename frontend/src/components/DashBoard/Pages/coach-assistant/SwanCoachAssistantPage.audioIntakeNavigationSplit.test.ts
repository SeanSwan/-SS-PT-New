import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const MESSAGES_PANEL_SOURCE = readFileSync(resolve(__dirname, './SwanCoachMessagesPanel.tsx'), 'utf8');
const NAVIGATION_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachAudioIntakeNavigation.ts'),
  'utf8',
);

describe('SwanCoachAssistantPage audio-intake navigation split', () => {
  it('page delegates Review next intake command and pending state to a hook', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachAudioIntakeNavigation/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+navigate\s*=\s*useNavigate\(\)/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+audioReviewNextPendingRef\s*=\s*React\.useRef\(false\)/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleAudioIntakeReviewNext\s*=\s*useCallback/);
  });

  it('hook owns queue refresh, direct review navigation, and command fallback', () => {
    expect(NAVIGATION_SOURCE).toMatch(/useNavigate/);
    expect(NAVIGATION_SOURCE).toMatch(/pickNextItem/);
    expect(NAVIGATION_SOURCE).toMatch(/queueScopedHref/);
    expect(NAVIGATION_SOURCE).toMatch(/itemReviewHref/);
    expect(NAVIGATION_SOURCE).toMatch(/refreshCoachIntakeQueue\(\)/);
    expect(NAVIGATION_SOURCE).toMatch(/handleIntakeCommand\(['"]review next coach intake['"]\)/);
  });

  it('page wires real review navigation while keeping prompt shortcuts out of intake workspace', () => {
    expect(PAGE_SOURCE).toMatch(
      /const\s+\{\s*audioReviewNextPending[\s\S]*handleAudioIntakeReviewNext[\s\S]*\}\s*=\s*useSwanCoachAudioIntakeNavigation/,
    );
    expect(PAGE_SOURCE).not.toMatch(/handleIntakeCommand[\s\S]*=\s*useSwanCoachAudioIntakeNavigation/);
    expect(PAGE_SOURCE).not.toMatch(/onCommandPrompt=\{handleIntakeCommand\}/);
    expect(PAGE_SOURCE).toMatch(/onAudioIntakeReviewNext=\{handleAudioIntakeReviewNext\}/);
    expect(PAGE_SOURCE).toMatch(/audioReviewNextPending=\{audioReviewNextPending\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/audioIntakeReviewNextPending=\{audioReviewNextPending\}/);
  });

  it('hook stays under the project file-size ceiling', () => {
    const lines = NAVIGATION_SOURCE.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(300);
  });
});
