/**
 * Schedule Write Command — Selected-Client Scope
 * ==============================================
 *
 * REGRESSION GUARD for the C0.5 wrong-client write defect.
 *
 * Before the fix, `dispatchScheduleSession` and `dispatchRescheduleSession`
 * resolved the client from `params.clientId` — the value the intent classifier
 * extracted from speech — while `ctx.resolvedClient` (the client the trainer has
 * actually selected) sat in scope, unread. A misparsed pronoun in
 * "schedule her for Tuesday at 3" therefore booked against the WRONG client's
 * record.
 *
 * Every other client-scoped dispatcher family already has a guard of this shape
 * (`legacyWorkoutCommandClientScope`, `legacyOnboardingCommandClientScope`,
 * `legacyClientAdminCommandClientScope`, `destructiveOperationsClientScope`).
 * The schedule WRITE family was missed by that sweep. This file closes it.
 *
 * Contract under test: the route-resolved client ALWAYS wins over classifier
 * params; params are the fallback only when no client is resolved.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const SELECTED_CLIENT_ID = 42;   // what the trainer has on screen — must win
const CLASSIFIER_CLIENT_ID = 999; // what speech mis-extracted — must NOT be written

async function loadDispatcher({ existingSessions = [] } = {}) {
  vi.resetModules();

  const createdSessions = [];
  const savedSessions = [];

  const findByPk = vi.fn(async (id) => (
    id ? { id: Number(id), firstName: 'Test', lastName: 'Client', clientSource: 'direct' } : null
  ));
  const sessionCreate = vi.fn(async (payload) => {
    const row = { id: 5001, ...payload };
    createdSessions.push(payload);
    return row;
  });
  const sessionFindAll = vi.fn(async () => existingSessions);
  const sessionCount = vi.fn(async () => 0);

  const User = { findByPk };
  const Session = { create: sessionCreate, findAll: sessionFindAll, count: sessionCount };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ Session, User }),
    getSession: () => Session,
    getUser: () => User,
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    findByPk,
    sessionCreate,
    sessionFindAll,
    createdSessions,
    savedSessions,
  };
}

/** A single reschedulable session row whose save() we can observe. */
function buildExistingSession(savedSessions) {
  const row = {
    id: 7001,
    sessionDate: new Date('2026-08-04T15:00:00.000Z'),
    endDate: new Date('2026-08-04T16:00:00.000Z'),
    duration: 60,
    status: 'scheduled',
    trainerId: 7,
    save: vi.fn(async function save() { savedSessions.push({ ...this }); }),
  };
  return row;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('schedule write command selected-client scope', () => {
  it('writes the SELECTED client, not the classifier-extracted one, when scheduling', async () => {
    const { dispatch, sessionCreate, findByPk } = await loadDispatcher();

    await dispatch('schedule_session', {
      clientId: CLASSIFIER_CLIENT_ID,
      date: '2026-08-04',
      time: '15:00',
      duration: 60,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: SELECTED_CLIENT_ID },
    });

    // The written row must belong to the selected client.
    expect(sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      userId: SELECTED_CLIENT_ID,
    }));

    // And the misparsed id must never have been looked up at all.
    expect(findByPk).not.toHaveBeenCalledWith(CLASSIFIER_CLIENT_ID, expect.anything());
  });

  it('moves the SELECTED client\'s session, not the classifier-extracted one, when rescheduling', async () => {
    const savedSessions = [];
    const existing = buildExistingSession(savedSessions);
    const { dispatch, sessionFindAll, findByPk } = await loadDispatcher({
      existingSessions: [existing],
    });

    await dispatch('reschedule_session', {
      clientId: CLASSIFIER_CLIENT_ID,
      originalDate: '2026-08-04',
      newDate: '2026-08-05',
      newTime: '16:00',
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: SELECTED_CLIENT_ID },
    });

    // The lookup that selects which session to move must be scoped to the
    // selected client — this is the query that decides whose calendar changes.
    expect(sessionFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: SELECTED_CLIENT_ID }),
    }));

    expect(existing.save).toHaveBeenCalled();
    expect(findByPk).not.toHaveBeenCalledWith(CLASSIFIER_CLIENT_ID, expect.anything());
  });

  it('falls back to params.clientId when no client is resolved (scheduling)', async () => {
    const { dispatch, sessionCreate } = await loadDispatcher();

    await dispatch('schedule_session', {
      clientId: SELECTED_CLIENT_ID,
      date: '2026-08-04',
      time: '15:00',
      duration: 60,
    }, {
      user: { id: 7, role: 'trainer' },
      // no resolvedClient — params are the only signal available
    });

    expect(sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      userId: SELECTED_CLIENT_ID,
    }));
  });

  it('cancels the SELECTED client\'s session, not the classifier-extracted one', async () => {
    // cancel_session is DESTRUCTIVE. It reached the classifier id by destructuring
    // (`const { sessionId, clientId, date } = params`), which a property-access-only
    // guard check missed entirely.
    const savedSessions = [];
    const existing = buildExistingSession(savedSessions);
    const { dispatch, sessionFindAll } = await loadDispatcher({
      existingSessions: [existing],
    });

    await dispatch('cancel_session', {
      clientId: CLASSIFIER_CLIENT_ID,
      date: '2026-08-04',
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: SELECTED_CLIENT_ID },
    }).catch(() => { /* downstream cancel service is out of scope; the lookup is what matters */ });

    // The query that decides WHICH session gets cancelled must be scoped to the
    // selected client — otherwise a misheard name cancels someone else's session.
    expect(sessionFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: SELECTED_CLIENT_ID }),
    }));
  });

  it('falls back to params.clientId when no client is resolved (rescheduling)', async () => {
    const savedSessions = [];
    const existing = buildExistingSession(savedSessions);
    const { dispatch, sessionFindAll } = await loadDispatcher({
      existingSessions: [existing],
    });

    await dispatch('reschedule_session', {
      clientId: SELECTED_CLIENT_ID,
      originalDate: '2026-08-04',
      newDate: '2026-08-05',
      newTime: '16:00',
    }, {
      user: { id: 7, role: 'trainer' },
    });

    expect(sessionFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: SELECTED_CLIENT_ID }),
    }));
  });
});