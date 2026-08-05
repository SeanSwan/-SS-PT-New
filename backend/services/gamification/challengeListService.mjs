/**
 * Challenge list query service.
 * Shared by the public challenge list and the Admin/Trainer management list.
 */

import { Op } from 'sequelize';

/** Anonymous callers see a first name and a handle. Never a surname. */
const PUBLIC_PERSON_ATTRIBUTES = Object.freeze(['id', 'firstName', 'username', 'photo']);

const ACTIVE_FILTERS = {
  types: ['daily', 'weekly', 'monthly', 'community', 'custom'],
  categories: ['fitness', 'nutrition', 'social', 'streak', 'dance', 'music', 'art', 'gaming', 'community_meetup'],
  difficulties: [1, 2, 3, 4, 5],
};

const VALID_SORT_FIELDS = ['createdAt', 'startDate', 'endDate', 'title', 'difficulty', 'completionRate', 'currentParticipants'];
const PUBLIC_DISCOVERY_STATUSES = new Set(['active', 'completed']);

const parsePositiveInteger = (value, fallback = null) => {
  const stringValue = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(stringValue)) return fallback;

  return Number(stringValue);
};

const parseBoundedPositiveInteger = (value, fallback, max) =>
  Math.min(parsePositiveInteger(value, fallback), max);

const parseOptionalBoundedPositiveInteger = (value, min, max) => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;

  const parsed = parsePositiveInteger(value);
  if (parsed === null || parsed < min || parsed > max) return null;

  return parsed;
};

const normalizeViewerId = (viewer) => {
  const parsed = Number(viewer?.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : -1;
};

const normalizeStatusFilter = ({ status, defaultStatus, publicOnly }) => {
  const requestedStatus = status ?? defaultStatus;
  if (!publicOnly) return requestedStatus;
  return PUBLIC_DISCOVERY_STATUSES.has(requestedStatus) ? requestedStatus : 'active';
};

export const getChallengeList = async ({ models, query, defaultStatus = 'active', viewer = null, publicOnly = false, now = new Date() } = {}) => {
  const { Challenge, User, ChallengeParticipant } = models;
  const {
    page = 1,
    limit = 20,
    type,
    category,
    difficulty,
    status = defaultStatus,
    featured,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query ?? {};
  const statusFilter = normalizeStatusFilter({ status, defaultStatus, publicOnly });

  const normalizedPage = parsePositiveInteger(page, 1);
  const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);
  const normalizedDifficulty = parseOptionalBoundedPositiveInteger(difficulty, 1, 5);
  const offset = (normalizedPage - 1) * normalizedLimit;
  const whereClause = {};

  if (type && type !== 'all') whereClause.challengeType = type;
  if (category && category !== 'all') whereClause.category = category;
  if (normalizedDifficulty !== null) whereClause.difficulty = normalizedDifficulty;
  if (statusFilter && statusFilter !== 'all') whereClause.status = statusFilter;
  if (publicOnly) whereClause.isPublic = true;
  if (publicOnly && statusFilter === 'active') {
    whereClause.startDate = { [Op.lte]: now };
    whereClause.endDate = { [Op.gte]: now };
  }
  if (featured === 'true') whereClause.isFeatured = true;
  if (viewer?.role === 'trainer') whereClause.createdBy = normalizeViewerId(viewer);

  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { tags: { [Op.contains]: [String(search).toLowerCase()] } },
    ];
  }

  const sortField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const challenges = await Challenge.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'creator',
        // This list is served by a PUBLIC route (no middleware at all), so
        // surnames here reached anonymous callers - worse than the member-only
        // leaks the directory policy was built for. Its sibling
        // GET /challenges/:id already strips them; the two were inconsistent.
        attributes: PUBLIC_PERSON_ATTRIBUTES,
      },
      {
        model: ChallengeParticipant,
        as: 'participants',
        attributes: ['id', 'userId', 'currentProgress', 'progressPercentage', 'status', 'joinedAt'],
        include: [{
          model: User,
          as: 'user',
          attributes: PUBLIC_PERSON_ATTRIBUTES,
        }],
        limit: 5,
      },
    ],
    order: [[sortField, order]],
    limit: normalizedLimit,
    offset,
    distinct: true,
  });

  return {
    challenges: challenges.rows,
    pagination: {
      total: challenges.count,
      page: normalizedPage,
      limit: normalizedLimit,
      pages: Math.ceil(challenges.count / normalizedLimit),
    },
    filters: ACTIVE_FILTERS,
  };
};
