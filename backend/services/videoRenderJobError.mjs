/**
 * videoRenderJobError.mjs — the one error type the render-job path throws.
 * ============================================================================
 *
 * Its own module for a mechanical reason: `completeJob` moved out of
 * `videoRenderJobService.mjs` when that file passed the 300-line cap, and both halves
 * throw this. Left where it was, the two files would import each other — a cycle ESM
 * tolerates and readers do not, and one that resolves differently depending on which
 * module the runtime reaches first.
 *
 * `statusCode`, not `status`. A test asserting `{ status: 409 }` passed the wrong shape
 * once and reported the error as unhandled; the name is worth reading before matching on it.
 */

export class VideoRenderJobError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'VideoRenderJobError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
