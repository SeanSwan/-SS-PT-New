/**
 * AI Village Routes — 11-Brain Validation System API
 * ====================================================
 * Exposes the AI Village validation orchestrator via REST API.
 * Admin-only access (validation reveals code, security findings).
 *
 * Endpoints:
 *   POST /api/ai-village/run            — Start a new validation run
 *   GET  /api/ai-village/status/:jobId  — Poll validation progress
 *   GET  /api/ai-village/latest         — Get latest report summary
 *   GET  /api/ai-village/latest/:track  — Get specific report track
 *   GET  /api/ai-village/archive        — List archived validation runs
 *   GET  /api/ai-village/archive/:ts    — Get specific archived report
 *   GET  /api/ai-village/archive/:ts/:track — Get specific track from archive
 *   GET  /api/ai-village/health         — Village health check
 *   GET  /api/ai-village/stream/:jobId  — SSE stream for live validation output
 *
 * All routes require authentication + admin role.
 */
import express from 'express';
import logger from '../utils/logger.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  startValidation,
  getValidationStatus,
  getValidationOutput,
  isValidationRunning,
  readLatestReport,
  listArchiveRuns,
  readArchivedReport,
  getVillageHealth,
} from '../services/ai/aiVillageService.mjs';

const router = express.Router();

// All routes require admin access
router.use(protect, adminOnly);

// ── POST /run — Start a new validation ──────────────────────────────────────

router.post('/run', async (req, res) => {
  try {
    const { files, since, staged } = req.body;

    // Validate inputs
    if (files && !Array.isArray(files)) {
      return res.status(400).json({ success: false, error: 'files must be an array of file paths' });
    }
    if (since && typeof since !== 'string') {
      return res.status(400).json({ success: false, error: 'since must be a string (e.g., "2h", "24h")' });
    }
    if (files && files.length > 20) {
      return res.status(400).json({ success: false, error: 'Maximum 20 files per validation run' });
    }

    // Sanitize file paths — prevent directory traversal
    if (files) {
      for (const f of files) {
        if (f.includes('..') || f.startsWith('/') || f.includes('\\..')) {
          return res.status(400).json({ success: false, error: 'Invalid file path detected' });
        }
      }
    }

    const jobId = startValidation({ files, since, staged: !!staged }, req.user.id);

    logger.info('[AIVillage] Validation started via API', {
      jobId,
      userId: req.user.id,
      files: files?.length || 0,
      since,
      staged: !!staged,
    });

    res.json({
      success: true,
      jobId,
      message: `Validation started. Poll /api/ai-village/status/${jobId} for progress.`,
    });
  } catch (err) {
    const status = err.message.includes('already in progress') ? 409 : 500;
    logger.error('[AIVillage] Run route error', { error: err.message });
    res.status(status).json({ success: false, error: err.message });
  }
});

// ── GET /status/:jobId — Poll validation progress ──────────────────────────

router.get('/status/:jobId', (req, res) => {
  const status = getValidationStatus(req.params.jobId);
  if (!status) {
    return res.status(404).json({ success: false, error: 'Validation job not found' });
  }
  res.json({ success: true, ...status });
});

// ── GET /stream/:jobId — SSE stream for live output ─────────────────────────

router.get('/stream/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const status = getValidationStatus(jobId);

  if (!status) {
    return res.status(404).json({ success: false, error: 'Validation job not found' });
  }

  // Set up SSE with Last-Event-ID support for reconnection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Support reconnection via Last-Event-ID header (offset-based)
  const lastEventId = req.headers['last-event-id'];
  let lastOutputLength = lastEventId ? parseInt(lastEventId, 10) || 0 : 0;

  // Poll for new output every 2 seconds (offset-based delta streaming)
  const interval = setInterval(() => {
    const current = getValidationOutput(jobId, lastOutputLength);

    if (!current) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }

    // Send only new output since last offset
    if (current.text) {
      res.write(`id: ${current.totalLength}\ndata: ${JSON.stringify({ type: 'output', text: current.text })}\n\n`);
      lastOutputLength = current.totalLength;
    }

    // Close when done
    if (!current.hasMore) {
      res.write(`data: ${JSON.stringify({
        type: 'done',
        state: current.state,
      })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// ── GET /latest — Get latest validation report ──────────────────────────────

router.get('/latest', (req, res) => {
  try {
    const report = readLatestReport();
    if (!report.summary && Object.keys(report.reports).length === 0) {
      return res.status(404).json({ success: false, error: 'No validation reports found. Run a validation first.' });
    }
    res.json({
      success: true,
      timestamp: report.timestamp,
      summary: report.summary,
      trackCount: Object.keys(report.reports).length,
      tracks: Object.keys(report.reports),
    });
  } catch (err) {
    logger.error('[AIVillage] Latest report error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to read latest report' });
  }
});

// ── GET /latest/:track — Get specific track from latest report ──────────────

router.get('/latest/:track', (req, res) => {
  try {
    const track = req.params.track;

    // Validate track name
    if (!track.endsWith('.md') || track.includes('..') || track.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid track name' });
    }

    const report = readLatestReport(track);
    if (report.error) {
      return res.status(404).json({ success: false, error: report.error });
    }

    const content = report.reports[track];
    if (!content) {
      return res.status(404).json({ success: false, error: `Track not found: ${track}` });
    }

    res.json({
      success: true,
      timestamp: report.timestamp,
      track,
      content,
    });
  } catch (err) {
    logger.error('[AIVillage] Track report error', { error: err.message, track: req.params.track });
    res.status(500).json({ success: false, error: 'Failed to read track report' });
  }
});

// ── GET /archive — List archived validation runs ────────────────────────────

router.get('/archive', (req, res) => {
  try {
    const runs = listArchiveRuns();
    res.json({
      success: true,
      count: runs.length,
      runs,
    });
  } catch (err) {
    logger.error('[AIVillage] Archive list error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to list archive' });
  }
});

// ── GET /archive/:timestamp — Get specific archived report ──────────────────

router.get('/archive/:timestamp', (req, res) => {
  try {
    const report = readArchivedReport(req.params.timestamp);
    if (report.error) {
      return res.status(404).json({ success: false, error: report.error });
    }

    res.json({
      success: true,
      timestamp: report.timestamp,
      trackCount: Object.keys(report.reports).length,
      tracks: Object.keys(report.reports),
    });
  } catch (err) {
    logger.error('[AIVillage] Archive report error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to read archived report' });
  }
});

// ── GET /archive/:timestamp/:track — Get specific track from archive ────────

router.get('/archive/:timestamp/:track', (req, res) => {
  try {
    const { timestamp, track } = req.params;

    if (!track.endsWith('.md') || track.includes('..') || track.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid track name' });
    }

    const report = readArchivedReport(timestamp, track);
    if (report.error) {
      return res.status(404).json({ success: false, error: report.error });
    }

    const content = report.reports[track];
    if (!content) {
      return res.status(404).json({ success: false, error: `Track not found: ${track}` });
    }

    res.json({
      success: true,
      timestamp: report.timestamp,
      track,
      content,
    });
  } catch (err) {
    logger.error('[AIVillage] Archive track error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to read archive track' });
  }
});

// ── GET /health — Village health check ──────────────────────────────────────

router.get('/health', (req, res) => {
  try {
    const health = getVillageHealth();
    res.json({ success: true, ...health });
  } catch (err) {
    logger.error('[AIVillage] Health check error', { error: err.message });
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

export default router;
