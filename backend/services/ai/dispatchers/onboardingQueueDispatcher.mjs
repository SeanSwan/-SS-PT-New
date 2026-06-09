/**
 * Onboarding Queue Dispatcher
 * ===========================
 *
 * PII-safe Swan Coach read command for the admin/trainer orientation queue.
 * Returns counts and IDs only; names and private answers stay out of the LLM path.
 */

import { getAllModels } from '../../../models/index.mjs';
import {
  buildOnboardingQueueEntry,
  buildOnboardingQueueIncludes,
  onboardingQueueEntryMatches,
} from '../../onboardingQueueSummaryService.mjs';

const clampPage = (value) => Math.max(1, Number.parseInt(value, 10) || 1);

const clampLimit = (value) => Math.min(20, Math.max(1, Number.parseInt(value, 10) || 10));

const filterOrNull = (value) => (value && value !== 'all' ? String(value) : null);

const countByQueueStatus = (entries, status) => (
  entries.filter((entry) => entry.queueStatus === status).length
);

const findFirstActionEntry = (entries) => entries.find((entry) => (
  entry.queueStatus !== 'complete' || entry.movementStatus !== 'completed'
));

const buildQueueResult = ({ count, entries, page, limit }) => {
  const firstAction = findFirstActionEntry(entries);

  return {
    totalCount: count,
    returnedCount: entries.length,
    completeCount: countByQueueStatus(entries, 'complete'),
    draftCount: countByQueueStatus(entries, 'draft'),
    notStartedCount: countByQueueStatus(entries, 'not_started'),
    archivedCount: countByQueueStatus(entries, 'archived'),
    movementPendingCount: entries.filter((entry) => entry.movementStatus !== 'completed').length,
    firstActionClientId: firstAction?.userId ?? null,
    page,
    limit,
  };
};

export const dispatchViewOrientationQueue = async (params = {}) => {
  const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements } = getAllModels();
  const page = clampPage(params.page);
  const limit = clampLimit(params.limit);
  const offset = (page - 1) * limit;
  const requestedStatus = filterOrNull(params.status);
  const packageFilter = filterOrNull(params.package);

  const { count, rows: users } = await User.findAndCountAll({
    where: {},
    include: buildOnboardingQueueIncludes({
      ClientOnboardingQuestionnaire,
      ClientBaselineMeasurements,
    }),
    limit,
    offset,
    distinct: true,
  });

  const entries = users
    .map(buildOnboardingQueueEntry)
    .filter((entry) => onboardingQueueEntryMatches(entry, {
      statusFilter: requestedStatus,
      packageFilter,
    }));

  return buildQueueResult({ count, entries, page, limit });
};
