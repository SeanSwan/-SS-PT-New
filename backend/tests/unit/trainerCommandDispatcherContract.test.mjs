/**
 * Trainer command dispatcher contracts
 * ====================================
 * Ensures trainer-client voice reads execute against assignment truth and return
 * flat PII-safe summaries for Coach cards.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({
  assignments = [],
  trainerRows = [],
  userFindOneResults = [],
  existingAssignment = null,
  deactivatedAssignments = [1],
  assignmentFindByPkResult = { id: 1201 },
} = {}) {
  vi.resetModules();

  const findAll = vi.fn(async () => assignments);
  const findAndCountAll = vi.fn(async () => ({
    count: trainerRows.length,
    rows: trainerRows,
  }));
  const queuedFindOneResults = [...userFindOneResults];
  const userFindOne = vi.fn(async () => queuedFindOneResults.shift() ?? null);
  const assignmentFindOne = vi.fn(async () => existingAssignment);
  const assignmentUpdate = vi.fn(async () => deactivatedAssignments);
  const assignmentFindByPk = vi.fn(async () => assignmentFindByPkResult);
  const User = { findAndCountAll, findOne: userFindOne };
  const ClientTrainerAssignment = {
    findAll,
    findOne: assignmentFindOne,
    update: assignmentUpdate,
    findByPk: assignmentFindByPk,
  };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ User, ClientTrainerAssignment }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    findAll,
    findAndCountAll,
    userFindOne,
    assignmentFindOne,
    assignmentUpdate,
    assignmentFindByPk,
    User,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('trainer command dispatchers', () => {
  it('wires view_trainer_clients to active assignment truth without client PII', async () => {
    const { dispatch, hasDispatcher, findAll, User } = await loadDispatcher({
      assignments: [
        {
          id: 10,
          clientId: 42,
          client: {
            id: 42,
            availableSessions: 3,
            clientSource: 'swanstudios',
            accountStatus: 'active',
            firstName: 'Hidden',
            email: 'hidden@example.com',
          },
        },
        {
          id: 11,
          clientId: 43,
          client: {
            id: 43,
            availableSessions: 0,
            clientSource: 'move_fitness',
            accountStatus: 'stub',
            firstName: 'Also Hidden',
            phone: '555-555-5555',
          },
        },
      ],
    });

    expect(hasDispatcher('view_trainer_clients')).toBe(true);

    const result = await dispatch('view_trainer_clients', { trainerId: 7 }, {
      user: { id: 1, role: 'admin' },
    });

    expect(findAll).toHaveBeenCalledWith({
      where: { trainerId: 7, status: 'active' },
      include: [{
        model: User,
        as: 'client',
        attributes: ['id', 'availableSessions', 'clientSource', 'accountStatus'],
        required: false,
      }],
      order: [['createdAt', 'DESC']],
    });
    expect(result).toEqual({
      trainerId: 7,
      totalClients: 2,
      firstClientId: 42,
      swanstudiosClients: 1,
      moveFitnessClients: 1,
      externalClients: 0,
      activeAccountCount: 1,
      stubAccountCount: 1,
      availableSessionTotal: 3,
    });
    expect(JSON.stringify(result)).not.toContain('Hidden');
    expect(JSON.stringify(result)).not.toContain('example.com');
    expect(JSON.stringify(result)).not.toContain('555-555-5555');
  });

  it('wires list_trainers to a PII-safe trainer roster summary', async () => {
    const { dispatch, hasDispatcher, findAndCountAll } = await loadDispatcher({
      trainerRows: [
        {
          id: 7,
          role: 'trainer',
          averageRating: 4.8,
          email: 'trainer@example.com',
          phone: '555-000-1111',
        },
        {
          id: 1,
          role: 'admin',
          averageRating: 5,
          firstName: 'Hidden Admin',
        },
      ],
    });

    expect(hasDispatcher('list_trainers')).toBe(true);

    const result = await dispatch('list_trainers', {
      includeAdmin: true,
      limit: 20,
      page: 1,
    }, {
      user: { id: 1, role: 'admin' },
    });

    const call = findAndCountAll.mock.calls[0][0];
    expect(call.where.isActive).toBe(true);
    expect(call.attributes).not.toContain('email');
    expect(call.attributes).not.toContain('phone');
    expect(call.limit).toBe(20);
    expect(call.offset).toBe(0);
    expect(result).toEqual({
      totalTrainers: 2,
      returnedTrainers: 2,
      firstTrainerId: 7,
      trainerRoleCount: 1,
      adminTrainerCount: 1,
      averageRating: 4.9,
      page: 1,
      limit: 20,
    });
    expect(JSON.stringify(result)).not.toContain('trainer@example.com');
    expect(JSON.stringify(result)).not.toContain('Hidden Admin');
    expect(JSON.stringify(result)).not.toContain('555-000-1111');
  });

  it('wires assign_client_to_trainer to the canonical assignment table alias', async () => {
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
      userFindOne,
      assignmentFindOne,
      assignmentUpdate,
      assignmentFindByPk,
    } = await loadDispatcher({
      userFindOneResults: [
        {
          id: 42,
          role: 'client',
          firstName: 'Hidden Client',
          email: 'hidden.client@example.com',
        },
        {
          id: 7,
          role: 'trainer',
          firstName: 'Hidden Trainer',
          email: 'hidden.trainer@example.com',
        },
      ],
      assignmentFindByPkResult: { id: 1201, clientId: 42, trainerId: 7 },
    });

    expect(hasDispatcher('assign_client_to_trainer')).toBe(true);

    const result = await dispatch('assign_client_to_trainer', {
      clientId: 42,
      trainerId: 7,
      notes: 'Move client to primary trainer board',
    }, {
      user: { id: 1, role: 'admin' },
      options: { sequelize },
    });

    expect(userFindOne).toHaveBeenCalledTimes(2);
    expect(assignmentFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientId: 42, trainerId: 7, status: 'active' },
      transaction,
    }));
    expect(assignmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'inactive', lastModifiedBy: 1 }),
      expect.objectContaining({
        where: { clientId: 42, status: 'active' },
        transaction,
      })
    );
    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_trainer_assignments'),
      expect.objectContaining({
        replacements: {
          clientId: 42,
          trainerId: 7,
          assignedBy: 1,
          notes: 'Move client to primary trainer board',
        },
        transaction,
      })
    );
    expect(assignmentFindByPk).toHaveBeenCalledWith(1201, { transaction });
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
    expect(JSON.stringify(result)).not.toContain('Hidden Client');
    expect(JSON.stringify(result)).not.toContain('hidden.client@example.com');
    expect(JSON.stringify(result)).not.toContain('Hidden Trainer');
    expect(JSON.stringify(result)).not.toContain('hidden.trainer@example.com');
  });

});
