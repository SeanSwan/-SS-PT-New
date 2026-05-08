/**
 * coachIntakeCommandRegistry.test.mjs
 * ===================================
 * Source-contract guard for unified Swan Coach intake command registration and
 * frontend prompt wiring. Runtime dispatcher behavior lives in focused tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const WORKSPACE_UTILS_SRC = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/coach-assistant/CoachIntakeWorkspace.utils.ts'), 'utf8',
);

describe('Unified Coach intake command registry source contract', () => {
  it('registers unified Coach intake commands and dispatchers', () => {
    expect(REGISTRY_INDEX_SRC).toMatch(/coachIntakeCommands\.mjs/);
    expect(REGISTRY_INDEX_SRC).toMatch(/registerCoachIntake/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/type:\s*'inspect_coach_audio_pieces'/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/inspect pending Coach audio pieces/);
    expect(COACH_INTAKE_COMMANDS_SRC).toMatch(/inspect Coach intake \{intakeId\} audio pieces/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewCoachIntakeQueue/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_coach_intake_queue',\s*dispatchViewCoachIntakeQueue\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['review_next_coach_intake',\s*dispatchReviewNextCoachIntake\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['inspect_coach_audio_pieces',\s*dispatchInspectCoachAudioPieces\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['inspect_plaud_audio_pieces',\s*dispatchInspectPlaudAudioPieces\]/);
  });

  it('makes the Coach workspace ask the unified intake command, not the PLAUD-only command', () => {
    expect(WORKSPACE_SRC).toMatch(/onCommandPrompt\('review next Coach intake'\)/);
    expect(WORKSPACE_SRC).toMatch(/activeAudioPrompt\(activeItem\)/);
    expect(WORKSPACE_UTILS_SRC).toMatch(/inspect Coach intake/);
    expect(WORKSPACE_SRC).not.toMatch(/onCommandPrompt\('review next PLAUD intake'\)/);
    expect(WORKSPACE_SRC).not.toMatch(/onCommandPrompt\('inspect pending PLAUD audio pieces'\)/);
  });
});
