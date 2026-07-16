/**
 * ============================================================================
 * FILE: commandContextEnvelope.test.mjs
 * PURPOSE: Lock the server-derived surface/entity/capability envelope.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15 (Fable final plan, Slice 2)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves that authenticated server facts, not client
 * claims, decide surface capabilities and plan access.
 * HOW IT FITS IN THE APP: AI command route -> context envelope -> shared brain.
 * KEY DECISIONS: Missing, unauthorized, and stale plan context fail closed;
 * client names, plan text, and arbitrary permission claims never enter it.
 * NASM PROTOCOL CONTEXT: Plan mutations require an authorized plan revision;
 * normal conversation remains available on every recognized surface.
 */
import { describe, expect, it, vi } from 'vitest';

const loadService = async () => {
  try {
    return await import('../../services/ai/commandContextEnvelope.mjs');
  } catch (error) {
    if (
      error?.code === 'ERR_MODULE_NOT_FOUND'
      && String(error.message).includes('commandContextEnvelope.mjs')
    ) return null;
    throw error;
  }
};

const PLAN_ID = '11111111-1111-4111-8111-111111111111';
const actor = {
  id: 7,
  role: 'trainer',
  firstName: 'Private',
  lastName: 'Trainer',
  capabilities: ['plan:mutate:anything'],
};
const plan = {
  id: PLAN_ID,
  userId: 42,
  contentRevision: 7,
  updatedAt: new Date('2026-07-15T22:00:00.000Z'),
  title: 'Private client plan',
  planData: { notes: 'Do not place plan text in the context envelope' },
};

const build = async (request = {}, overrides = {}) => {
  const service = await loadService();
  expect(service).not.toBeNull();
  return service?.buildCommandContextEnvelope({
    actor,
    request: {
      surfaceHint: 'workout-planner',
      entityId: PLAN_ID,
      entityVersion: '7',
      correlationId: 'corr-123',
      selectedClientId: 42,
      ...request,
    },
    loadPlan: vi.fn(async () => plan),
    authorizeClient: vi.fn(async () => true),
    ...overrides,
  });
};

describe('commandContextEnvelope', () => {
  it('derives Planner mutation capability from authenticated role, plan access, and version', async () => {
    const envelope = await build();

    expect(envelope).toMatchObject({
      schemaVersion: '1.0',
      contextStatus: 'READY',
      surfaceId: 'workout-planner',
      actor: { id: 7, role: 'trainer' },
      permissions: { readEntity: true, mutateEntity: true },
      entity: {
        type: 'workout_plan', id: PLAN_ID, clientId: 42, version: '7',
      },
      correlationId: 'corr-123',
      promptVersion: 'swan-command-context-v1',
    });
    expect(envelope.capabilities).toEqual(expect.arrayContaining([
      'conversation', 'clarification', 'plan:analyze', 'plan:propose',
      'plan:mutate', 'plan:preview', 'plan:undo',
    ]));

    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toContain('Private');
    expect(serialized).not.toContain('planData');
    expect(serialized).not.toContain('notes');
    expect(serialized).not.toContain('plan:mutate:anything');
  });

  it('keeps Command Center conversational/proposal-only even with a plan entity', async () => {
    const envelope = await build({ surfaceHint: 'coach-command-center' });

    expect(envelope.surfaceId).toBe('coach-command-center');
    expect(envelope.capabilities).toEqual(expect.arrayContaining([
      'conversation', 'clarification', 'plan:analyze', 'plan:propose', 'navigation:open-plan',
    ]));
    expect(envelope.capabilities).not.toContain('plan:mutate');
    expect(envelope.permissions.mutateEntity).toBe(false);
  });

  it('keeps Command Center analysis and proposal modes available without a plan entity', async () => {
    const envelope = await build({
      surfaceHint: 'coach-command-center',
      entityId: null,
      entityVersion: null,
    });

    expect(envelope).toMatchObject({
      contextStatus: 'READY',
      surfaceId: 'coach-command-center',
      entity: null,
    });
    expect(envelope.capabilities).toEqual(expect.arrayContaining([
      'conversation', 'clarification', 'analysis', 'proposal', 'navigation:open-plan',
    ]));
    expect(envelope.capabilities).not.toContain('plan:mutate');
  });

  it('grants an authenticated editor the local workout-form capability without a plan entity', async () => {
    const envelope = await build({ surfaceHint: 'workout-logger', entityId: null, entityVersion: null });

    expect(envelope).toMatchObject({ contextStatus: 'READY', surfaceId: 'workout-logger', entity: null });
    expect(envelope.capabilities).toEqual(expect.arrayContaining([
      'conversation', 'clarification', 'workout-form:mutate',
    ]));
  });

  it('fails closed when the Planner has no active plan entity', async () => {
    const envelope = await build({ entityId: null, entityVersion: null });

    expect(envelope).toMatchObject({
      contextStatus: 'CTX_MISSING',
      surfaceId: 'workout-planner',
      entity: null,
      permissions: { readEntity: false, mutateEntity: false },
    });
    expect(envelope.capabilities).toEqual(expect.arrayContaining([
      'conversation', 'clarification', 'planner-draft:mutate',
    ]));
  });

  it('fails closed on a stale client version and returns only the authoritative fence', async () => {
    const envelope = await build({ entityVersion: '6' });

    expect(envelope).toMatchObject({
      contextStatus: 'CTX_STALE',
      entity: { id: PLAN_ID, version: '7' },
      permissions: { readEntity: true, mutateEntity: false },
    });
    expect(envelope.capabilities).not.toContain('plan:mutate');
    expect(envelope.capabilities).not.toContain('planner-draft:mutate');
  });

  it('fails closed without leaking entity truth when client authorization is denied', async () => {
    const envelope = await build({}, { authorizeClient: vi.fn(async () => false) });

    expect(envelope).toMatchObject({
      contextStatus: 'CTX_UNTRUSTED',
      entity: null,
      permissions: { readEntity: false, mutateEntity: false },
      capabilities: ['conversation', 'clarification'],
    });
    expect(JSON.stringify(envelope)).not.toContain(PLAN_ID);
    expect(envelope.capabilities).not.toContain('planner-draft:mutate');
  });

  it('fails closed if the plan loader returns a different entity than requested', async () => {
    const otherPlan = { ...plan, id: '22222222-2222-4222-8222-222222222222' };
    const envelope = await build({}, { loadPlan: vi.fn(async () => otherPlan) });

    expect(envelope).toMatchObject({
      contextStatus: 'CTX_UNTRUSTED',
      entity: null,
      permissions: { readEntity: false, mutateEntity: false },
    });
    expect(envelope.capabilities).not.toContain('plan:mutate');
  });

  it('fails closed on a malformed selected-client hint instead of treating it as absent', async () => {
    const envelope = await build({ selectedClientId: '42junk' });

    expect(envelope).toMatchObject({
      contextStatus: 'CTX_UNTRUSTED',
      entity: null,
      permissions: { readEntity: false, mutateEntity: false },
    });
    expect(envelope.capabilities).not.toContain('plan:mutate');
  });

  it('treats an unknown surface as generic chat and never loads the supplied entity', async () => {
    const loadPlan = vi.fn(async () => plan);
    const envelope = await build(
      { surfaceHint: 'invented-admin-console' },
      { loadPlan },
    );

    expect(envelope).toMatchObject({
      contextStatus: 'CTX_UNTRUSTED',
      surfaceId: 'generic',
      entity: null,
      capabilities: ['conversation'],
    });
    expect(loadPlan).not.toHaveBeenCalled();
  });

  it('ignores client-authored role, permission, and capability claims', async () => {
    const envelope = await build({
      role: 'admin',
      permissions: { mutateEntity: true },
      capabilities: ['plan:mutate:anything'],
    });

    expect(envelope.actor).toEqual({ id: 7, role: 'trainer' });
    expect(envelope).not.toHaveProperty('role');
    expect(envelope.capabilities).not.toContain('plan:mutate:anything');
  });
});
