/**
 * ============================================================
 * BLUEPRINT: Encryption Routes — E2EE Key Exchange API
 * ============================================================
 * Purpose:  REST endpoints for E2EE key bundle management.
 *           Clients upload public keys; fetch others' bundles
 *           to establish encrypted sessions.
 * Scope:    Key upload, key fetch, prekey replenishment,
 *           safety number generation, E2EE status.
 * Owner:    Phase 11 — E2EE Encryption
 * ============================================================
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { protect } from '../middleware/auth.mjs';
import { preKeyFetchLimiter } from '../middleware/rateLimiter.mjs';
import {
  uploadKeyBundle,
  fetchKeyBundle,
  getPreKeyCount,
  deactivateE2EE,
  isE2EEEnabled,
  generateSafetyNumber,
} from '../services/encryption/keyStoreService.mjs';
import { isEncryptionEnabled } from '../services/encryption/encryptionService.mjs';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/encryption/status — Check encryption capabilities
// ---------------------------------------------------------------------------
router.get('/status', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const e2eeEnabled = await isE2EEEnabled(userId);
    const preKeyCount = e2eeEnabled ? await getPreKeyCount(userId) : 0;

    res.json({
      serverEncryption: isEncryptionEnabled(),
      e2eeEnabled,
      preKeyCount,
      preKeyThreshold: 10, // Client should replenish below this
    });
  } catch (err) {
    console.error('[E2EE] Status check failed:', err.message);
    res.status(500).json({ error: 'Failed to check encryption status' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/encryption/keys/upload — Upload key bundle + prekeys
// ---------------------------------------------------------------------------
router.post('/keys/upload', protect, [
  body('deviceId').isString().notEmpty(),
  body('identityPublicKey').isString().notEmpty(),
  body('signedPreKeyId').isInt(),
  body('signedPreKeyPublic').isString().notEmpty(),
  body('signedPreKeySignature').isString().notEmpty(),
  body('registrationId').isInt(),
  body('oneTimePreKeys').optional().isArray(),
], async (req, res) => {
  try {
    const userId = req.user.id;
    const bundle = await uploadKeyBundle(userId, req.body);

    res.json({
      success: true,
      bundleId: bundle.id,
      message: 'Key bundle uploaded successfully',
    });
  } catch (err) {
    console.error('[E2EE] Key upload failed:', err.message);
    res.status(500).json({ error: 'Failed to upload key bundle' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/encryption/keys/:userId — Fetch a user's key bundle
// ---------------------------------------------------------------------------
// Rate limited per (actor, target): each fetch CONSUMES one of the target's
// one-time prekeys, so without a limit any authenticated account can drain
// another user's pool. See preKeyFetchLimiter for the sizing rationale.
router.get('/keys/:userId', protect, preKeyFetchLimiter, [
  param('userId').isInt(),
], async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const bundle = await fetchKeyBundle(targetUserId);

    if (!bundle) {
      return res.status(404).json({
        error: 'User has not enabled E2EE or has no key bundle',
      });
    }

    res.json({ bundle });
  } catch (err) {
    console.error('[E2EE] Key fetch failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch key bundle' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/encryption/keys/replenish — Upload more one-time prekeys
// ---------------------------------------------------------------------------
router.post('/keys/replenish', protect, [
  body('deviceId').isString().notEmpty(),
  body('oneTimePreKeys').isArray({ min: 1 }),
], async (req, res) => {
  try {
    const userId = req.user.id;
    const bundle = await uploadKeyBundle(userId, {
      ...req.body,
      // Re-upload existing identity/signed keys (client sends them)
      identityPublicKey: req.body.identityPublicKey,
      signedPreKeyId: req.body.signedPreKeyId,
      signedPreKeyPublic: req.body.signedPreKeyPublic,
      signedPreKeySignature: req.body.signedPreKeySignature,
      registrationId: req.body.registrationId,
    });

    const count = await getPreKeyCount(userId);
    res.json({
      success: true,
      remainingPreKeys: count,
    });
  } catch (err) {
    console.error('[E2EE] Prekey replenish failed:', err.message);
    res.status(500).json({ error: 'Failed to replenish prekeys' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/encryption/prekey-count — Check remaining one-time prekeys
// ---------------------------------------------------------------------------
router.get('/prekey-count', protect, async (req, res) => {
  try {
    const count = await getPreKeyCount(req.user.id);
    res.json({ count, threshold: 10 });
  } catch (err) {
    console.error('[E2EE] Prekey count failed:', err.message);
    res.status(500).json({ error: 'Failed to get prekey count' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/encryption/safety-number/:userId — Generate safety number
// ---------------------------------------------------------------------------
router.get('/safety-number/:userId', protect, [
  param('userId').isInt(),
], async (req, res) => {
  try {
    const myId = req.user.id;
    const theirId = parseInt(req.params.userId, 10);
    const safetyNumber = await generateSafetyNumber(myId, theirId);

    if (!safetyNumber) {
      return res.status(404).json({
        error: 'Both users must have E2EE enabled to generate a safety number',
      });
    }

    res.json({ safetyNumber });
  } catch (err) {
    console.error('[E2EE] Safety number generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate safety number' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/encryption/deactivate — Opt out of E2EE
// ---------------------------------------------------------------------------
router.post('/deactivate', protect, async (req, res) => {
  try {
    await deactivateE2EE(req.user.id);
    res.json({ success: true, message: 'E2EE deactivated' });
  } catch (err) {
    console.error('[E2EE] Deactivation failed:', err.message);
    res.status(500).json({ error: 'Failed to deactivate E2EE' });
  }
});

export default router;
