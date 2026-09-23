/**
 * Brain-v4 P0.2 (hostile review C2): the staff created-thread adopter.
 * Every refusal is paired with the CONTROL it deviates from, so the suite cannot
 * pass by refusing everything.
 */
import { describe, expect, it } from 'vitest';
import { decideCreatedThreadAdoption, type AdoptionInput } from './coachCreatedThreadAdoption';

const snapshot = {
  actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', generation: 3,
  targetUserId: null, threadId: null, enabled: true,
} as const;
const base: AdoptionInput = {
  live: snapshot,
  liveActorKey: '7:trainer',
  actor: { actorNumber: 7, rawRole: 'trainer', staffActor: true, actorKey: '7:trainer' },
  captured: snapshot,
  thread: { id: 501, role: 'trainer', targetUserId: null },
  aborted: false,
};

describe('decideCreatedThreadAdoption', () => {
  it('CONTROL: adopts the new thread into the exact captured, thread-less publication', () => {
    const result = decideCreatedThreadAdoption(base);
    expect(result).toEqual({ ok: true, snapshot: { ...snapshot, threadId: 501 } });
    if (result.ok) expect(Object.isFrozen(result.snapshot)).toBe(true);
  });

  it('CONTROL: adopts for a bound client target when the thread carries that target', () => {
    const scoped = { ...snapshot, targetUserId: 42 };
    const result = decideCreatedThreadAdoption({
      ...base, live: scoped, captured: scoped, thread: { id: 9, role: 'trainer', targetUserId: 42 },
    });
    expect(result).toEqual({ ok: true, snapshot: { ...scoped, threadId: 9 } });
  });

  it.each([
    ['ABORTED', { aborted: true }],
    ['NOT_STAFF', { actor: { ...base.actor, staffActor: false } }],
    ['NO_LIVE_PUBLICATION', { live: null }],
    ['NO_LIVE_PUBLICATION', { live: { ...snapshot, enabled: false } }],
    ['ACTOR_EPOCH_CHANGED', { liveActorKey: '8:trainer' }],
    ['ALREADY_THREADED', { live: { ...snapshot, threadId: 12 } }],
    ['ALREADY_THREADED', { captured: { ...snapshot, threadId: 12 } }],
    ['SCOPE_CHANGED', { live: { ...snapshot, generation: 4 } }],
    ['SCOPE_CHANGED', { live: { ...snapshot, targetUserId: 42 } }],
    ['SCOPE_CHANGED', { captured: { ...snapshot, audienceRole: 'admin' } }],
    ['SCOPE_CHANGED', { actor: { ...base.actor, actorNumber: 8 } }],
    ['INVALID_THREAD', { thread: { id: 0, role: 'trainer', targetUserId: null } }],
    ['INVALID_THREAD', { thread: { id: 1.5, role: 'trainer', targetUserId: null } }],
    ['THREAD_SCOPE_MISMATCH', { thread: { id: 501, role: 'trainer', targetUserId: 42 } }],
    ['THREAD_SCOPE_MISMATCH', { thread: { id: 501, role: 'client', targetUserId: null } }],
  ] as const)('refuses %s', (reason, patch) => {
    expect(decideCreatedThreadAdoption({ ...base, ...(patch as Partial<AdoptionInput>) }))
      .toEqual({ ok: false, reason });
  });
});
