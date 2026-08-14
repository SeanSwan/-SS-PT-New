/**
 * ============================================================================
 * FILE: workoutCoachContext.test.ts
 * PURPOSE: Prove the Logger Coach opens a context the caller's role is actually
 *          granted — checked against the SERVER's allowlist, not a copy of it.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S3 · F3)
 * ============================================================================
 *
 * THE DEFECT
 * WorkoutLoggerCoachTerminal hardcoded `context="workout_generation"` and
 * rendered with `defaultOpen`. `/log-workout` is in the CLIENT route group, and
 * aiChatRoutes.mjs ROLE_CONTEXTS does not grant clients `workout_generation`.
 * Every client who opened the Logger got a deterministic 403 from a panel that
 * opened itself.
 *
 * WHY THIS TEST READS THE BACKEND FILE
 * Restating the allowlist here would create a second copy that can drift from
 * the gate it claims to mirror — the same duplication that produced F7. The
 * allowlist is parsed out of the server source, so if someone narrows the
 * client's contexts server-side, this fails instead of the client.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveWorkoutCoachContext, WORKOUT_COACH_CONTEXT } from './workoutCoachContext';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const aiChatSource = readFileSync(
  path.join(repoRoot, 'backend/routes/aiChatRoutes.mjs'),
  'utf8',
);

/** Pull one role's allowed contexts straight out of the server's ROLE_CONTEXTS. */
const serverContextsFor = (role: string): string[] => {
  const line = new RegExp(`^\\s*${role}:\\s*\\[([^\\]]*)\\]`, 'm').exec(aiChatSource);
  if (!line) throw new Error(`ROLE_CONTEXTS.${role} not found in aiChatRoutes.mjs`);
  return [...line[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

/** Pull a capability set (e.g. AI_CHAT_EQUIPMENT_CONTEXTS) out of the server source. */
const capabilitySet = (name: string): string[] => {
  const block = new RegExp(`${name}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`).exec(aiChatSource);
  if (!block) throw new Error(`${name} not found in aiChatRoutes.mjs`);
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

describe('Logger Coach context vs the server allowlist (F3)', () => {
  it('proves the ORIGINAL hardcoded context was forbidden to clients', () => {
    // The bug, stated as a fact about the server rather than as a story.
    expect(serverContextsFor('client')).not.toContain('workout_generation');
  });

  it.each(['client', 'user', undefined, null, '', 'CLIENT'])(
    'gives %s a context the server actually grants clients',
    (role) => {
      const chosen = resolveWorkoutCoachContext(role as string | null | undefined);

      expect(serverContextsFor('client')).toContain(chosen);
    },
  );

  it.each(['trainer', 'admin', 'Trainer', 'ADMIN'])(
    'keeps the richer generation context for %s',
    (role) => {
      const chosen = resolveWorkoutCoachContext(role);

      expect(chosen).toBe(WORKOUT_COACH_CONTEXT.GENERATION);
      expect(serverContextsFor(role.toLowerCase())).toContain(chosen);
    },
  );

  it('keeps the equipment capability the Logger needs for safe swaps', () => {
    expect(capabilitySet('AI_CHAT_EQUIPMENT_CONTEXTS')).toContain(
      resolveWorkoutCoachContext('client'),
    );
  });

  it("keeps the workout-date capability the Logger needs for today's session", () => {
    expect(capabilitySet('AI_CHAT_WORKOUT_DATE_CONTEXTS')).toContain(
      resolveWorkoutCoachContext('client'),
    );
  });

  it.each(['AI_CHAT_SCHEDULE_CONTEXTS', 'AI_CHAT_COVERAGE_CONTEXTS'])(
    'does NOT hand a client the trainer-only %s capability',
    (setName) => {
      // The lazy fix for the 403 is `coach_assistant`, which clients may open —
      // but it carries scheduling AND client-coverage scope the Logger never
      // needs. Making a 403 disappear by widening privilege is the failure mode
      // the V3 contract names explicitly.
      expect(capabilitySet(setName)).not.toContain(resolveWorkoutCoachContext('client'));
    },
  );
});
