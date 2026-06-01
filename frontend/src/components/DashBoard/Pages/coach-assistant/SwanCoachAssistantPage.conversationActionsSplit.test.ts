import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const COMPOSER_PANEL_SOURCE = readFileSync(resolve(__dirname, './SwanCoachComposerPanel.tsx'), 'utf8');
const ACTIONS_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachConversationActions.ts'),
  'utf8',
);

describe('SwanCoachAssistantPage conversation/action split', () => {
  it('page delegates sidebar, Neural Link, and draft actions to a hook', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachConversationActions/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+\[macroLinkActive,\s*setMacroLinkActive\]\s*=\s*useState\(false\)/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleSelectConversation\s*=\s*useCallback/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleNewChat\s*=\s*useCallback/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleNeuralLink\s*=\s*useCallback/);
    expect(PAGE_SOURCE).not.toMatch(/const\s+handleCreateIntakeDraft\s*=\s*useCallback/);
  });

  it('hook owns conversation reloads and macro Neural Link activation', () => {
    expect(ACTIONS_SOURCE).toMatch(/chat\.loadConversation\(id\)/);
    expect(ACTIONS_SOURCE).toMatch(/coach\.clearConversation\(\)/);
    expect(ACTIONS_SOURCE).toMatch(/chat\.listConversations\(['"]active['"],\s*true\)/);
    expect(ACTIONS_SOURCE).toMatch(/chat\.createConversation\(['"]macro_logging['"],\s*['"]Macro Context Session['"]\)/);
  });

  it('hook owns oversized draft creation and safe failure copy', () => {
    expect(ACTIONS_SOURCE).toMatch(/createCoachTextIntake\(/);
    expect(ACTIONS_SOURCE).toMatch(/trigger:\s*['"]oversized_chat['"]/);
    expect(ACTIONS_SOURCE).toMatch(/safeCoachIntakeDraftFailure\(\)/);
    expect(PAGE_SOURCE).not.toMatch(/createCoachTextIntake/);
    expect(PAGE_SOURCE).not.toMatch(/safeCoachIntakeDraftFailure/);
  });

  it('page still wires the hook outputs to the existing controls', () => {
    expect(PAGE_SOURCE).toMatch(
      /const\s+\{\s*handleCreateIntakeDraft[\s\S]*handleNeuralLink[\s\S]*handleNewChat[\s\S]*handleSelectConversation[\s\S]*macroLinkActive[\s\S]*\}\s*=\s*useSwanCoachConversationActions/,
    );
    expect(PAGE_SOURCE).toMatch(/onNewChat=\{handleNewChat\}/);
    expect(PAGE_SOURCE).toMatch(/onSelectConversation=\{handleSelectConversation\}/);
    expect(PAGE_SOURCE).toMatch(/macroLinkActive=\{macroLinkActive\}/);
    expect(PAGE_SOURCE).toMatch(/onNeuralLink=\{handleNeuralLink\}/);
    expect(PAGE_SOURCE).toMatch(/onCreateIntakeDraft=\{handleCreateIntakeDraft\}/);
    expect(COMPOSER_PANEL_SOURCE).toMatch(/\$active=\{macroLinkActive\}/);
    expect(COMPOSER_PANEL_SOURCE).toMatch(/void onNeuralLink\(\)/);
  });

  it('hook stays under the project file-size ceiling', () => {
    const lines = ACTIONS_SOURCE.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(300);
  });
});
