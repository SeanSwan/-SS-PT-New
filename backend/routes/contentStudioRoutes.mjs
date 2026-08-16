/**
 * ============================================================================
 * FILE: contentStudioRoutes.mjs
 * PURPOSE: API routes for Content Studio service configuration
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 */

import { Router } from 'express';
import { createHash } from 'node:crypto';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { loadContentStudioCoveragePayload } from '../services/contentStudioCoverageService.mjs';
import {
  EMPTY_CONTENT_STUDIO_STORAGE_USAGE,
  loadContentStudioStorageUsage,
} from '../services/contentStudioStorageUsageService.mjs';
import { createJob, getJob, getAssetProvenance, VideoRenderJobError } from '../services/videoRenderJobService.mjs';
import { workerPresence, describePresence } from '../services/renderWorkerPresence.mjs';

const router = Router();

// ─── GET /api/content-studio/service-status ─────────────────
// Returns which external services have API keys configured
router.get('/service-status', protect, adminOnly, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        remotion: true, // Always available (built-in)
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        blotato: !!process.env.BLOTATO_API_KEY,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check service status' });
  }
});

// ─── PUT /api/content-studio/api-keys ───────────────────────
// Saves API keys to environment (in production, these would go to a
// secrets manager; for now they're stored in the DB or .env)
router.put('/api-keys', protect, adminOnly, async (req, res) => {
  try {
    const { keys } = req.body;
    if (!keys || typeof keys !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid keys payload' });
    }

    const validKeys = ['elevenlabs', 'blotato'];
    const envMap = {
      elevenlabs: 'ELEVENLABS_API_KEY',
      blotato: 'BLOTATO_API_KEY',
    };

    const updated = [];
    for (const [key, value] of Object.entries(keys)) {
      if (validKeys.includes(key) && typeof value === 'string' && value.trim()) {
        // Set in process.env for immediate use (persists until restart)
        process.env[envMap[key]] = value.trim();
        updated.push(key);
      }
    }

    res.json({
      success: true,
      message: `Updated ${updated.length} API key(s): ${updated.join(', ')}`,
      data: {
        remotion: true,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        blotato: !!process.env.BLOTATO_API_KEY,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save API keys' });
  }
});

// ─── GET /api/content-studio/coverage ────────────────────────
// Returns exercise-to-video coverage statistics for the tracker
router.get('/coverage', protect, adminOnly, async (req, res) => {
  try {
    const { getAllModels } = await import('../models/index.mjs');
    const models = getAllModels();
    const { Exercise, VideoCatalog } = models;

    if (!Exercise) {
      return res.status(500).json({ success: false, error: 'Exercise model not available' });
    }

    const data = await loadContentStudioCoveragePayload({ Exercise, VideoCatalog });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('[ContentStudio] Coverage query failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch coverage data' });
  }
});

// GET /api/content-studio/storage-usage
// Returns the admin Content Studio R2 usage estimate used by the storage meter.
router.get('/storage-usage', protect, adminOnly, async (req, res) => {
  try {
    const data = await loadContentStudioStorageUsage();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ContentStudio] Storage usage query failed:', err.message);
    res.json({
      success: true,
      data: { ...EMPTY_CONTENT_STUDIO_STORAGE_USAGE },
    });
  }
});

// ─── POST /api/content-studio/render-job ──────────────────
// Queues a motion-graphics render job onto the real worker queue.
//
// WHAT THIS USED TO DO, AND WHY IT WAS REPLACED: it validated a template id, made a
// best-effort write to VideoJobLog, and returned `success: true, status: 'waiting'`.
// Nothing rendered. No row entered `video_render_jobs`, so no worker could ever lease
// it — the operator was told work had started and waited forever. Same defect class as
// the marketing publisher that "reported success when every platform failed".
//
// It now creates a real leasable job AND reports whether a worker is actually online,
// because a real row in a queue with no worker is the same false promise in better
// clothing. Safe to change the contract: repo-wide grep found NO caller of this path
// in `frontend/src` at the time of the change.
const VALID_TEMPLATES = [
  'workout-intro', 'exercise-demo-card', 'client-highlight-reel',
  'social-story-promo', 'brand-logo-reveal', 'class-schedule-board',
  'team-intro-carousel', 'nasm-phase-explainer',
];

/**
 * Window over which a DERIVED (header-less) idempotency key stays stable. Long enough to
 * swallow a double-click and an impatient retry; short enough that a deliberate
 * re-render minutes later is a new job rather than a permanent replay.
 */
const DERIVED_KEY_BUCKET_MS = 60 * 1000;

router.post('/render-job', protect, adminOnly, async (req, res) => {
  try {
    const { templateId, branding, clientName, exerciseName, customText } = req.body || {};
    if (!templateId || !branding) {
      return res.status(400).json({ success: false, error: 'templateId and branding are required' });
    }
    if (!VALID_TEMPLATES.includes(templateId)) {
      return res.status(400).json({ success: false, error: 'Unknown template ID' });
    }

    // Idempotency is required by the queue: without it, a double-click is two renders
    // and two GPU-minutes. Prefer the client's own key; derive one only as a safety net
    // for callers that send none.
    //
    // THE DERIVED KEY IS TIME-BUCKETED, and that bucket is load-bearing. `createJob`
    // matches on {userId, idempotencyKey} with NO time bound, so a purely
    // content-derived key would return the first job FOREVER: the operator could never
    // deliberately re-render the same template, and — worse — could never retry after a
    // FAILED render, because the replay hands back the failed row. Idempotency without a
    // window quietly becomes "you may render this once, ever".
    //
    // A bucket restores the intent: collapse the double-submit (which happens in
    // seconds) without locking the input combination for life. Two clicks straddling a
    // bucket edge produce two jobs — the safe direction to be wrong, since one extra
    // render beats a permanent lockout.
    const headerKey = req.get('Idempotency-Key');
    const bucket = Math.floor(Date.now() / DERIVED_KEY_BUCKET_MS);
    const idempotencyKey = (typeof headerKey === 'string' && headerKey.trim())
      ? headerKey.trim()
      : createHash('sha256').update(JSON.stringify({
        u: req.user?.id, templateId, branding, clientName: clientName ?? null,
        exerciseName: exerciseName ?? null, customText: customText ?? null, bucket,
      })).digest('hex').slice(0, 40);

    const requiredCapabilities = ['remotion'];

    const { job, replayed } = await createJob({
      userId: req.user?.id,
      idempotencyKey,
      kind: 'generate',
      workflowId: `remotion:${templateId}`,
      prompt: customText || exerciseName || clientName || templateId,
      params: { templateId, branding, clientName: clientName ?? null, exerciseName: exerciseName ?? null, customText: customText ?? null },
      requiredCapabilities,
    });

    // The honesty half of this endpoint. Never say "queued" in a way that implies
    // motion when nothing is listening.
    const presence = describePresence(await workerPresence({ requiredCapabilities }));

    return res.status(replayed ? 200 : 202).json({
      success: true,
      message: presence.message,
      data: {
        jobId: job.id,
        status: job.status,
        templateId,
        replayed,
        startable: presence.startable,
        workerState: presence.code,
        statusUrl: `/api/content-studio/render-job/${job.id}`,
      },
    });
  } catch (err) {
    if (err instanceof VideoRenderJobError) {
      return res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
    }
    console.error('[ContentStudio] Render job creation failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to queue render job' });
  }
});

// ─── POST /api/content-studio/sync-job ────────────────────
// Queues an audio-sync measurement for a camera/recorder pair.
//
// PATHS ARE THE AGENT'S, NOT THE SERVER'S. A Sony A7R IV take is ~15GB; uploading one to
// Render to compute a sub-frame offset is not viable, and the audio never needs to leave
// the machine. So the job carries file paths that the WORKER resolves locally, and only
// the measurement travels back. The server cannot validate these paths — the agent fails
// the job permanently if they do not resolve.
//
// That makes this an admin-only surface by necessity, not just by convention: a caller
// who can queue arbitrary paths gets a file-existence oracle on the operator's machine.
// It reads nothing back except an offset, but the gate belongs here regardless.
//
// `kind` is 'transcode' because the schema's CHECK allows only
// preview|generate|transcode|upscale|interpolate — there is no 'sync'. The job's first
// act genuinely IS an ffmpeg transcode (decode to mono PCM), so the label is defensible
// rather than invented. `kind` is descriptive only: leasing routes on
// required_capabilities and dispatch routes on workflowId. Adding a 'sync' kind is a
// production schema change and is Sean's call, not a side effect of a build loop.
router.post('/sync-job', protect, adminOnly, async (req, res) => {
  try {
    const { referencePath, targetPath, maxOffsetSeconds, sampleRate } = req.body || {};
    if (!referencePath || !targetPath) {
      return res.status(400).json({
        success: false,
        error: 'referencePath and targetPath are required (paths on the render agent\'s machine)',
      });
    }
    if (referencePath === targetPath) {
      // Correlating a file with itself always returns offset 0 at peak 1.0 — a perfect,
      // useless answer that looks like a successful sync.
      return res.status(400).json({ success: false, error: 'referencePath and targetPath must differ' });
    }

    const headerKey = req.get('Idempotency-Key');
    const bucket = Math.floor(Date.now() / DERIVED_KEY_BUCKET_MS);
    const idempotencyKey = (typeof headerKey === 'string' && headerKey.trim())
      ? headerKey.trim()
      : createHash('sha256').update(JSON.stringify({
        u: req.user?.id, referencePath, targetPath, bucket,
      })).digest('hex').slice(0, 40);

    const requiredCapabilities = ['mediasync'];

    const { job, replayed } = await createJob({
      userId: req.user?.id,
      idempotencyKey,
      kind: 'transcode',
      workflowId: 'mediasync:pair',
      prompt: `sync ${referencePath} <-> ${targetPath}`,
      params: {
        referencePath,
        targetPath,
        maxOffsetSeconds: Number(maxOffsetSeconds) || 120,
        sampleRate: Number(sampleRate) || 8000,
      },
      requiredCapabilities,
    });

    const presence = describePresence(await workerPresence({ requiredCapabilities }));

    return res.status(replayed ? 200 : 202).json({
      success: true,
      message: presence.message,
      data: {
        jobId: job.id,
        status: job.status,
        replayed,
        startable: presence.startable,
        workerState: presence.code,
        statusUrl: `/api/content-studio/render-job/${job.id}`,
      },
    });
  } catch (err) {
    if (err instanceof VideoRenderJobError) {
      return res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
    }
    console.error('[ContentStudio] Sync job creation failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to queue sync job' });
  }
});

// ─── GET /api/content-studio/render-job/:id ───────────────
// A queue you cannot poll is a queue that can only be trusted, and trust was the
// original bug. Owner-scoped: a job id must not be a read primitive for other users.
router.get('/render-job/:id', protect, adminOnly, async (req, res) => {
  try {
    const job = await getJob(req.params.id);
    if (!job || String(job.userId) !== String(req.user?.id)) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    const presence = describePresence(
      await workerPresence({ requiredCapabilities: job.requiredCapabilities ?? [] }),
    );
    const prov = await getAssetProvenance(job.id);
    return res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress ?? null,
        errorCode: job.errorCode ?? null,
        errorMessage: job.errorMessage ?? null,
        r2Key: job.r2Key ?? null,
        // The licence requires attribution DISPLAYED wherever H3-derived output appears.
        // It was reaching the server and stopping there, so the UI could not have shown
        // it however carefully it was written. Read from the asset, which is where the
        // frozen record lives.
        attribution: prov?.attribution ?? null,
        provenance: prov
          ? {
            provider: prov.provider ?? null,
            modelVersion: prov.modelVersion ?? null,
            generatedAt: prov.generatedAt ?? null,
            licenceName: prov.licence?.name ?? null,
            // Carried so the UI can say WHAT is restricted. The ambiguous version of
            // this sentence cost this project days.
            licenceRestricts: prov.licence?.restricts ?? null,
            grantRecorded: prov.licence?.grantRecorded ?? null,
          }
          : null,
        // Only meaningful while the job is still waiting; once it is leased or done,
        // worker presence is history, not a prediction.
        startable: job.status === 'queued' ? presence.startable : true,
        workerState: job.status === 'queued' ? presence.code : null,
      },
    });
  } catch (err) {
    console.error('[ContentStudio] Render job status failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to read job status' });
  }
});

// ─── POST /api/content-studio/generate-badge ─────────────────
// Generate a badge image using Gemini's image generation API (Nano Banana II)
router.post('/generate-badge', protect, adminOnly, async (req, res) => {
  try {
    const { prompt, achievementName, style, rarity } = req.body;

    if (!prompt || !achievementName) {
      return res.status(400).json({ success: false, message: 'Prompt and achievement name required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'Gemini API key not configured. Add GEMINI_API_KEY to .env',
      });
    }

    // Use Gemini Flash image generation model
    const model = 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[NanoBanana] Gemini API error:', response.status, errText);
      return res.status(502).json({
        success: false,
        message: `Gemini API returned ${response.status}. Check your API key and quota.`,
      });
    }

    const data = await response.json();

    // Extract image data from Gemini response
    const images = [];
    const candidates = data?.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          // Convert base64 to data URL for frontend display
          const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          images.push(dataUrl);
        }
      }
    }

    if (images.length === 0) {
      return res.json({
        success: false,
        message: 'No images generated. The model may not support image generation with this prompt. Try a different prompt or model.',
      });
    }

    res.json({
      success: true,
      images,
      metadata: { achievementName, style, rarity, model },
    });
  } catch (err) {
    console.error('[NanoBanana] Badge generation failed:', err.message);
    res.status(500).json({ success: false, message: 'Badge generation failed' });
  }
});

// ─── POST /api/content-studio/save-badge ──────────────────────
// Save a generated badge to the local badge manifest
router.post('/save-badge', protect, adminOnly, async (req, res) => {
  try {
    const { achievementName, imageUrl, style, rarity } = req.body;

    if (!achievementName || !imageUrl) {
      return res.status(400).json({ success: false, message: 'Achievement name and image URL required' });
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const badgesDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'badges', 'generated');
    const manifestPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'badges', 'generated-manifest.json');

    // Ensure directory exists
    if (!fs.existsSync(badgesDir)) {
      fs.mkdirSync(badgesDir, { recursive: true });
    }

    // Save image from data URL to file
    const slug = achievementName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    const filename = `${slug}-${style}-${rarity}-${Date.now()}.png`;
    const filePath = path.join(badgesDir, filename);

    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.split(',')[1];
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    }

    // Update manifest
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch { /* start fresh */ }
    }

    if (!manifest.badges) manifest.badges = [];
    manifest.badges.push({
      achievementName,
      style,
      rarity,
      filename,
      path: `/badges/generated/${filename}`,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.id,
    });

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    res.json({
      success: true,
      message: `Badge saved: ${filename}`,
      data: { filename, path: `/badges/generated/${filename}` },
    });
  } catch (err) {
    console.error('[NanoBanana] Badge save failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save badge' });
  }
});

export default router;
