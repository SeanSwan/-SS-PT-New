/**
 * AI Stream Spike Routes (B1b SPIKE — THROWAWAY)
 * ==============================================
 * PURPOSE: Prove or disprove SSE behavior through Render's reverse proxy
 * before any token-streaming product code is written (Swan Coach plan
 * SWAN-COACH-B1-STREAMING-SPEED-PLAN-2026-06-10.md, B1b gate).
 *
 * Endpoint:
 *   GET /api/ai-chat/stream-spike  — admin-only, kill-switched SSE counter
 *
 * Security posture:
 *   - FAIL-CLOSED: returns 404 unless SWAN_STREAM_SPIKE_ENABLED === 'true'
 *     (env var unset on Render by default — deploying this file is inert).
 *   - protect + adminOnly: only authenticated admins can reach the stream.
 *   - Emits ONLY synthetic counter ticks + timing. No user data, no PII,
 *     no DB access of any kind.
 *
 * What the probe proves:
 *   - Ticks arriving ~INTERVAL_MS apart  => Render proxy passes SSE through;
 *     B1b true streaming is buildable as planned.
 *   - All ticks arriving in one burst at the end => proxy (or a middleware)
 *     buffers; B1b needs a different transport (chunked JSON, websocket).
 *
 * Companion change: core/app.mjs compression filter exempts
 * text/event-stream — compression would otherwise buffer the stream and
 * mask the proxy result.
 *
 * REMOVAL: delete this file + the mount in core/routes.mjs + the env var
 * once the spike verdict is recorded in the B1 plan doc.
 */
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Tunables (env-overridable for tests/ops; hard caps keep the endpoint
// harmless even with a misconfigured env).
const MAX_TICKS = 50;
const MAX_INTERVAL_MS = 2000;

function readSpikeConfig() {
  const ticks = Math.min(
    Math.max(parseInt(process.env.SWAN_STREAM_SPIKE_TICKS ?? '20', 10) || 20, 1),
    MAX_TICKS,
  );
  const intervalMs = Math.min(
    Math.max(parseInt(process.env.SWAN_STREAM_SPIKE_INTERVAL_MS ?? '500', 10) || 500, 10),
    MAX_INTERVAL_MS,
  );
  return { ticks, intervalMs };
}

// Kill switch evaluated per-request so flipping the Render env var (plus
// restart) enables/disables without a code change. Fail-closed: missing
// or any value other than the literal string 'true' => 404, identical to
// an unknown route, even for admins.
function spikeEnabled(_req, res, next) {
  if (process.env.SWAN_STREAM_SPIKE_ENABLED !== 'true') {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
    });
  }
  return next();
}

router.get('/', spikeEnabled, protect, adminOnly, (req, res) => {
  const { ticks, intervalMs } = readSpikeConfig();
  const startedAt = Date.now();

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  // no-transform: tells intermediaries (and our compression filter) not
  // to buffer/recode the stream.
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Disables buffering on nginx-class proxies; harmless elsewhere.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Immediate first byte so the probe can measure time-to-first-byte
  // separately from tick cadence.
  res.write(`: spike-start ${new Date(startedAt).toISOString()}\n\n`);

  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    const payload = JSON.stringify({ tick, elapsedMs: Date.now() - startedAt });
    res.write(`data: ${payload}\n\n`);
    // compression middleware (when engaged) exposes res.flush; with the
    // text/event-stream exemption it is absent — guard either way.
    if (typeof res.flush === 'function') res.flush();

    if (tick >= ticks) {
      clearInterval(timer);
      res.write(`event: done\ndata: ${JSON.stringify({ ticks, totalMs: Date.now() - startedAt })}\n\n`);
      res.end();
      logger.info(`[StreamSpike] completed ${ticks} ticks in ${Date.now() - startedAt}ms for user ${req.user?.id}`);
    }
  }, intervalMs);

  req.on('close', () => {
    clearInterval(timer);
  });
});

export default router;
