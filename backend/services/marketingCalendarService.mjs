/**
 * SERVICE: Marketing Calendar
 * ===========================
 * Persists admin Marketing calendar items and reads personal-training
 * sessions only for non-blocking advisory overlap warnings.
 */

import { Op } from 'sequelize';
import MarketingCalendarItem from '../models/MarketingCalendarItem.mjs';
import Session from '../models/Session.mjs';

const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const DEFAULT_DURATION_MINUTES = 30;
const VALID_STATUSES = new Set(['draft', 'scheduled', 'published', 'failed', 'cancelled']);
const VALID_CHANNELS = new Set(['social', 'blog', 'email', 'video', 'local']);
const ACTIVE_TRAINING_STATUSES = ['available', 'assigned', 'requested', 'scheduled', 'confirmed', 'blocked'];

const getPlain = row => (row?.get ? row.get({ plain: true }) : row);

const parseDate = (value, field) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid ISO date`);
  return date;
};

const clampDuration = value => {
  const duration = Number(value || DEFAULT_DURATION_MINUTES);
  if (!Number.isFinite(duration) || duration < 5 || duration > 1440) {
    throw new Error('durationMinutes must be between 5 and 1440');
  }
  return Math.round(duration);
};

const getItemWindow = (item) => {
  const start = parseDate(item.scheduledAt, 'scheduledAt');
  const duration = clampDuration(item.durationMinutes);
  return {
    start,
    end: new Date(start.getTime() + duration * 60000),
    duration,
  };
};

const windowsOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const getSessionEnd = (session) => {
  if (session.endDate) return new Date(session.endDate);
  const duration = Number(session.duration || 60);
  return new Date(new Date(session.sessionDate).getTime() + duration * 60000);
};

const serializeTrainingConflict = (session) => {
  const start = new Date(session.sessionDate);
  const end = getSessionEnd(session);
  return {
    calendar: 'personal_training',
    externalId: String(session.id),
    title: session.isBlocked ? 'Blocked training calendar time' : 'Training calendar item',
    start: start.toISOString(),
    end: end.toISOString(),
    status: session.status,
    trainerId: session.trainerId ?? null,
    userId: session.userId ?? null,
    location: session.location ?? null,
    severity: 'advisory',
    blocksScheduling: false,
  };
};

const serializeItem = (row, advisories = []) => {
  const item = getPlain(row);
  return {
    ...item,
    id: String(item.id),
    scheduledAt: new Date(item.scheduledAt).toISOString(),
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
    failedAt: item.failedAt ? new Date(item.failedAt).toISOString() : null,
    advisories,
  };
};

const sanitizePayload = (payload, userId, existing = {}) => {
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('title is required');

  const scheduledAt = parseDate(payload.scheduledAt ?? existing.scheduledAt, 'scheduledAt');
  const status = payload.status || existing.status || 'draft';
  const channel = payload.channel || existing.channel || 'social';

  if (!VALID_STATUSES.has(status)) throw new Error(`status must be one of: ${Array.from(VALID_STATUSES).join(', ')}`);
  if (!VALID_CHANNELS.has(channel)) throw new Error(`channel must be one of: ${Array.from(VALID_CHANNELS).join(', ')}`);

  return {
    title,
    content: payload.content ?? existing.content ?? null,
    channel,
    platform: payload.platform ?? existing.platform ?? null,
    campaignName: payload.campaignName ?? existing.campaignName ?? null,
    status,
    scheduledAt,
    durationMinutes: clampDuration(payload.durationMinutes ?? existing.durationMinutes),
    timezone: payload.timezone || existing.timezone || DEFAULT_TIMEZONE,
    postizPostId: payload.postizPostId ?? existing.postizPostId ?? null,
    platformAccountIds: Array.isArray(payload.platformAccountIds)
      ? payload.platformAccountIds
      : existing.platformAccountIds || [],
    platformVariants: payload.platformVariants ?? existing.platformVariants ?? {},
    assets: Array.isArray(payload.assets) ? payload.assets : existing.assets || [],
    complianceSnapshot: payload.complianceSnapshot ?? existing.complianceSnapshot ?? {},
    advisoryContext: payload.advisoryContext ?? existing.advisoryContext ?? {},
    updatedBy: userId ?? existing.updatedBy ?? null,
  };
};

export function createMarketingCalendarService({
  CalendarModel = MarketingCalendarItem,
  SessionModel = Session,
} = {}) {
  const findTrainingOverlaps = async ({ scheduledAt, durationMinutes }) => {
    const start = parseDate(scheduledAt, 'scheduledAt');
    const duration = clampDuration(durationMinutes);
    const end = new Date(start.getTime() + duration * 60000);
    const lookback = new Date(start.getTime() - 24 * 60 * 60000);

    const rows = await SessionModel.findAll({
      where: {
        status: { [Op.in]: ACTIVE_TRAINING_STATUSES },
        sessionDate: { [Op.lt]: end },
        [Op.or]: [
          { endDate: { [Op.gt]: start } },
          { endDate: null, sessionDate: { [Op.gte]: lookback } },
        ],
      },
      attributes: ['id', 'sessionDate', 'endDate', 'duration', 'status', 'trainerId', 'userId', 'location', 'isBlocked'],
      order: [['sessionDate', 'ASC']],
    });

    return rows
      .map(getPlain)
      .filter((session) => {
        const sessionStart = new Date(session.sessionDate);
        const sessionEnd = getSessionEnd(session);
        return windowsOverlap(start, end, sessionStart, sessionEnd);
      })
      .map(serializeTrainingConflict);
  };

  const listItems = async ({ start, end } = {}) => {
    const where = {};
    if (start || end) {
      where.scheduledAt = {};
      if (start) where.scheduledAt[Op.gte] = parseDate(start, 'start');
      if (end) where.scheduledAt[Op.lt] = parseDate(end, 'end');
    }

    const rows = await CalendarModel.findAll({ where, order: [['scheduledAt', 'ASC']] });
    return Promise.all(rows.map(async (row) => {
      const item = getPlain(row);
      const advisories = await findTrainingOverlaps(item);
      return serializeItem(item, advisories);
    }));
  };

  const getItem = async (id) => {
    const row = await CalendarModel.findByPk(id);
    if (!row) return null;
    const item = getPlain(row);
    return serializeItem(item, await findTrainingOverlaps(item));
  };

  const createItem = async (payload, { userId } = {}) => {
    const clean = sanitizePayload(payload, userId);
    const row = await CalendarModel.create({ ...clean, createdBy: userId ?? null });
    const item = getPlain(row);
    const advisories = await findTrainingOverlaps(item);
    return { item: serializeItem(item, advisories), advisories };
  };

  const updateItem = async (id, payload, { userId } = {}) => {
    const row = await CalendarModel.findByPk(id);
    if (!row) return null;

    const existing = getPlain(row);
    const clean = sanitizePayload({ ...existing, ...payload }, userId, existing);
    const updated = await row.update(clean);
    const item = getPlain(updated);
    const advisories = await findTrainingOverlaps(item);
    return { item: serializeItem(item, advisories), advisories };
  };

  const deleteItem = async (id) => {
    const row = await CalendarModel.findByPk(id);
    if (!row) return false;
    await row.destroy();
    return true;
  };

  return {
    listItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    findTrainingOverlaps,
  };
}

export default createMarketingCalendarService();
