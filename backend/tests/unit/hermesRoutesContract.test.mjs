import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/hermesRoutes.mjs'), 'utf8');
const modelSource = readFileSync(resolve(process.cwd(), 'models/HermesTask.mjs'), 'utf8');
const migrationSource = readFileSync(
  resolve(process.cwd(), 'migrations/20260701010000-create-hermes-tasks.cjs'),
  'utf8',
);

describe('Hermes route and persistence contract', () => {
  it('exposes a sanitized self-scoped coach review CTA endpoint', () => {
    expect(routeSource).toContain("router.post('/coach-review-requests', protect, coachReviewRequestLimiter, async");
    expect(routeSource).toContain('rateLimit({');
    expect(routeSource).toContain("'transcript'");
    expect(routeSource).toContain("'rawTranscript'");
    expect(routeSource).toContain("'injuryNotes'");
    expect(routeSource).toContain("'clientName'");
    expect(routeSource).toContain("'message'");
    expect(routeSource).toContain('cleanReference(req.body?.sourceId)');
    expect(routeSource).toContain("agentType: 'coach'");
    expect(routeSource).toContain('coach_review_request: ${reasonLabel}');
    expect(routeSource).toContain("requestType: 'coach_review_request'");
    expect(routeSource).toContain('selfScoped: true');
  });

  it('lets the operator close the fulfillment loop without exposing task bodies in the list view', () => {
    expect(routeSource).toContain("router.post('/tasks/:id/complete'");
    expect(routeSource).toContain('completeTask(req.params.id');
    expect(routeSource).toContain('completedBy: task.completedBy ?? null');
    expect(routeSource).toContain('completedAt: task.completedAt ?? null');
    expect(routeSource).not.toContain('taskDescription: task.taskDescription');
  });

  it('persists Hermes tasks in the database instead of process memory', () => {
    expect(modelSource).toContain("tableName: 'hermes_tasks'");
    expect(modelSource).toContain("field: 'requested_by'");
    expect(modelSource).toContain("field: 'completed_by'");
    expect(modelSource).toContain("field: 'completed_at'");
    expect(modelSource).toContain('metadata: {');
    expect(migrationSource).toContain('createTable(TABLE_NAME');
    expect(migrationSource).toContain('requested_by');
    expect(migrationSource).toContain('completed_by');
    expect(migrationSource).toContain('completed_at');
    expect(migrationSource).toContain("['agent_type', 'status']");
  });
});
