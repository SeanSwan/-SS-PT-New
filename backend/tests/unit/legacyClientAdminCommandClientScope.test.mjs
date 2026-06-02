import { afterEach, describe, expect, it, vi } from 'vitest';

const buildClientRecord = () => ({
  id: 42,
  role: 'client',
  firstName: 'Ava',
  email: 'ava@example.test',
  availableSessions: 8.4,
  clientSource: 'swanstudios',
  isActive: true,
  masterPromptJson: { version: '3.0' },
  clientProgress: { weight: 181 },
  workoutSessions: [],
  clientSessions: [],
  orders: [],
  update: vi.fn(async () => {}),
  toJSON() {
    return { ...this };
  },
});

async function loadDispatcher({ userFindOneResults = null } = {}) {
  vi.resetModules();

  const clientRecord = buildClientRecord();
  const trainerRecord = { id: 7, role: 'trainer', firstName: 'Mira', email: 'mira@example.test' };
  const queuedFindOneResults = userFindOneResults ? [...userFindOneResults] : null;
  const findOne = vi.fn(async () => (
    queuedFindOneResults ? (queuedFindOneResults.shift() ?? null) : clientRecord
  ));
  const createNotification = vi.fn(async () => ({ success: true, notification: { id: 9001 } }));
  const transaction = { commit: vi.fn(async () => {}), rollback: vi.fn(async () => {}) };
  const sequelize = {
    transaction: vi.fn(async () => transaction),
    query: vi.fn(async () => [[{ id: 1201, clientId: 42, trainerId: 7 }]]),
  };
  const ClientTrainerAssignment = {
    findOne: vi.fn(async () => null),
    update: vi.fn(async () => [1]),
    findByPk: vi.fn(async () => ({ id: 1201, clientId: 42, trainerId: 7 })),
  };
  const Session = {
    findOne: vi.fn(async () => null),
    findAll: vi.fn(async () => []),
    update: vi.fn(async () => [1]),
  };
  const Order = {
    findOne: vi.fn(async () => null),
    findAll: vi.fn(async () => []),
  };
  const User = { associations: { workoutSessions: true }, findOne };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      User,
      ClientProgress: {},
      Session,
      WorkoutSession: {},
      Order,
      ClientTrainerAssignment,
    }),
  }));
  vi.doMock('../../controllers/notificationController.mjs', () => ({ createNotification }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    ClientTrainerAssignment,
    Order,
    Session,
    clientRecord,
    createNotification,
    findOne,
    sequelize,
    trainerRecord,
    transaction,
  };
}

const adminSelectedClientCtx = (sequelize) => ({
  user: { id: 1, role: 'admin' },
  resolvedClient: { id: 42, firstName: 'Ava' },
  options: sequelize ? { sequelize } : {},
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('legacy client-admin command selected-client scope', () => {
  it('prefers the selected client for client profile reads', async () => {
    const { dispatch, findOne } = await loadDispatcher();

    const result = await dispatch('view_client_profile', { clientId: 999 }, adminSelectedClientCtx());

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
    }));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client for billing overview reads', async () => {
    const { dispatch, findOne, Order } = await loadDispatcher();

    const result = await dispatch('client_billing_overview', { clientId: 999 }, adminSelectedClientCtx());

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
    }));
    expect(Order.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, status: 'completed' },
    }));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client for notifications', async () => {
    const { dispatch, createNotification } = await loadDispatcher();

    const result = await dispatch('notify_client', {
      clientId: 999,
      title: 'Coach update',
      message: 'Bring water.',
      type: 'admin',
    }, adminSelectedClientCtx());

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client for account locking', async () => {
    const { dispatch, clientRecord, findOne, sequelize } = await loadDispatcher();

    const result = await dispatch('lock_client', { clientId: 999, isLocked: true }, adminSelectedClientCtx(sequelize));

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
    }));
    expect(clientRecord.update).toHaveBeenCalledWith({ isLocked: true }, expect.any(Object));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client when assigning a trainer', async () => {
    const clientRecord = buildClientRecord();
    const trainerRecord = { id: 7, role: 'trainer' };
    const {
      ClientTrainerAssignment,
      dispatch,
      findOne,
      sequelize,
    } = await loadDispatcher({ userFindOneResults: [clientRecord, trainerRecord] });

    const result = await dispatch('assign_trainer', {
      clientId: 999,
      trainerId: 7,
    }, adminSelectedClientCtx(sequelize));

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 42 }),
    }));
    expect(ClientTrainerAssignment.update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ where: { clientId: 42, status: 'active' } }),
    );
    expect(sequelize.query).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      replacements: expect.objectContaining({ clientId: 42, trainerId: 7 }),
    }));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client when soft-deactivating a client', async () => {
    const { Session, clientRecord, dispatch, findOne, sequelize } = await loadDispatcher();

    const result = await dispatch('deactivate_client', {
      clientId: 999,
      softDelete: true,
    }, adminSelectedClientCtx(sequelize));

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
    }));
    expect(Session.update).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      where: expect.objectContaining({ userId: 42 }),
    }));
    expect(clientRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      isActive: false,
    }), expect.any(Object));
    expect(result.clientId).toBe(42);
  });
});
