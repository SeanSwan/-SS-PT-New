/**
 * Swan Coach Schedule Write Dispatchers
 * =====================================
 *
 * Wires trainer/admin voice/text scheduling commands to the same Session model
 * used by the Universal Master Schedule. These handlers intentionally create or
 * move schedule records only; they do not deduct paid sessions. Deduction stays
 * with attendance, cancellation, and workout logging policy.
 */

import { Op } from 'sequelize';
import { getSession, getUser } from '../../../models/index.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const WRITABLE_STATUSES = ['scheduled', 'confirmed'];

function assertTrainerOrAdmin(ctx) {
  if (!['admin', 'trainer'].includes(ctx?.user?.role)) {
    throw new Error('Admin or trainer privileges required');
  }
}

function buildDateTime(date, time) {
  const value = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid date/time: ${date} ${time}`);
  }
  return value;
}

function clampDuration(duration) {
  const value = Number(duration || 60);
  if (!Number.isFinite(value) || value < 15 || value > 180) {
    throw new Error('Duration must be between 15 and 180 minutes');
  }
  return value;
}

function dayBounds(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  return { start, end };
}

async function resolveClient(clientId) {
  const User = getUser();
  const client = await User.findByPk(clientId, {
    attributes: ['id', 'firstName', 'lastName', 'clientSource']
  });

  if (!client) {
    throw new Error(`Client ${clientId} not found`);
  }

  return client;
}

async function resolveTrainer(trainerId) {
  if (!trainerId) return null;

  const User = getUser();
  const trainer = await User.findByPk(trainerId, {
    attributes: ['id', 'role']
  });

  if (!trainer || !['trainer', 'admin'].includes(trainer.role)) {
    throw new Error(`Trainer ${trainerId} not found`);
  }

  return trainer.id;
}

async function assertNoScheduleConflict(Session, { clientId, trainerId, sessionDate, endDate, excludeSessionId = null }) {
  const overlapWindow = {
    status: { [Op.in]: WRITABLE_STATUSES },
    [Op.and]: [
      { sessionDate: { [Op.lt]: endDate } },
      { endDate: { [Op.gt]: sessionDate } }
    ]
  };
  const selfExclusion = excludeSessionId ? { id: { [Op.ne]: excludeSessionId } } : {};

  const clientConflicts = await Session.count({
    where: {
      ...overlapWindow,
      ...selfExclusion,
      userId: clientId
    }
  });

  if (clientConflicts > 0) {
    throw new Error('Client double-booking conflict detected');
  }

  if (!trainerId) return;

  const trainerConflicts = await Session.count({
    where: {
      ...overlapWindow,
      ...selfExclusion,
      trainerId
    }
  });

  if (trainerConflicts > 0) {
    throw new Error('Trainer double-booking conflict detected');
  }
}

export async function dispatchScheduleSession(params, ctx) {
  assertTrainerOrAdmin(ctx);

  const client = await resolveClient(resolveCommandClientId(params, ctx));
  const Session = getSession();
  const sessionDate = buildDateTime(params.date, params.time);
  const duration = clampDuration(params.duration);
  const endDate = new Date(sessionDate.getTime() + duration * 60000);
  const trainerId = ctx.user.role === 'trainer'
    ? ctx.user.id
    : await resolveTrainer(params.trainerId);

  await assertNoScheduleConflict(Session, {
    clientId: client.id,
    trainerId,
    sessionDate,
    endDate
  });

  const session = await Session.create({
    userId: client.id,
    trainerId,
    sessionDate,
    endDate,
    duration,
    status: 'scheduled',
    location: 'Main Studio',
    notes: params.notes || null,
    notifyClient: true
  });

  return {
    sessionId: session.id,
    clientId: client.id,
    trainerId: session.trainerId || null,
    status: session.status,
    date: sessionDate.toISOString().slice(0, 10),
    time: sessionDate.toISOString().slice(11, 16),
    duration
  };
}

export async function dispatchRescheduleSession(params, ctx) {
  assertTrainerOrAdmin(ctx);

  const client = await resolveClient(resolveCommandClientId(params, ctx));
  const Session = getSession();
  const { start, end } = dayBounds(params.originalDate);

  const matches = await Session.findAll({
    where: {
      userId: client.id,
      status: { [Op.in]: WRITABLE_STATUSES },
      sessionDate: { [Op.between]: [start, end] },
      ...(ctx.user.role === 'trainer' ? { trainerId: ctx.user.id } : {})
    },
    attributes: ['id', 'sessionDate', 'endDate', 'duration', 'status', 'trainerId'],
    order: [['sessionDate', 'ASC']]
  });

  if (matches.length === 0) {
    throw new Error(`No scheduled session found for client ${client.id} on ${params.originalDate}`);
  }

  if (matches.length > 1) {
    throw new Error(`Multiple sessions found for client ${client.id} on ${params.originalDate}; specify the session manually`);
  }

  const session = matches[0];
  const duration = clampDuration(session.duration || 60);
  const newStart = buildDateTime(params.newDate, params.newTime);
  const newEnd = new Date(newStart.getTime() + duration * 60000);

  await assertNoScheduleConflict(Session, {
    clientId: client.id,
    trainerId: session.trainerId || null,
    sessionDate: newStart,
    endDate: newEnd,
    excludeSessionId: session.id
  });

  session.sessionDate = newStart;
  session.endDate = newEnd;
  await session.save();

  return {
    sessionId: session.id,
    clientId: client.id,
    trainerId: session.trainerId || null,
    status: session.status,
    oldDate: params.originalDate,
    newDate: newStart.toISOString().slice(0, 10),
    newTime: newStart.toISOString().slice(11, 16),
    duration
  };
}
