/**
 * Availability Service - Trainer Availability Logic
 * =================================================
 * Centralized availability rules used by schedule views and conflict checks.
 */

import { Op } from 'sequelize';
import TrainerAvailability from '../models/TrainerAvailability.mjs';
import Session from '../models/Session.mjs';
import logger from '../utils/logger.mjs';

const ACTIVE_SESSION_STATUSES = [
  'available',
  'assigned',
  'requested',
  'scheduled',
  'confirmed',
  'booked',
  'blocked'
];

const DEFAULT_AVAILABILITY_BLOCK = {
  startTime: '06:00',
  endTime: '22:00'
};

const toMinutes = (timeValue) => {
  if (!timeValue) {
    return 0;
  }
  const [hours, minutes] = String(timeValue).split(':');
  return (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);
};

const buildDate = (date, minutes) => {
  const stamp = new Date(date);
  stamp.setHours(0, 0, 0, 0);
  stamp.setMinutes(minutes);
  return stamp;
};

const isDateInRange = (date, from, to) => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;

  if (start) {
    start.setHours(0, 0, 0, 0);
  }
  if (end) {
    end.setHours(0, 0, 0, 0);
  }

  if (start && end) {
    return target >= start && target <= end;
  }
  if (start && !end) {
    return target.getTime() === start.getTime();
  }
  return true;
};

const overlaps = (startMinutes, endMinutes, blockStart, blockEnd) =>
  startMinutes < blockEnd && blockStart < endMinutes;

const normalizeEntry = (entry) => ({
  id: entry.id,
  trainerId: entry.trainerId,
  dayOfWeek: entry.dayOfWeek,
  startTime: entry.startTime,
  endTime: entry.endTime,
  isRecurring: entry.isRecurring,
  isActive: entry.isActive,
  effectiveFrom: entry.effectiveFrom,
  effectiveTo: entry.effectiveTo,
  type: entry.type,
  reason: entry.reason
});

const availabilityService = {
  async getAvailabilityForTrainer(trainerId, date) {
    let records = [];
    try {
      records = await TrainerAvailability.findAll({
        where: { trainerId },
        order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
      });
    } catch (err) {
      // Table might not exist yet - return empty availability
      logger.warn(`Could not fetch trainer availability: ${err.message}`);
      return { recurring: [], overrides: [] };
    }

    const recurring = records.filter((entry) => entry.isRecurring);
    const overrides = records.filter((entry) => !entry.isRecurring);

    const filteredOverrides = date
      ? overrides.filter((entry) => isDateInRange(date, entry.effectiveFrom, entry.effectiveTo))
      : overrides;

    return {
      recurring: recurring.map(normalizeEntry),
      overrides: filteredOverrides.map(normalizeEntry)
    };
  },

  async isTrainerAvailable(trainerId, startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }

    const dayOfWeek = start.getDay();

    // Attempt to fetch trainer availability, default to available on error
    let records = [];
    try {
      records = await TrainerAvailability.findAll({
        where: {
          trainerId,
          dayOfWeek,
          isActive: true
        }
      });
    } catch (err) {
      // Table might not exist - assume trainer is available (optimistic)
      logger.warn(`Could not check trainer availability: ${err.message}`);
      return true;
    }

    const recurring = records.filter((entry) => entry.isRecurring && entry.type === 'available');
    const effectiveRecurring = recurring.length > 0 ? recurring : [DEFAULT_AVAILABILITY_BLOCK];

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    const withinRecurring = effectiveRecurring.some((entry) => {
      const blockStart = toMinutes(entry.startTime);
      const blockEnd = toMinutes(entry.endTime);
      return startMinutes >= blockStart && endMinutes <= blockEnd;
    });

    if (!withinRecurring) {
      return false;
    }

    const overrides = records.filter((entry) =>
      !entry.isRecurring
      && entry.type !== 'available'
      && isDateInRange(start, entry.effectiveFrom, entry.effectiveTo)
    );

    const overrideConflict = overrides.some((entry) => {
      const blockStart = toMinutes(entry.startTime);
      const blockEnd = toMinutes(entry.endTime);
      return overlaps(startMinutes, endMinutes, blockStart, blockEnd);
    });

    return !overrideConflict;
  },

  async getAvailableSlots(trainerId, date, duration = 60) {
    const targetDate = new Date(date);
    if (Number.isNaN(targetDate.getTime())) {
      return [];
    }

    const dayOfWeek = targetDate.getDay();

    // Attempt to fetch trainer availability records, fall back to defaults on error
    let records = [];
    try {
      records = await TrainerAvailability.findAll({
        where: {
          trainerId,
          dayOfWeek,
          isActive: true
        }
      });
    } catch (err) {
      // Table might not exist yet - log and continue with defaults
      logger.warn(`Could not fetch trainer availability (table may not exist): ${err.message}`);
    }

    const recurring = records.filter((entry) => entry.isRecurring && entry.type === 'available');
    const overrides = records.filter((entry) =>
      !entry.isRecurring
      && entry.type !== 'available'
      && isDateInRange(targetDate, entry.effectiveFrom, entry.effectiveTo)
    );

    const availabilityBlocks = recurring.length > 0 ? recurring : [DEFAULT_AVAILABILITY_BLOCK];

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Attempt to fetch existing sessions, fall back to empty array on error
    let sessions = [];
    try {
      sessions = await Session.findAll({
        where: {
          trainerId,
          status: { [Op.in]: ACTIVE_SESSION_STATUSES },
          sessionDate: { [Op.gte]: dayStart, [Op.lte]: dayEnd }
        },
        order: [['sessionDate', 'ASC']]
      });
    } catch (err) {
      logger.warn(`Could not fetch sessions for availability: ${err.message}`);
    }

    const occupiedBlocks = sessions.map((session) => {
      const sessionStart = new Date(session.sessionDate);
      const startMinutes = sessionStart.getHours() * 60 + sessionStart.getMinutes();
      const endMinutes = startMinutes + (session.duration || duration);
      return { startMinutes, endMinutes };
    });

    const overrideBlocks = overrides.map((entry) => ({
      startMinutes: toMinutes(entry.startTime),
      endMinutes: toMinutes(entry.endTime)
    }));

    const slots = [];

    availabilityBlocks.forEach((entry) => {
      const blockStart = toMinutes(entry.startTime);
      const blockEnd = toMinutes(entry.endTime);
      let cursor = blockStart;

      while (cursor + duration <= blockEnd) {
        const slotStart = cursor;
        const slotEnd = cursor + duration;

        const overlapsSession = occupiedBlocks.some((block) =>
          overlaps(slotStart, slotEnd, block.startMinutes, block.endMinutes)
        );

        const overlapsOverride = overrideBlocks.some((block) =>
          overlaps(slotStart, slotEnd, block.startMinutes, block.endMinutes)
        );

        if (!overlapsSession && !overlapsOverride) {
          slots.push({
            startTime: buildDate(targetDate, slotStart).toISOString(),
            endTime: buildDate(targetDate, slotEnd).toISOString()
          });
        }

        cursor += duration;
      }
    });

    return slots;
  },

  async updateWeeklyAvailability(trainerId, scheduleEntries = []) {
    const sanitized = scheduleEntries
      .filter((entry) => entry && Number.isInteger(entry.dayOfWeek))
      .map((entry) => ({
        trainerId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        type: entry.type || 'available',
        isRecurring: true,
        isActive: true
      }));

    await TrainerAvailability.destroy({
      where: {
        trainerId,
        isRecurring: true
      }
    });

    if (sanitized.length === 0) {
      return [];
    }

    return TrainerAvailability.bulkCreate(sanitized, { returning: true });
  },

  async createOverride(trainerId, payload) {
    const startDate = new Date(payload.date);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error('Invalid override date');
    }

    const dayOfWeek = startDate.getDay();
    const effectiveFrom = payload.date;
    const effectiveTo = payload.date;

    return TrainerAvailability.create({
      trainerId,
      dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      type: payload.type || 'blocked',
      reason: payload.reason || null,
      isRecurring: false,
      isActive: true,
      effectiveFrom,
      effectiveTo
    });
  }
};

export default availabilityService;
