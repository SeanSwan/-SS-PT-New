/**
 * plaudIntakeQueueService.mjs
 * Unified PLAUD intake read model. Combines existing clip rows and merge
 * request rows into one list-safe queue DTO for the Training workspace.
 *
 * This service intentionally does not decrypt merge payloads. Transcript and
 * parsed workout bodies stay behind detail endpoints.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import {
  CLIP_STATUSES,
  filterByScope,
  mapClipRowToIntakeItem,
  mapMergeRowToIntakeItem,
  mergeStatusesForScope,
  normalizeLimit,
  normalizeScope,
  summarizeIntakeItems,
} from './plaudIntakeQueueMappers.mjs';

export async function listPlaudIntakeItems({
  userId,
  scope,
  limit,
  sequelizeOverride = null,
} = {}) {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedScope = normalizeScope(scope);
  const sequelizeToUse = sequelizeOverride || sequelize;
  const queryLimit = normalizedLimit * 2;
  const mergeStatuses = mergeStatusesForScope(normalizedScope);

  const clipRows = await sequelizeToUse.query(
    `SELECT c.clip_id, c.filename_original, c.mimetype, c.size_bytes,
            c.duration_sec, c.r2_mirror_status, c.status, c.uploaded_at,
            c.recorded_at, c.expires_at, c.client_id, c.clip_source,
            u."firstName" AS client_first_name,
            u."lastName" AS client_last_name
     FROM plaud_clips c
     LEFT JOIN "Users" u ON u.id = c.client_id
     WHERE c.user_id = :userId
       AND c.deleted_at IS NULL
       AND c.status IN (:clipStatuses)
     ORDER BY c.uploaded_at DESC, c.clip_id DESC
     LIMIT :queryLimit`,
    {
      replacements: { userId, clipStatuses: CLIP_STATUSES, queryLimit },
      type: QueryTypes.SELECT,
    },
  );

  const mergeRows = await sequelizeToUse.query(
    `SELECT mr.merge_request_id, mr.status, mr.client_id, mr.clip_ids,
            mr.parsed_exercise_count, mr.boundary_warning, mr.error_code,
            mr.payload_cipher IS NOT NULL AS has_cipher,
            mr.cipher_purged_at IS NOT NULL AS cipher_purged,
            mr.created_at, mr.completed_at, mr.expires_at,
            u."firstName" AS client_first_name,
            u."lastName" AS client_last_name
     FROM plaud_merge_requests mr
     LEFT JOIN "Users" u ON u.id = mr.client_id
     WHERE mr.user_id = :userId
       AND mr.status IN (:mergeStatuses)
     ORDER BY mr.created_at DESC
     LIMIT :queryLimit`,
    {
      replacements: { userId, mergeStatuses, queryLimit },
      type: QueryTypes.SELECT,
    },
  );

  const allItems = [
    ...clipRows.map(mapClipRowToIntakeItem),
    ...mergeRows.map(mapMergeRowToIntakeItem),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const scopedItems = filterByScope(allItems, normalizedScope).slice(0, normalizedLimit);
  return {
    items: scopedItems,
    summary: summarizeIntakeItems(allItems),
    scope: normalizedScope,
    limit: normalizedLimit,
  };
}
