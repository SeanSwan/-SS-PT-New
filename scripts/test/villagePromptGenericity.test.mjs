/**
 * Regression guard — AI Village prompt genericity.
 * =================================================
 * Incident 2026-06-21: the validation-orchestrator's planning-mode AND document-mode
 * prompts were hardcoded to PAST tasks ("Coach Assistant" chat upgrade / a specific
 * "vision-alignment QA report" with baked-in scores). Result: the Village designed/
 * reviewed the WRONG surface regardless of the plan/document it was actually given —
 * e.g. it produced a chat-UI spec for a video-library brief.
 *
 * Fix: every prompt must DERIVE feature-specific detail from the document under review,
 * and project/brand context lives only in the env-overridable getProjectContext().
 *
 * This test is a static-source guard (no import side effects): it asserts the
 * task-specific hardcoding cannot creep back, and the genericity invariants hold.
 *
 * Run: node --test scripts/test/villagePromptGenericity.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = readFileSync(resolve(ROOT, 'scripts', 'validation-orchestrator.mjs'), 'utf-8');

// Task-specific strings that previously hardcoded the Village to a single feature.
// If any reappears, a prompt has been re-hardcoded — fix the prompt, not this list.
const BANNED = [
  'useCoachAssistant',
  'useConversationSidebar',
  'Conversation Sidebar',
  'Coach Assistant upgrade',
  'Markdown Renderer —',
  'Voice Recording Overlay —',
  '/api/ai-chat/conversations',
  'DictationOrb',
  '6/10 PARTIAL',
  '0 posts vs 8 posts',
  '840+ exercises aren',
  'SwanCoachStyles',
];

test('orchestrator prompts contain NO task-specific hardcoding', () => {
  const leaked = BANNED.filter((s) => SRC.includes(s));
  assert.deepEqual(leaked, [], `Task-specific hardcoding leaked back into Village prompts: ${leaked.join(', ')}`);
});

test('planning + document prompts still inject the content under review', () => {
  assert.ok(SRC.includes('${planContent}'), 'planContent injection missing from planning prompts');
  assert.ok(SRC.includes('${documentContent}'), 'documentContent injection missing from document prompts');
});

test('project/brand context is portable (env-overridable, single source)', () => {
  assert.ok(SRC.includes('function getProjectContext'), 'getProjectContext() helper missing');
  assert.ok(SRC.includes('SWAN_VILLAGE_PROJECT_CONTEXT'), 'SWAN_VILLAGE_PROJECT_CONTEXT env override missing');
  assert.ok(SRC.includes('SWAN_VILLAGE_PROJECT_CONTEXT_FILE'), 'SWAN_VILLAGE_PROJECT_CONTEXT_FILE env override missing');
});

test('prompts instruct deriving specifics from the document (not assuming a feature)', () => {
  const deriveCount = (SRC.match(/DERIVE |[Dd]erive (the|its|what|every|the list)/g) || []).length;
  assert.ok(deriveCount >= 6, `Expected >=6 "derive from the plan/document" instructions across prompts, found ${deriveCount}`);
});
