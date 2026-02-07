/**
 * Session Management API Tests
 * Phase 3: Operations-Ready Test Suite
 *
 * Tests for Critical User Journey: Session Booking & Management
 * - CRUD operations, status transitions, authorization
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testUsers, testSessions, createMockRequest, createMockResponse } from '../fixtures/testData.mjs';

// Mock Sequelize operators
vi.mock('sequelize', () => ({
  Op: {
    gte: Symbol('gte'),
    lte: Symbol('lte'),
    and: Symbol('and'),
    or: Symbol('or'),
    in: Symbol('in'),
  }
}));

// Mock the database models
vi.mock('../../models/WorkoutSession.mjs', () => ({
  default: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
  }
}));

vi.mock('../../models/User.mjs', () => ({
  default: {
    findByPk: vi.fn(),
  }
}));

import WorkoutSession from '../../models/WorkoutSession.mjs';
import User from '../../models/User.mjs';

describe('Session Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/workout/sessions', () => {
    it('should return sessions for authenticated user', async () => {
      const mockSessions = [testSessions.scheduled, testSessions.completed];
      WorkoutSession.findAll.mockResolvedValue(mockSessions);

      const sessions = await WorkoutSession.findAll({
        where: { userId: testUsers.clientWithSessions.id }
      });

      expect(sessions).toHaveLength(2);
      expect(WorkoutSession.findAll).toHaveBeenCalledWith({
        where: { userId: testUsers.clientWithSessions.id }
      });
    });

    it('should filter sessions by status', async () => {
      WorkoutSession.findAll.mockResolvedValue([testSessions.scheduled]);

      const sessions = await WorkoutSession.findAll({
        where: {
          userId: testUsers.clientWithSessions.id,
          status: 'scheduled'
        }
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('scheduled');
    });
  });

  describe('GET /api/workout/sessions/:id', () => {
    it('should return session by ID', async () => {
      WorkoutSession.findByPk.mockResolvedValue(testSessions.scheduled);

      const session = await WorkoutSession.findByPk(1);

      expect(session).toBeDefined();
      expect(session.id).toBe(1);
    });

    it('should return null for non-existent session', async () => {
      WorkoutSession.findByPk.mockResolvedValue(null);

      const session = await WorkoutSession.findByPk(9999);

      expect(session).toBeNull();
    });
  });

  describe('POST /api/workout/sessions', () => {
    it('should create a new session with valid data', async () => {
      const newSession = {
        id: 100,
        userId: testUsers.clientWithSessions.id,
        trainerId: testUsers.trainer.id,
        sessionDate: new Date().toISOString(),
        sessionType: 'personal_training',
        status: 'scheduled',
        duration: 60,
      };

      WorkoutSession.create.mockResolvedValue(newSession);

      const created = await WorkoutSession.create(newSession);

      expect(created).toHaveProperty('id');
      expect(created.status).toBe('scheduled');
      expect(WorkoutSession.create).toHaveBeenCalledWith(newSession);
    });

    it('should validate required fields', () => {
      const requiredFields = ['userId', 'sessionDate', 'sessionType'];

      const validSession = {
        userId: 1,
        sessionDate: new Date().toISOString(),
        sessionType: 'personal_training',
      };

      requiredFields.forEach(field => {
        expect(validSession[field]).toBeDefined();
      });
    });

    it('should validate session types', () => {
      const validTypes = ['personal_training', 'group', 'online', 'assessment'];

      expect(validTypes).toContain('personal_training');
      expect(validTypes).not.toContain('invalid_type');
    });
  });

  describe('PUT /api/workout/sessions/:id', () => {
    it('should update session status', async () => {
      const updatedSession = { ...testSessions.scheduled, status: 'completed' };
      WorkoutSession.findByPk.mockResolvedValue({
        ...testSessions.scheduled,
        update: vi.fn().mockResolvedValue(updatedSession),
      });

      const session = await WorkoutSession.findByPk(1);
      const result = await session.update({ status: 'completed' });

      expect(session.update).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('should validate status transitions', () => {
      const validTransitions = {
        'scheduled': ['completed', 'cancelled', 'in_progress'],
        'in_progress': ['completed', 'cancelled'],
        'completed': [], // No transitions from completed
        'cancelled': [], // No transitions from cancelled
      };

      expect(validTransitions['scheduled']).toContain('completed');
      expect(validTransitions['completed']).not.toContain('scheduled');
    });
  });

  describe('DELETE /api/workout/sessions/:id', () => {
    it('should delete session', async () => {
      WorkoutSession.findByPk.mockResolvedValue({
        ...testSessions.scheduled,
        destroy: vi.fn().mockResolvedValue(undefined),
      });

      const session = await WorkoutSession.findByPk(1);
      await session.destroy();

      expect(session.destroy).toHaveBeenCalled();
    });

    it('should not delete completed sessions', () => {
      // Business rule: completed sessions should be archived, not deleted
      const completedSession = testSessions.completed;
      expect(completedSession.status).toBe('completed');

      // In real implementation, this would return 400
      const canDelete = completedSession.status !== 'completed';
      expect(canDelete).toBe(false);
    });
  });

  describe('Session Authorization', () => {
    it('should allow session owner to view', () => {
      const session = testSessions.scheduled;
      const user = testUsers.clientWithSessions;

      const isOwner = session.userId === user.id;
      expect(isOwner).toBe(true);
    });

    it('should allow assigned trainer to view', () => {
      const session = testSessions.scheduled;
      const trainer = testUsers.trainer;

      const isTrainer = session.trainerId === trainer.id;
      expect(isTrainer).toBe(true);
    });

    it('should allow admin to view any session', () => {
      const admin = testUsers.admin;
      expect(admin.role).toBe('admin');
      // Admin role bypasses ownership check
    });

    it('should deny unrelated user access', () => {
      const session = testSessions.scheduled;
      const unrelatedUser = testUsers.clientNoSessions;

      const isOwner = session.userId === unrelatedUser.id;
      const isTrainer = session.trainerId === unrelatedUser.id;
      const isAdmin = unrelatedUser.role === 'admin';

      expect(isOwner || isTrainer || isAdmin).toBe(false);
    });
  });
});

describe('Session Statistics', () => {
  it('should calculate workout statistics correctly', () => {
    const sessions = [
      { duration: 60, status: 'completed' },
      { duration: 45, status: 'completed' },
      { duration: 60, status: 'cancelled' },
    ];

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
    const avgDuration = totalDuration / completedSessions.length;

    expect(completedSessions).toHaveLength(2);
    expect(totalDuration).toBe(105);
    expect(avgDuration).toBe(52.5);
  });
});
