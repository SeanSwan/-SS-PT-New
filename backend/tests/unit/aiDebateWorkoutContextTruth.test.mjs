import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_SRC = readFileSync(resolve(__dirname, '../../routes/aiDebateRoutes.mjs'), 'utf8');
const CONTEXT_SRC = readFileSync(resolve(__dirname, '../../services/ai/debate/debateClientContextService.mjs'), 'utf8');
const CORE_ROUTES_SRC = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('aiDebateRoutes workout context truth path', () => {
  it('is mounted on the canonical AI debate route', () => {
    expect(CORE_ROUTES_SRC).toContain("app.use('/api/ai/debate', aiDebateRoutes)");
  });

  it('enriches direct debate starts from workout_logs joined to workout_sessions', () => {
    expect(ROUTE_SRC).toContain('buildDebateClientContext');
    expect(CONTEXT_SRC).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(CONTEXT_SRC).toMatch(/JOIN\s+workout_logs\s+wl/i);
    expect(CONTEXT_SRC).toMatch(/wl\."sessionId"\s*=\s*ws\.id/i);
    expect(CONTEXT_SRC).toMatch(/ws\."userId"\s*=\s*:clientId/i);
    expect(CONTEXT_SRC).toMatch(/ws\.status\s*=\s*'completed'/i);
    expect(CONTEXT_SRC).toMatch(/json_agg\(json_build_object/i);
    expect(CONTEXT_SRC).toMatch(/'exerciseName',\s*wl\."exerciseName"/i);
    expect(CONTEXT_SRC).toMatch(/ORDER\s+BY\s+ws\.date\s+DESC/i);
    expect(CONTEXT_SRC).not.toMatch(/SELECT\s+exercises,\s*"createdAt"\s+FROM\s+"WorkoutSessions"/);
    expect(CONTEXT_SRC).not.toMatch(/"WorkoutSessions"/);
    expect(CONTEXT_SRC).not.toMatch(/sessionDate/);
  });
});
