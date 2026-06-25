import { Op } from 'sequelize';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({
  clientRecord = null,
  userFindOneResults = null,
  listRows = [],
  listCount = listRows.length,
  lastOrder = null,
  pendingOrders = [],
  nextSession = null,
  recentSessions = [],
  notificationResult = { success: true, notification: { id: 9001 } },
  existingAssignment = null,
  assignmentInsertRows = [{ id: 1201 }],
  assignmentFindByPk = { id: 1201 },
  deactivatedAssignments = [1],
} = {}) {
  vi.resetModules();

  const queuedFindOneResults = Array.isArray(userFindOneResults) ? [...userFindOneResults] : null;
  const findOne = vi.fn(async () => (
    queuedFindOneResults ? (queuedFindOneResults.shift() ?? null) : clientRecord
  ));
  const findAndCountAll = vi.fn(async () => ({ count: listCount, rows: listRows }));
  const orderFindOne = vi.fn(async () => lastOrder);
  const orderFindAll = vi.fn(async () => pendingOrders);
  const sessionFindOne = vi.fn(async () => nextSession);
  const sessionFindAll = vi.fn(async () => recentSessions);
  const sessionUpdate = vi.fn(async () => [1]);
  const userCount = vi.fn(async () => listCount);
  const createNotification = vi.fn(async () => notificationResult);
  const assignmentFindOne = vi.fn(async () => existingAssignment);
  const assignmentUpdate = vi.fn(async () => deactivatedAssignments);
  const assignmentFindByPkMock = vi.fn(async () => assignmentFindByPk);
  const ClientTrainerAssignment = {
    findOne: assignmentFindOne,
    update: assignmentUpdate,
    findByPk: assignmentFindByPkMock,
  };
  const User = { associations: { workoutSessions: true }, findOne, count: userCount };
  User.findAndCountAll = findAndCountAll;
  const ClientProgress = {};
  const Session = { findOne: sessionFindOne, findAll: sessionFindAll, update: sessionUpdate };
  const WorkoutSession = {};
  const Order = { findOne: orderFindOne, findAll: orderFindAll };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      User,
      ClientProgress,
      Session,
      WorkoutSession,
      Order,
      ClientTrainerAssignment,
    }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));
  vi.doMock('../../controllers/notificationController.mjs', () => ({
    createNotification,
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    findOne,
    findAndCountAll,
    userCount,
    orderFindOne,
    orderFindAll,
    sessionFindOne,
    sessionFindAll,
    sessionUpdate,
    createNotification,
    ClientTrainerAssignment,
    assignmentFindOne,
    assignmentUpdate,
    assignmentFindByPk: assignmentFindByPkMock,
    assignmentInsertRows,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.useRealTimers();
});

describe('Swan Coach client command dispatchers', () => {
  it('wires view_client_profile to a privacy-safe client summary', async () => {
    const clientRecord = {
      id: 42,
      firstName: 'Ava',
      lastName: 'Strong',
      email: 'ava@example.test',
      isActive: true,
      clientSource: 'move_fitness',
      availableSessions: 0,
      fitnessGoal: 'strength',
      masterPromptJson: { version: '3.0' },
      clientProgress: { weight: 187 },
      workoutSessions: [
        { completedAt: new Date('2026-05-30T18:30:00.000Z'), title: 'Upper Body' },
      ],
      clientSessions: [
        { sessionDate: new Date('2026-06-02T18:30:00.000Z'), status: 'confirmed' },
      ],
      orders: [{ id: 1 }, { id: 2 }],
      toJSON() {
        return { ...this };
      },
    };
    const { dispatch, hasDispatcher, findOne } = await loadDispatcher({ clientRecord });

    expect(hasDispatcher('view_client_profile')).toBe(true);

    const result = await dispatch('view_client_profile', {
      clientId: 42,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
      attributes: { exclude: ['password', 'refreshTokenHash'] },
    }));
    expect(result).toEqual({
      clientId: 42,
      found: true,
      isActive: true,
      clientSource: 'move_fitness',
      availableSessions: 0,
      fitnessGoal: 'strength',
      onboardingComplete: true,
      totalWorkouts: 1,
      totalOrders: 2,
      lastWorkoutDate: '2026-05-30',
      nextSessionDate: '2026-06-02',
      latestWeight: 187,
    });
    expect(JSON.stringify(result)).not.toContain('Ava');
    expect(JSON.stringify(result)).not.toContain('ava@example.test');
  });

  it('wires list_active_clients to trainer-scoped privacy-safe client counts', async () => {
    const listRows = [
      {
        id: 31,
        firstName: 'Ava',
        email: 'ava@example.test',
        isActive: true,
        clientSource: 'swanstudios',
        toJSON() {
          return { ...this };
        },
      },
      {
        id: 32,
        firstName: 'Ben',
        email: 'ben@example.test',
        isActive: true,
        clientSource: 'move_fitness',
        toJSON() {
          return { ...this };
        },
      },
    ];
    const {
      dispatch,
      hasDispatcher,
      findAndCountAll,
      ClientTrainerAssignment,
    } = await loadDispatcher({ listRows, listCount: 2 });

    expect(hasDispatcher('list_active_clients')).toBe(true);

    const result = await dispatch('list_active_clients', {
      status: 'active',
      page: 1,
      limit: 20,
    }, {
      user: { id: 7, role: 'trainer' },
    });

    expect(findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: 'client', isActive: true },
      include: expect.arrayContaining([
        expect.objectContaining({
          model: ClientTrainerAssignment,
          as: 'clientAssignments',
          required: true,
          where: { trainerId: 7, status: 'active' },
        }),
      ]),
      attributes: { exclude: ['password', 'refreshTokenHash', 'masterPromptJson'] },
    }));
    expect(result).toEqual({
      totalCount: 2,
      returnedCount: 2,
      activeCount: 2,
      inactiveCount: 0,
      swanStudiosCount: 1,
      moveFitnessCount: 1,
      externalCount: 0,
      firstClientId: 31,
      clientIds: '31, 32',
      page: 1,
      limit: 20,
    });
    expect(JSON.stringify(result)).not.toContain('Ava');
    expect(JSON.stringify(result)).not.toContain('ava@example.test');
    expect(JSON.stringify(result)).not.toContain('Ben');
    expect(JSON.stringify(result)).not.toContain('ben@example.test');
  });

  it('wires at_risk_clients to assignment-scoped privacy-safe compliance counts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'));

    const query = vi.fn(async () => [[
      {
        id: 44,
        firstName: 'Risky',
        lastName: 'Client',
        email: 'risky@example.test',
        availableSessions: 1,
        clientSource: 'swanstudios',
        lastWorkoutDate: '2026-05-10T12:00:00.000Z',
        workouts7d: 0,
        workouts30d: 0,
      },
      {
        id: 45,
        firstName: 'Move',
        lastName: 'Member',
        email: 'move@example.test',
        availableSessions: 0,
        clientSource: 'move_fitness',
        lastWorkoutDate: '2026-05-29T12:00:00.000Z',
        workouts7d: 1,
        workouts30d: 4,
      },
    ]]);
    const { dispatch, hasDispatcher } = await loadDispatcher();

    expect(hasDispatcher('at_risk_clients')).toBe(true);

    const result = await dispatch('at_risk_clients', {
      limit: 20,
    }, {
      user: { id: 7, role: 'trainer' },
      options: { sequelize: { query } },
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('client_trainer_assignments'),
      expect.objectContaining({
        replacements: expect.objectContaining({ trainerId: 7, limit: 20 }),
      }),
    );
    expect(result).toEqual({
      atRiskCount: 2,
      criticalCount: 1,
      warningCount: 1,
      watchCount: 0,
      freeTrackingCount: 1,
      lowSessionPaidCount: 1,
      firstClientId: 44,
      highestRiskLevel: 'critical',
    });
    expect(JSON.stringify(result)).not.toContain('Risky');
    expect(JSON.stringify(result)).not.toContain('risky@example.test');
    expect(JSON.stringify(result)).not.toContain('Move');
    expect(JSON.stringify(result)).not.toContain('move@example.test');
  });

  it('wires client_billing_overview to a privacy-safe session credit summary', async () => {
    const clientRecord = {
      id: 42,
      firstName: 'Ava',
      lastName: 'Strong',
      email: 'ava@example.test',
      availableSessions: 12.9,
      clientSource: 'swanstudios',
    };
    const lastOrder = {
      id: 200,
      totalAmount: 500,
      completedAt: new Date('2026-05-20T12:00:00.000Z'),
      paymentAppliedAt: new Date('2026-05-20T12:05:00.000Z'),
      paymentReference: 'manual-123',
    };
    const pendingOrders = [
      { id: 201, totalAmount: 120, status: 'pending' },
      { id: 202, totalAmount: 180, status: 'pending_payment' },
    ];
    const nextSession = {
      id: 301,
      sessionDate: new Date('2026-06-02T18:30:00.000Z'),
      status: 'confirmed',
    };
    const recentSessions = [
      { id: 401, sessionDate: new Date('2026-05-29T18:30:00.000Z') },
      { id: 402, sessionDate: new Date('2026-05-22T18:30:00.000Z') },
    ];
    const { dispatch, hasDispatcher, findOne, orderFindOne } = await loadDispatcher({
      clientRecord,
      lastOrder,
      pendingOrders,
      nextSession,
      recentSessions,
    });

    expect(hasDispatcher('client_billing_overview')).toBe(true);

    const result = await dispatch('client_billing_overview', {
      clientId: 42,
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
      attributes: ['id', 'availableSessions', 'clientSource', 'sessionBillingMode'],
    }));
    expect(orderFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, status: 'completed' },
    }));
    expect(result).toEqual({
      clientId: 42,
      found: true,
      clientSource: 'swanstudios',
      deductsSessions: true,
      sessionsRemaining: 12,
      hasLastPurchase: true,
      lastPurchaseAmount: 500,
      lastPurchaseDate: '2026-05-20',
      paymentApplied: true,
      pendingOrderCount: 2,
      pendingOrderTotal: 300,
      hasNextSession: true,
      nextSessionDate: '2026-06-02',
      recentCompletedSessions: 2,
      lastCompletedSessionDate: '2026-05-29',
    });
    expect(JSON.stringify(result)).not.toContain('Ava');
    expect(JSON.stringify(result)).not.toContain('ava@example.test');
  });

  it('wires notify_client to the admin notification utility without echoing message text', async () => {
    const clientRecord = {
      id: 42,
      firstName: 'Ava',
      email: 'ava@example.test',
    };
    const {
      dispatch,
      hasDispatcher,
      findOne,
      createNotification,
    } = await loadDispatcher({ clientRecord });

    expect(hasDispatcher('notify_client')).toBe(true);

    const result = await dispatch('notify_client', {
      clientId: 42,
      title: 'Coach update',
      message: 'Bring water to the next session.',
      type: 'admin',
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
      attributes: ['id'],
    }));
    expect(createNotification).toHaveBeenCalledWith({
      userId: 42,
      title: 'Coach update',
      message: 'Bring water to the next session.',
      type: 'admin',
      senderId: 1,
    });
    expect(result).toEqual({
      clientId: 42,
      found: true,
      notificationSent: true,
      notificationId: 9001,
      type: 'admin',
    });
    expect(JSON.stringify(result)).not.toContain('Ava');
    expect(JSON.stringify(result)).not.toContain('ava@example.test');
    expect(JSON.stringify(result)).not.toContain('Bring water');
  });

  it('wires deactivate_client to soft-delete the client and cancel future sessions', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'));

    const clientRecord = {
      id: 42,
      firstName: 'Zoe',
      email: 'zoe@example.test',
      availableSessions: 7.9,
      update: vi.fn(async () => {}),
    };
    const transaction = {
      commit: vi.fn(async () => {}),
      rollback: vi.fn(async () => {}),
    };
    const sequelize = {
      transaction: vi.fn(async () => transaction),
    };
    const {
      dispatch,
      hasDispatcher,
      findOne,
      sessionUpdate,
    } = await loadDispatcher({ clientRecord });

    expect(hasDispatcher('deactivate_client')).toBe(true);

    const result = await dispatch('deactivate_client', {
      clientId: 42,
      softDelete: true,
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42, firstName: 'Zoe' },
      options: { sequelize },
    });

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
      transaction,
    }));
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
      }),
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 42,
        }),
        transaction,
      }),
    );
    expect(sessionUpdate.mock.calls[0][1].where.status[Op.in]).toEqual(expect.arrayContaining([
      'available',
      'assigned',
      'requested',
      'scheduled',
      'confirmed',
    ]));
    expect(clientRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        accountDeactivatedAt: expect.any(Date),
        accountRetentionUntil: expect.any(Date),
      }),
      { transaction },
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(result).toMatchObject({
      clientId: 42,
      found: true,
      deactivated: true,
      cancelledFutureSessions: 1,
      preservedAvailableSessions: 7,
    });
    expect(JSON.stringify(result)).not.toContain('Zoe');
    expect(JSON.stringify(result)).not.toContain('zoe@example.test');
  });

  it('wires lock_client to the canonical isLocked flag without leaking client PII', async () => {
    const clientRecord = {
      id: 42,
      firstName: 'Zoe',
      email: 'zoe@example.test',
      update: vi.fn(async () => {}),
    };
    const transaction = {
      commit: vi.fn(async () => {}),
      rollback: vi.fn(async () => {}),
    };
    const sequelize = {
      transaction: vi.fn(async () => transaction),
    };
    const {
      dispatch,
      hasDispatcher,
      findOne,
    } = await loadDispatcher({ clientRecord });

    expect(hasDispatcher('lock_client')).toBe(true);

    const result = await dispatch('lock_client', {
      clientId: 42,
      isLocked: true,
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42, firstName: 'Zoe' },
      options: { sequelize },
    });

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, role: 'client' },
      transaction,
    }));
    expect(clientRecord.update).toHaveBeenCalledWith({ isLocked: true }, { transaction });
    expect(transaction.commit).toHaveBeenCalled();
    expect(transaction.rollback).not.toHaveBeenCalled();
    expect(result).toEqual({
      clientId: 42,
      found: true,
      locked: true,
    });
    expect(JSON.stringify(result)).not.toContain('Zoe');
    expect(JSON.stringify(result)).not.toContain('zoe@example.test');
  });

  it('wires assign_trainer to the canonical assignment table without minting sessions', async () => {
    const clientRecord = {
      id: 42,
      firstName: 'Zoe',
      email: 'zoe@example.test',
      role: 'client',
    };
    const trainerRecord = {
      id: 7,
      firstName: 'Mira',
      email: 'mira@example.test',
      role: 'trainer',
    };
    const transaction = {
      commit: vi.fn(async () => {}),
      rollback: vi.fn(async () => {}),
    };
    const sequelize = {
      transaction: vi.fn(async () => transaction),
      query: vi.fn(async () => [[{ id: 1201, clientId: 42, trainerId: 7 }]]),
    };
    const {
      dispatch,
      hasDispatcher,
      findOne,
      assignmentFindOne,
      assignmentUpdate,
      assignmentFindByPk,
      sessionUpdate,
    } = await loadDispatcher({
      userFindOneResults: [clientRecord, trainerRecord],
      assignmentFindByPk: { id: 1201, clientId: 42, trainerId: 7 },
    });

    expect(hasDispatcher('assign_trainer')).toBe(true);

    const result = await dispatch('assign_trainer', {
      clientId: 42,
      trainerId: 7,
      notes: 'Assigned via Swan Coach command center',
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42, firstName: 'Zoe' },
      options: { sequelize },
    });

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 42 }),
      transaction,
    }));
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 7 }),
      transaction,
    }));
    expect(assignmentFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientId: 42, trainerId: 7, status: 'active' },
      transaction,
    }));
    expect(assignmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'inactive' }),
      expect.objectContaining({
        where: { clientId: 42, status: 'active' },
        transaction,
      })
    );
    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_trainer_assignments'),
      expect.objectContaining({
        replacements: expect.objectContaining({
          clientId: 42,
          trainerId: 7,
          assignedBy: 1,
          notes: 'Assigned via Swan Coach command center',
        }),
        transaction,
      })
    );
    expect(assignmentFindByPk).toHaveBeenCalledWith(1201, expect.objectContaining({ transaction }));
    expect(sessionUpdate).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
    expect(transaction.rollback).not.toHaveBeenCalled();
    expect(result).toEqual({
      clientId: 42,
      trainerId: 7,
      assigned: true,
      alreadyAssigned: false,
      assignmentId: 1201,
      priorAssignmentsDeactivated: 1,
    });
    expect(JSON.stringify(result)).not.toContain('Zoe');
    expect(JSON.stringify(result)).not.toContain('zoe@example.test');
    expect(JSON.stringify(result)).not.toContain('Mira');
    expect(JSON.stringify(result)).not.toContain('mira@example.test');
  });

  it('wires export_client_list to a PII-safe canonical export receipt', async () => {
    const {
      dispatch,
      hasDispatcher,
      userCount,
      findAndCountAll,
    } = await loadDispatcher({ listCount: 12 });

    expect(hasDispatcher('export_client_list')).toBe(true);

    const result = await dispatch('export_client_list', {
      format: 'json',
      status: 'active',
      clientSource: 'move_fitness',
    }, {
      user: { id: 1, role: 'admin' },
    });

    expect(userCount).toHaveBeenCalledWith({
      where: {
        role: 'client',
        isActive: true,
        clientSource: 'move_fitness',
      },
    });
    expect(findAndCountAll).not.toHaveBeenCalled();
    expect(result).toEqual({
      exportReady: true,
      format: 'json',
      matchingClients: 12,
      downloadPath: '/api/admin/clients/export?format=json&status=active&clientSource=move_fitness',
      includesPIIInCommandResult: false,
    });
    expect(JSON.stringify(result)).not.toContain('email');
    expect(JSON.stringify(result)).not.toContain('firstName');
    expect(JSON.stringify(result)).not.toContain('lastName');
  });
});
