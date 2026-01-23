/**
 * ConflictService - Scheduling conflict detection
 * ===============================================
 * Provides conflict checks for trainer/client overlaps and scheduling rules.
 */

import { Op } from 'sequelize';
import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const ACTIVE_STATUSES = ['available', 'assigned', 'requested', 'scheduled', 'confirmed', 'booked', 'blocked'];

const isOverlapping = (start, end, sessionStart, duration = 60) => {
  const sessionEnd = new Date(sessionStart.getTime() + duration * 60000);
  return start < sessionEnd && sessionStart < end;
};

const normalizeSession = (session) => {
  const clientName = session?.client
    ? `${session.client.firstName} ${session.client.lastName}`.trim()
    : undefined;

  return {
    id: session.id,
    sessionDate: session.sessionDate,
    duration: session.duration,
    status: session.status,
    clientName
  };
};

const fetchCandidateSessions = async ({ trainerId, clientId, start, end, excludeSessionId }) => {
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const where = {
    status: { [Op.in]: ACTIVE_STATUSES },
    sessionDate: { [Op.gte]: dayStart, [Op.lte]: dayEnd }
  };

  if (excludeSessionId) {
    where.id = { [Op.ne]: excludeSessionId };
  }

  if (trainerId) {
    where.trainerId = trainerId;
  }

  if (clientId) {
    where.userId = clientId;
  }

  return Session.findAll({
    where,
    include: [
      {
        model: User,
        as: 'client',
        attributes: ['firstName', 'lastName']
      }
    ],
    order: [['sessionDate', 'ASC']]
  });
};

const ConflictService = {
  async checkConflicts({ startTime, endTime, trainerId, clientId, excludeSessionId }) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return [{ type: 'hard', reason: 'Invalid start or end time for conflict check' }];
      }
      if (end <= start) {
        return [{ type: 'hard', reason: 'End time must be after start time' }];
      }

      const conflicts = [];

      if (trainerId) {
        const trainerSessions = await fetchCandidateSessions({
          trainerId,
          start,
          end,
          excludeSessionId
        });

        const trainerConflict = trainerSessions.find((session) =>
          isOverlapping(start, end, new Date(session.sessionDate), session.duration)
        );

        if (trainerConflict) {
          const normalized = normalizeSession(trainerConflict);
          const isBlocked = trainerConflict.isBlocked || trainerConflict.status === 'blocked';
          conflicts.push({
            type: 'hard',
            reason: isBlocked
              ? 'Trainer has blocked time during this slot'
              : `Trainer already has a session at this time${normalized.clientName ? ` with ${normalized.clientName}` : ''}`,
            conflictingSession: normalized,
            suggestion: 'Choose a different time or trainer'
          });
        }
      }

      if (clientId) {
        const clientSessions = await fetchCandidateSessions({
          clientId,
          start,
          end,
          excludeSessionId
        });

        const clientConflict = clientSessions.find((session) =>
          isOverlapping(start, end, new Date(session.sessionDate), session.duration)
        );

        if (clientConflict) {
          conflicts.push({
            type: 'hard',
            reason: 'Client already has a session booked at this time',
            conflictingSession: normalizeSession(clientConflict),
            suggestion: 'Choose a different time'
          });
        }
      }

      const hour = start.getHours();
      if (hour < 6 || hour >= 22) {
        conflicts.push({
          type: 'soft',
          reason: 'Session is outside normal business hours (6 AM - 10 PM)',
          suggestion: 'Consider scheduling during business hours'
        });
      }

      const hoursUntilSession = (start.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSession > 0 && hoursUntilSession < 2) {
        conflicts.push({
          type: 'soft',
          reason: 'Session is less than 2 hours away - short notice',
          suggestion: 'Client may not receive notification in time'
        });
      }

      return conflicts;
    } catch (error) {
      logger.error('[ConflictService] Conflict check failed:', error);
      return [{ type: 'hard', reason: 'Unable to verify conflicts at this time' }];
    }
  },

  async findAlternatives({ date, trainerId, duration = 60, count = 3 }) {
    if (!trainerId) {
      return [];
    }

    const targetDate = new Date(date);
    const dayStart = new Date(targetDate);
    dayStart.setHours(6, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(22, 0, 0, 0);

    const existingSessions = await Session.findAll({
      where: {
        trainerId,
        status: { [Op.in]: ACTIVE_STATUSES },
        sessionDate: { [Op.gte]: dayStart, [Op.lt]: dayEnd }
      },
      order: [['sessionDate', 'ASC']]
    });

    const alternatives = [];
    let cursor = new Date(dayStart);

    existingSessions.forEach((session) => {
      const sessionStart = new Date(session.sessionDate);
      const gapMinutes = (sessionStart.getTime() - cursor.getTime()) / (1000 * 60);
      if (gapMinutes >= duration && alternatives.length < count) {
        alternatives.push({
          date: new Date(cursor),
          hour: cursor.getHours(),
          label: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        });
      }

      const sessionEnd = new Date(sessionStart.getTime() + (session.duration || 60) * 60000);
      if (sessionEnd > cursor) {
        cursor = sessionEnd;
      }
    });

    if (alternatives.length < count && cursor < dayEnd) {
      alternatives.push({
        date: new Date(cursor),
        hour: cursor.getHours(),
        label: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      });
    }

    return alternatives.slice(0, count);
  }
};

export default ConflictService;
