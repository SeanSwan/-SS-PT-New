/**
 * ============================================================================
 * FILE: contentStudioRoutes.mjs
 * PURPOSE: API routes for Content Studio service configuration
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 */

import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { loadContentStudioCoveragePayload } from '../services/contentStudioCoverageService.mjs';
import {
  EMPTY_CONTENT_STUDIO_STORAGE_USAGE,
  loadContentStudioStorageUsage,
} from '../services/contentStudioStorageUsageService.mjs';

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
// Queues a Remotion motion graphics render job
router.post('/render-job', protect, adminOnly, async (req, res) => {
  try {
    const { templateId, branding, clientName, exerciseName, customText } = req.body;
    if (!templateId || !branding) {
      return res.status(400).json({ success: false, error: 'templateId and branding are required' });
    }

    // Validate template ID against known templates
    const validTemplates = [
      'workout-intro', 'exercise-demo-card', 'client-highlight-reel',
      'social-story-promo', 'brand-logo-reveal', 'class-schedule-board',
      'team-intro-carousel', 'nasm-phase-explainer',
    ];
    if (!validTemplates.includes(templateId)) {
      return res.status(400).json({ success: false, error: 'Unknown template ID' });
    }

    // Try to log to VideoJobLog if it exists
    try {
      const { getAllModels } = await import('../models/index.mjs');
      const { VideoJobLog } = getAllModels();
      if (VideoJobLog) {
        await VideoJobLog.create({
          jobType: 'remotion_render',
          status: 'waiting',
          metadata: JSON.stringify({
            templateId,
            branding,
            clientName: clientName || null,
            exerciseName: exerciseName || null,
            customText: customText || null,
            requestedBy: req.user?.id,
          }),
        });
      }
    } catch {
      // VideoJobLog table may not exist — non-fatal
    }

    res.json({
      success: true,
      message: `Render job queued for template "${templateId}"`,
      data: { templateId, status: 'waiting' },
    });
  } catch (err) {
    console.error('[ContentStudio] Render job creation failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to queue render job' });
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
