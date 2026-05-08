/**
 * coachIntakeCommandRegistry.test.mjs
 * ===================================
 * Source-contract guard for unified Swan Coach intake command registration and
 * frontend prompt wiring. Runtime dispatcher behavior lives in focused tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCommand, initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';
import { classifyIntent } from '../../services/ai/intentClassifier.mjs';

vi.mock('../../services/aiChatService.mjs', () => ({
  sendChatMessage: vi.fn(() => {
    throw new Error('AI classifier should not run for deterministic Coach intake scope prompts');
  }),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REGISTRY_INDEX_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandRegistry/index.mjs'), 'utf8',
);
const DISPATCHER_INDEX_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandDispatcher.mjs'), 'utf8',
);
const COACH_INTAKE_COMMANDS_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandRegistry/coachIntakeCommands.mjs'), 'utf8',
);
const WORKSPACE_SRC = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/coach-assistant/CoachIntakeWorkspace.tsx'), 'utf8',
);
const WORKSPACE_HEADER_SRC = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/coach-assistant/CoachIntakeWorkspaceHeader.tsx'), 'utf8',
);
const WORKSPACE_UTILS_SRC = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/coach-assistant/CoachIntakeWorkspace.utils.ts'), 'utf8',
);

describe('Unified Coach intake command registry source contract', () => {
  it('registers unified Coach intake commands and dispatchers', () => {
    expect(REGISTRY_INDEX_SRC).toMatch(/coachIntakeCommands\.mjs/);
    expect(REGISTRY_INDEX_SRC).toMatch(/registerCoachIntake/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/type:\s*'view_coach_intake_health'/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/show Coach intake health/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/type:\s*'view_coach_intake_retention'/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/show Coach intake retention/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/type:\s*'view_coach_intake_retention_purge_plan'/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/show Coach intake cleanup plan/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/type:\s*'view_coach_intake_prepared_draft'/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/show Coach prepared draft/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/type:\s*'inspect_coach_audio_pieces'/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/inspect pending Coach audio pieces/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/inspect Coach intake \{intakeId\} audio pieces/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewCoachIntakeHealth/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_coach_intake_health',\s*dispatchViewCoachIntakeHealth\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewCoachIntakeRetention/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_coach_intake_retention',\s*dispatchViewCoachIntakeRetention\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewCoachIntakeRetentionPurgePlan/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_coach_intake_retention_purge_plan',\s*dispatchViewCoachIntakeRetentionPurgePlan\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewCoachIntakePreparedDraft/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_coach_intake_prepared_draft',\s*dispatchViewCoachIntakePreparedDraft\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewCoachIntakeQueue/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_coach_intake_queue',\s*dispatchViewCoachIntakeQueue\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['review_next_coach_intake',\s*dispatchReviewNextCoachIntake\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['inspect_coach_audio_pieces',\s*dispatchInspectCoachAudioPieces\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['inspect_plaud_audio_pieces',\s*dispatchInspectPlaudAudioPieces\]/);
  });

  it('makes the Coach workspace ask the unified intake command, not the PLAUD-only command', () => {
    expect(WORKSPACE_HEADER_SRC).toMatch(/onCommandPrompt\('review next Coach intake'\)/);
    expect(WORKSPACE_SRC).toMatch(/activeAudioPrompt\(activeItem\)/);
    expect(WORKSPACE_UTILS_SRC).toMatch(/inspect Coach intake/);
    expect(WORKSPACE_SRC).not.toMatch(/onCommandPrompt\('review next PLAUD intake'\)/);
    expect(WORKSPACE_HEADER_SRC).not.toMatch(/onCommandPrompt\('review next PLAUD intake'\)/);
    expect(WORKSPACE_SRC).not.toMatch(/onCommandPrompt\('inspect pending PLAUD audio pieces'\)/);
    expect(WORKSPACE_HEADER_SRC).not.toMatch(/onCommandPrompt\('inspect pending PLAUD audio pieces'\)/);
  });

  it('allows explicit clarification and duplicate-hold scopes through command validation', () => {
    initializeRegistry();
    const queueCommand = getCommand('view_coach_intake_queue');
    const reviewNextCommand = getCommand('review_next_coach_intake');

    expect(queueCommand?.inputSchema.safeParse({ scope: 'needs_clarification', limit: 10 }).success).toBe(true);
    expect(queueCommand?.inputSchema.safeParse({ scope: 'duplicate_hold', limit: 10 }).success).toBe(true);
    expect(reviewNextCommand?.inputSchema.safeParse({ scope: 'needs_clarification', limit: 20 }).success).toBe(true);
    expect(reviewNextCommand?.inputSchema.safeParse({ scope: 'duplicate_hold', limit: 20 }).success).toBe(true);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/show Coach intake clarification holds/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/show Coach intake duplicate holds/);
  });

  it('classifies explicit clarification and duplicate-hold queue prompts without the cloud classifier', async () => {
    await expect(classifyIntent('show Coach intake clarification holds', 'admin')).resolves.toMatchObject({
      intent: 'view_coach_intake_queue',
      params: { scope: 'needs_clarification' },
      confidence: 1,
    });
    await expect(classifyIntent('show Coach intake duplicate holds', 'trainer')).resolves.toMatchObject({
      intent: 'view_coach_intake_queue',
      params: { scope: 'duplicate_hold' },
      confidence: 1,
    });
  });
});
