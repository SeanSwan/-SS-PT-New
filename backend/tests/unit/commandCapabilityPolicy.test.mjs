/**
 * commandCapabilityPolicy.test.mjs
 * =================================
 * Locks surface-scoped browser commands to coherent server-policy envelopes.
 */
import { describe, expect, it } from 'vitest';

const loadPolicy = async () => {
  try {
    return await import('../../services/ai/commandCapabilityPolicy.mjs');
  } catch (error) {
    if (
      error?.code === 'ERR_MODULE_NOT_FOUND'
      && String(error.message).includes('commandCapabilityPolicy.mjs')
    ) return null;
    throw error;
  }
};

const ACTOR = { id: 7, role: 'admin' };
const envelope = (surfaceId, capabilities, overrides = {}) => ({
  schemaVersion: '1.0',
  contextStatus: 'READY',
  surfaceId,
  actor: ACTOR,
  permissions: { readEntity: false, mutateEntity: false },
  entity: null,
  capabilities,
  ...overrides,
});

const plannerCommand = { type: 'planner_rearrange_workout', method: 'FRONTEND_DISPATCH' };

describe('commandCapabilityPolicy', () => {
  it('allows a coherent unsaved Planner draft capability', async () => {
    const service = await loadPolicy();
    expect(service).not.toBeNull();

    expect(service?.authorizeCommandCapability(
      plannerCommand,
      envelope('workout-planner', ['planner-draft:mutate'], { contextStatus: 'CTX_MISSING' }),
      ACTOR,
    )).toMatchObject({ allowed: true, policy: 'planner_mutation' });
  });

  it('allows a coherent current saved-plan mutation capability', async () => {
    const service = await loadPolicy();

    expect(service?.authorizeCommandCapability(
      plannerCommand,
      envelope('workout-planner', ['plan:mutate'], {
        permissions: { readEntity: true, mutateEntity: true },
        entity: { type: 'workout_plan', id: 'plan-1', version: '7' },
      }),
      ACTOR,
    )).toMatchObject({ allowed: true, policy: 'planner_mutation' });
  });

  it.each([
    ['stale saved entity', { contextStatus: 'CTX_STALE', permissions: { readEntity: true, mutateEntity: true }, entity: { id: 'plan-1', version: '7' } }],
    ['missing mutation permission', { permissions: { readEntity: true, mutateEntity: false }, entity: { id: 'plan-1', version: '7' } }],
    ['mismatched authenticated actor', { permissions: { readEntity: true, mutateEntity: true }, entity: { id: 'plan-1', version: '7' }, actor: { id: 99, role: 'admin' } }],
    ['wrong envelope schema', { schemaVersion: '999', permissions: { readEntity: true, mutateEntity: true }, entity: { id: 'plan-1', version: '7' } }],
  ])('denies incoherent saved-plan capability: %s', async (_label, overrides) => {
    const service = await loadPolicy();

    expect(service?.authorizeCommandCapability(
      plannerCommand,
      envelope('workout-planner', ['plan:mutate'], overrides),
      ACTOR,
    )).toMatchObject({ allowed: false, policy: 'planner_mutation' });
  });

  it('denies planner mutation from Command Center even for an admin', async () => {
    const service = await loadPolicy();

    expect(service?.authorizeCommandCapability(
      plannerCommand,
      envelope('coach-command-center', ['conversation', 'proposal']),
      ACTOR,
    )).toEqual({
      allowed: false,
      policy: 'planner_mutation',
      requiredAny: ['planner-draft:mutate', 'plan:mutate'],
    });
  });

  it('rejects a planner capability forged onto a different surface', async () => {
    const service = await loadPolicy();

    expect(service?.authorizeCommandCapability(
      plannerCommand,
      envelope('coach-command-center', ['conversation', 'planner-draft:mutate'], { contextStatus: 'CTX_MISSING' }),
      ACTOR,
    )).toMatchObject({ allowed: false, policy: 'planner_mutation' });
  });

  it('requires workout-form capability and a coherent logger surface', async () => {
    const service = await loadPolicy();
    const command = { type: 'add_exercise_to_form', method: 'FRONTEND_DISPATCH' };

    expect(service?.authorizeCommandCapability(
      command, envelope('workout-logger', ['conversation', 'workout-form:mutate']), ACTOR,
    )).toMatchObject({ allowed: true, policy: 'workout_form_mutation' });
    expect(service?.authorizeCommandCapability(
      command, envelope('generic', ['conversation']), ACTOR,
    )).toMatchObject({ allowed: false, policy: 'workout_form_mutation' });
    expect(service?.authorizeCommandCapability(
      command, envelope('coach-command-center', ['conversation', 'workout-form:mutate']), ACTOR,
    )).toMatchObject({ allowed: false, policy: 'workout_form_mutation' });
  });

  it('leaves non-surface commands to their existing RBAC and dispatcher policies', async () => {
    const service = await loadPolicy();

    expect(service?.authorizeCommandCapability(
      { type: 'view_client_profile', method: 'GET' },
      envelope('coach-command-center', ['conversation']),
      ACTOR,
    )).toEqual({ allowed: true, policy: null, requiredAny: [] });
  });
});
