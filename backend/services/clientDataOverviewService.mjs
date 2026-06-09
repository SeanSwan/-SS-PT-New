/**
 * clientDataOverviewService.mjs
 * =============================
 * Builds the read-only client onboarding overview payload for
 * GET /api/client-data/overview/:userId.
 *
 * Purpose:
 * - Keep overview query orchestration out of the Express route controller.
 * - Preserve the existing client-safe response contract consumed by the
 *   onboarding dashboard hook.
 * - Keep trainer-note counts hidden from client-role requests.
 *
 * Inputs:
 * - Sequelize model registry from getAllModels().
 * - Authorized target user id.
 * - Requester role for trainer-note privacy gating.
 *
 * Outputs:
 * - Plain JSON overview object ready to send as response.overview.
 */

import { buildClientDataOverviewPayload } from './clientDataOverviewPayloadService.mjs';
import { fetchClientDataOverviewRecords } from './clientDataOverviewQueryService.mjs';

export const buildClientDataOverview = async ({ models, targetUserId, requesterRole }) => {
  const records = await fetchClientDataOverviewRecords({ models, targetUserId, requesterRole });

  return buildClientDataOverviewPayload({ targetUserId, ...records });
};
