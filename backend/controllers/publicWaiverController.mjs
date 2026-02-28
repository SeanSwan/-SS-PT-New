/**
 * Public Waiver Controller — Phase 5W-G
 * =======================================
 * Handles public waiver submission (QR/header flow) and version text retrieval.
 *
 * Endpoints:
 *   GET  /api/public/waivers/versions/current — serve current waiver text for display
 *   POST /api/public/waivers/submit           — submit signed waiver
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §5, §10.1, §12.6/7/8
 */
import { getModel, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

// ── Constants ────────────────────────────────────────────────────

const VALID_ACTIVITY_TYPES = ['HOME_GYM_PT', 'PARK_TRAINING', 'SWIMMING_LESSONS'];
const VALID_PUBLIC_SOURCES = ['qr', 'header_waiver'];
const DOB_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Strict calendar date validation — rejects rollover dates like 2026-02-31.
 * Parses components, constructs a Date, and verifies the components round-trip.
 */
function isValidCalendarDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// ── Shared Helpers ───────────────────────────────────────────────

function resolveDisplayText(version) {
  return version.htmlText || version.markdownText || null;
}

function dedupeVersions(versions) {
  const seen = new Map();
  return versions.filter((v) => {
    const key = `${v.waiverType}:${v.activityType || ''}`;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

const VERSION_ATTRIBUTES = [
  'id', 'waiverType', 'activityType', 'title',
  'htmlText', 'markdownText', 'textHash',
];

// ── GET /versions/current ────────────────────────────────────────

export async function getCurrentWaiverVersions(req, res) {
  try {
    const WaiverVersion = getModel('WaiverVersion');
    const now = new Date();

    const rawVersions = await WaiverVersion.findAll({
      where: {
        retiredAt: null,
        effectiveAt: { [Op.lte]: now },
      },
      attributes: VERSION_ATTRIBUTES,
      order: [['effectiveAt', 'DESC'], ['id', 'DESC']],
    });

    const deduped = dedupeVersions(rawVersions);

    const versions = deduped.map((v) => ({
      id: v.id,
      waiverType: v.waiverType,
      activityType: v.activityType,
      title: v.title,
      displayText: resolveDisplayText(v),
      textHash: v.textHash,
    }));

    return res.status(200).json({ success: true, versions });
  } catch (err) {
    logger.error('getCurrentWaiverVersions error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve waiver versions',
    });
  }
}

// ── POST /submit ─────────────────────────────────────────────────

export async function submitPublicWaiver(req, res) {
  try {
    const {
      fullName,
      dateOfBirth,
      email,
      phone,
      activityTypes,
      signatureData,
      liabilityAccepted,
      aiConsentAccepted,
      mediaConsentAccepted,
      submittedByGuardian,
      guardianName,
      guardianTypedSignature,
      source: rawSource,
    } = req.body;

    // ── Phase A: Validation ──────────────────────────────────

    // A.1 fullName
    const trimmedName = typeof fullName === 'string' ? fullName.trim() : '';
    if (!trimmedName || trimmedName.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required (1-200 characters)',
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // A.2 dateOfBirth — strict calendar validation (rejects rollover like 2026-02-31)
    if (!dateOfBirth || !DOB_REGEX.test(dateOfBirth) || !isValidCalendarDate(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        error: 'Valid date of birth is required (YYYY-MM-DD)',
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // A.3 email or phone
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
    if (!trimmedEmail && !trimmedPhone) {
      return res.status(400).json({
        success: false,
        error: 'At least one of email or phone is required',
        code: 'WAIVER_CONTACT_REQUIRED',
      });
    }

    // A.4 activityTypes
    if (!Array.isArray(activityTypes) || activityTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one activity type is required',
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }
    const invalidTypes = activityTypes.filter((t) => !VALID_ACTIVITY_TYPES.includes(t));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid activity types: ${invalidTypes.join(', ')}`,
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // A.5 signatureData
    if (!signatureData || typeof signatureData !== 'string' || !signatureData.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Signature is required',
        code: 'WAIVER_SIGNATURE_REQUIRED',
      });
    }

    // A.6 liabilityAccepted
    if (liabilityAccepted !== true) {
      return res.status(400).json({
        success: false,
        error: 'Liability acceptance is required',
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // A.7 aiConsentAccepted must be explicit boolean
    if (typeof aiConsentAccepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'AI consent accepted must be a boolean value',
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // A.8 mediaConsentAccepted must be boolean if present
    if (mediaConsentAccepted !== undefined && typeof mediaConsentAccepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Media consent accepted must be a boolean value',
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // A.9 guardian fields
    if (submittedByGuardian) {
      const gName = typeof guardianName === 'string' ? guardianName.trim() : '';
      const gSig = typeof guardianTypedSignature === 'string' ? guardianTypedSignature.trim() : '';
      if (!gName || !gSig) {
        return res.status(400).json({
          success: false,
          error: 'Guardian name and typed signature are required when submitted by guardian',
          code: 'WAIVER_VALIDATION_FAILED',
        });
      }
    }

    // A.10 source (validated client-provided, no referer derivation)
    const source = rawSource || 'qr';
    if (!VALID_PUBLIC_SOURCES.includes(source)) {
      return res.status(400).json({
        success: false,
        error: `Invalid source. Allowed: ${VALID_PUBLIC_SOURCES.join(', ')}`,
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // ── Phase B: Version Resolution ──────────────────────────

    const WaiverVersion = getModel('WaiverVersion');
    const now = new Date();

    const rawVersions = await WaiverVersion.findAll({
      where: {
        retiredAt: null,
        effectiveAt: { [Op.lte]: now },
        [Op.or]: [
          { waiverType: 'core' },
          { waiverType: 'ai_notice' },
          ...activityTypes.map((at) => ({
            waiverType: 'activity_addendum',
            activityType: at,
          })),
        ],
      },
      attributes: VERSION_ATTRIBUTES,
      order: [['effectiveAt', 'DESC'], ['id', 'DESC']],
    });

    const resolvedVersions = dedupeVersions(rawVersions);

    // Check all required types present
    const resolvedTypes = new Set(resolvedVersions.map((v) => v.waiverType));
    const missingTypes = [];
    if (!resolvedTypes.has('core')) missingTypes.push('core');
    if (!resolvedTypes.has('ai_notice')) missingTypes.push('ai_notice');
    for (const at of activityTypes) {
      const hasAddendum = resolvedVersions.some(
        (v) => v.waiverType === 'activity_addendum' && v.activityType === at,
      );
      if (!hasAddendum) missingTypes.push(`activity_addendum:${at}`);
    }

    if (missingTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Required waiver versions not available: ${missingTypes.join(', ')}`,
        code: 'WAIVER_VERSION_UNAVAILABLE',
        missingTypes,
      });
    }

    // Rev 5: Server-side text presence check
    const textMissing = resolvedVersions.filter((v) => resolveDisplayText(v) === null);
    if (textMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Waiver text unavailable for required versions',
        code: 'WAIVER_TEXT_UNAVAILABLE',
        missingTextVersionIds: textMissing.map((v) => v.id),
      });
    }

    // ── Phase C: Transaction ─────────────────────────────────

    const rawId = req.user?.id ? Number(req.user.id) : null;
    const userId = (rawId !== null && Number.isFinite(rawId)) ? rawId : null;
    const status = userId ? 'linked' : 'pending_match';

    const transaction = await sequelize.transaction();

    try {
      const WaiverRecord = getModel('WaiverRecord');
      const WaiverRecordVersion = getModel('WaiverRecordVersion');
      const WaiverConsentFlags = getModel('WaiverConsentFlags');

      // C.1 Create WaiverRecord with evidence metadata
      const record = await WaiverRecord.create({
        userId,
        status,
        fullName: trimmedName,
        dateOfBirth,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        signatureData,
        source,
        submittedByGuardian: !!submittedByGuardian,
        guardianName: submittedByGuardian ? guardianName?.trim() : null,
        guardianTypedSignature: submittedByGuardian ? guardianTypedSignature?.trim() : null,
        metadata: {
          versionTextSnapshots: resolvedVersions.map((v) => ({
            id: v.id,
            textHash: v.textHash,
            displayText: resolveDisplayText(v),
          })),
          versionIds: resolvedVersions.map((v) => v.id),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          source,
          submittedAt: now.toISOString(),
        },
      }, { transaction });

      // C.2 Create WaiverRecordVersion links
      await WaiverRecordVersion.bulkCreate(
        resolvedVersions.map((v) => ({
          waiverRecordId: record.id,
          waiverVersionId: v.id,
          accepted: true,
          acceptedAt: now,
        })),
        { transaction },
      );

      // C.3 Create WaiverConsentFlags
      await WaiverConsentFlags.create({
        waiverRecordId: record.id,
        liabilityAccepted: true,
        aiConsentAccepted,
        mediaConsentAccepted: mediaConsentAccepted ?? false,
        guardianAcknowledged: !!submittedByGuardian,
      }, { transaction });

      // C.4 Deterministic candidate matching (unauthenticated only)
      if (!userId) {
        const User = getModel('User');
        const PendingWaiverMatch = getModel('PendingWaiverMatch');
        const candidates = [];

        if (trimmedEmail) {
          const emailMatches = await User.findAll({
            where: { email: trimmedEmail, dateOfBirth, role: 'client' },
            attributes: ['id'],
            transaction,
          });
          for (const u of emailMatches) {
            candidates.push({
              waiverRecordId: record.id,
              candidateUserId: u.id,
              matchMethod: 'email+dob',
              confidenceScore: 0.9,
            });
          }
        }

        if (trimmedPhone) {
          const phoneMatches = await User.findAll({
            where: { phone: trimmedPhone, dateOfBirth, role: 'client' },
            attributes: ['id'],
            transaction,
          });
          for (const u of phoneMatches) {
            if (!candidates.some((c) => c.candidateUserId === u.id)) {
              candidates.push({
                waiverRecordId: record.id,
                candidateUserId: u.id,
                matchMethod: 'phone+dob',
                confidenceScore: 0.85,
              });
            }
          }
        }

        if (candidates.length > 0) {
          await PendingWaiverMatch.bulkCreate(candidates, { transaction });
        }
      }

      await transaction.commit();

      // ── Phase D: Response ──────────────────────────────────
      return res.status(201).json({
        success: true,
        waiverRecordId: record.id,
        status,
        message: 'Waiver submitted successfully',
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    logger.error('submitPublicWaiver error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit waiver',
    });
  }
}
