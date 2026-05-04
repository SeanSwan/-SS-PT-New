/**
 * plaudFeatureFlag.mjs
 * =====================
 * First middleware on the PLAUD router. Returns structured 503
 * PLAUD_DISABLED when the feature flag is off, instead of allowing
 * the router to be unmounted (which would 404 generically).
 *
 * Phase 3 Slice 3.5 (2026-05-04). Codex Round 2 HIGH #6 fix.
 *
 * Default: PLAUD_MERGE_ENABLED unset → flag false (ships off).
 * Sean flips to 'true' per environment after the slice 3.1 ffmpeg
 * smoke + R2 bucket smoke + migration apply all pass.
 */
import { randomUUID } from 'node:crypto';

export function plaudFeatureFlag(req, res, next) {
  if (process.env.PLAUD_MERGE_ENABLED !== 'true') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'PLAUD_DISABLED',
        message: 'PLAUD merge feature is not enabled in this environment',
        requestId: req.id || randomUUID(),
      },
    });
  }
  return next();
}

export default plaudFeatureFlag;
