/**
 * aiChatCoachIntakeContextSource.test.mjs
 * =======================================
 * Source-level guard for the Coach hive-mind context bridge. The AI prompt
 * should use server-read queue state, not a browser-trusted queue snapshot.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AI_CHAT_ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../routes/aiChatRoutes.mjs'),
  'utf8',
);

describe('AI chat Coach intake context source', () => {
  it('builds Coach intake prompt context from server queue reads', () => {
    expect(AI_CHAT_ROUTES_SRC).toMatch(/listUnifiedCoachIntakeItems/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/getCoachIntakeHealth/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/getCoachIntakeRetentionReport/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/purgeCoachIntakeRawArtifacts/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/dryRun:\s*true/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/buildCoachIntakeContextFromResult/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/scope:\s*['"]actionable['"]/);
  });

  it('does not trust coachIntakeContext from req.body', () => {
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/const\s*\{\s*message,\s*foodContext,\s*coachIntakeContext\s*\}\s*=\s*req\.body/);
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/sanitizeCoachIntakeContext\(coachIntakeContext\)/);
  });
});
