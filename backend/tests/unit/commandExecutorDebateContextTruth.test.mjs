import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMMAND_EXECUTOR_SRC = readFileSync(resolve(__dirname, '../../services/ai/commandExecutor.mjs'), 'utf8');

describe('commandExecutor debate context truth path', () => {
  it('routes Coach-command debate starts through the shared enriched debate client context builder', () => {
    expect(COMMAND_EXECUTOR_SRC).toContain("import { buildDebateClientContext } from './debate/debateClientContextService.mjs'");
    expect(COMMAND_EXECUTOR_SRC).toMatch(/await\s+buildDebateClientContext\(/);
    expect(COMMAND_EXECUTOR_SRC).not.toMatch(/deIdentifyClient\(\s*\{ id: clientId,[\s\S]{0,160}\{\}\s*\/\/ Enrichment happens inside the debate route/);
  });
});
