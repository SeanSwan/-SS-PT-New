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
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { getModel, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { composeWaiverArtifactHtml } from '../services/waivers/waiverArtifactService.mjs';

// ── Constants ────────────────────────────────────────────────────

/**
 * Sanitize admin-authored waiver HTML before it is served to the PUBLIC,
 * unauthenticated waiver page (which renders it via dangerouslySetInnerHTML).
 * Allowlist = the formatting a legal document needs, nothing executable. This
 * strips <script>/<style>/<iframe>, on* handlers, and javascript:/data: URIs,
 * closing the stored-XSS vector (a compromised admin, or any future lower-priv
 * path that can set htmlText, can no longer inject script into every visitor).
 */
const WAIVER_SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'div',
    'ul', 'ol', 'li', 'blockquote', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    '*': ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Neutralize style-based vectors (expression(), url(javascript:...)).
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      'font-weight': [/^(normal|bold|\d{3})$/],
      'font-style': [/^(normal|italic)$/],
      'text-decoration': [/^(none|underline|line-through)$/],
    },
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
  },
};

export function sanitizeWaiverDisplayHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return html;
  return sanitizeHtml(html, WAIVER_SANITIZE_OPTIONS);
}

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

/** Whole-year age at `at` for a validated YYYY-MM-DD date-of-birth string. */
function computeAgeAt(dobStr, at) {
  const [y, m, d] = dobStr.split('-').map(Number);
  let age = at.getFullYear() - y;
  const monthDiff = at.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < d)) age -= 1;
  return age;
}

// ── Shared Helpers ───────────────────────────────────────────────

function resolveDisplayText(version) {
  return version.htmlText || version.markdownText || null;
}

/**
 * Whether the signer accepted a given document type. Required documents are
 * accepted by definition (submit refuses without liabilityAccepted); optional
 * ones carry the signer's actual answer.
 */
function acceptanceForVersionType(waiverType, { aiConsentAccepted, mediaConsentAccepted }) {
  if (waiverType === 'ai_notice') return aiConsentAccepted === true;
  if (waiverType === 'media_release') return mediaConsentAccepted === true;
  return true;
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
  'id', 'waiverType', 'activityType', 'version', 'title',
  'htmlText', 'markdownText', 'textHash', 'effectiveAt', 'changeSummary',
];

/**
 * Bundle identity — sha256 over the sorted (id, textHash) pairs of the active
 * set. The client echoes it on submit; a mismatch means the documents changed
 * between display and signature, which must reject rather than silently
 * snapshot text the signer never saw (SWA-140 / Opus R6).
 */
export function computeBundleHash(versions) {
  const canonical = [...versions]
    .sort((a, b) => a.id - b.id)
    .map((v) => `${v.id}:${v.textHash}`)
    .join('|');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

async function loadActiveVersions(WaiverVersion, now) {
  const rawVersions = await WaiverVersion.findAll({
    where: {
      retiredAt: null,
      effectiveAt: { [Op.lte]: now },
    },
    attributes: VERSION_ATTRIBUTES,
    order: [['effectiveAt', 'DESC'], ['id', 'DESC']],
  });
  return dedupeVersions(rawVersions);
}

// 60s in-process cache — this endpoint is public, unauthenticated, and was
// running an unbounded findAll + sanitize pass on every hit (SWA-140 W3).
// TTL-only invalidation: activation happens via deploy/seeder (process restart).
const VERSIONS_CACHE_TTL_MS = 60 * 1000;
let versionsCache = { payload: null, expiresAt: 0 };

/** Test hook — resets the cache between specs. */
export function __clearVersionsCache() {
  versionsCache = { payload: null, expiresAt: 0 };
}

// ── GET /versions/current ────────────────────────────────────────

export async function getCurrentWaiverVersions(req, res) {
  try {
    if (versionsCache.payload && versionsCache.expiresAt > Date.now()) {
      return res.status(200).json(versionsCache.payload);
    }

    const WaiverVersion = getModel('WaiverVersion');
    const now = new Date();
    const deduped = await loadActiveVersions(WaiverVersion, now);

    const versions = deduped.map((v) => ({
      id: v.id,
      waiverType: v.waiverType,
      activityType: v.activityType,
      version: v.version,
      title: v.title,
      // Sanitize the DISPLAY copy — it's rendered as HTML on the public page.
      // (The legal snapshot stored on submit stays verbatim for evidence.)
      displayText: sanitizeWaiverDisplayHtml(resolveDisplayText(v)),
      textHash: v.textHash,
      effectiveAt: v.effectiveAt,
      changeSummary: v.changeSummary ?? null,
    }));

    const payload = { success: true, versions, bundleHash: computeBundleHash(deduped) };
    versionsCache = { payload, expiresAt: Date.now() + VERSIONS_CACHE_TTL_MS };

    return res.status(200).json(payload);
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

    // A.11 Minor policy — DOB is evaluated, not just collected (SWA-140).
    // Under 18: a parent/guardian must be the contracting party (they draw the
    // binding signature) and an emergency contact is required. The guardian
    // checkbox alone was self-declared theater; the fork is now server-enforced.
    const signerAge = computeAgeAt(dateOfBirth, new Date());
    const isMinor = signerAge < 18;
    const {
      emergencyContactName,
      emergencyContactPhone,
      minorAssentName,
      idempotencyKey: rawIdempotencyKey,
      bundleHash: clientBundleHash,
    } = req.body;

    if (isMinor && !submittedByGuardian) {
      return res.status(400).json({
        success: false,
        error: 'Participants under 18 need a parent or legal guardian to sign',
        code: 'WAIVER_GUARDIAN_REQUIRED',
        ageBand: signerAge < 13 ? 'under_13' : '13_17',
      });
    }

    const trimmedEmergencyName = typeof emergencyContactName === 'string' ? emergencyContactName.trim() : '';
    const trimmedEmergencyPhone = typeof emergencyContactPhone === 'string' ? emergencyContactPhone.trim() : '';
    if (isMinor && (!trimmedEmergencyName || !trimmedEmergencyPhone)) {
      return res.status(400).json({
        success: false,
        error: 'An emergency contact name and phone are required for participants under 18',
        code: 'WAIVER_VALIDATION_FAILED',
      });
    }

    // A.12 idempotency key shape (optional; uniqueness enforced by index)
    const idempotencyKey =
      typeof rawIdempotencyKey === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(rawIdempotencyKey.trim())
        ? rawIdempotencyKey.trim()
        : null;

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
          // Optional — present from v2.0 onward. Included so the signer's
          // media decision is recorded against real terms, but never required
          // (a v1.0 database has no media_release row at all).
          { waiverType: 'media_release' },
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

    // B.5 Bundle staleness (SWA-140 / Opus R6): if the client tells us which
    // bundle it DISPLAYED, and the active set has since changed, reject —
    // snapshotting text the signer never saw is evidence corruption, not a
    // submission. Missing hash = older client; accepted and flagged, so a
    // deploy never bricks an in-flight signer (grace documented in blueprint).
    let bundleHashVerified = false;
    if (typeof clientBundleHash === 'string' && clientBundleHash.length > 0) {
      const activeSet = await loadActiveVersions(WaiverVersion, now);
      const currentBundleHash = computeBundleHash(activeSet);
      if (clientBundleHash !== currentBundleHash) {
        return res.status(409).json({
          success: false,
          error: 'The waiver documents were updated while you had the page open. Please review the current version and sign again.',
          code: 'WAIVER_BUNDLE_STALE',
        });
      }
      bundleHashVerified = true;
    }

    // ── Phase C: Transaction ─────────────────────────────────

    const rawId = req.user?.id ? Number(req.user.id) : null;
    const userId = (rawId !== null && Number.isFinite(rawId)) ? rawId : null;
    const status = userId ? 'linked' : 'pending_match';

    const WaiverRecordModel = getModel('WaiverRecord');

    // C.0 Idempotency replay — a double-tap must return the original record,
    // never mint a second legal document (SWA-140 / Opus 6C.1 #2).
    if (idempotencyKey) {
      const existing = await WaiverRecordModel.findOne({ where: { idempotencyKey } });
      if (existing) {
        return res.status(201).json({
          success: true,
          waiverRecordId: existing.id,
          status: existing.status,
          replayed: true,
          message: 'Waiver already submitted',
        });
      }
    }

    const transaction = await sequelize.transaction();

    try {
      const WaiverRecord = WaiverRecordModel;
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
        activityTypes,
        signatureData,
        signedAt: now,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        source,
        submittedByGuardian: !!submittedByGuardian,
        guardianName: submittedByGuardian ? guardianName?.trim() : null,
        guardianTypedSignature: submittedByGuardian ? guardianTypedSignature?.trim() : null,
        participantName: submittedByGuardian ? trimmedName : null,
        emergencyContactName: trimmedEmergencyName || null,
        emergencyContactPhone: trimmedEmergencyPhone || null,
        idempotencyKey,
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
          signerAgeBand: signerAge < 13 ? 'under_13' : (isMinor ? '13_17' : '18_plus'),
          minorAssentName:
            isMinor && typeof minorAssentName === 'string' && minorAssentName.trim()
              ? minorAssentName.trim()
              : null,
          bundleHashVerified,
          clientBundleHash: bundleHashVerified ? clientBundleHash : null,
        },
      }, { transaction });

      // C.2 Create WaiverRecordVersion links.
      // `accepted` is per-document, not blanket-true: an optional document the
      // signer DECLINED must be recorded as shown-and-declined, which is
      // evidence in its own right (SWA-140 — optional consent bundled into a
      // required release is what invalidates the optional consent).
      await WaiverRecordVersion.bulkCreate(
        resolvedVersions.map((v) => ({
          waiverRecordId: record.id,
          waiverVersionId: v.id,
          accepted: acceptanceForVersionType(v.waiverType, {
            aiConsentAccepted,
            mediaConsentAccepted: mediaConsentAccepted ?? false,
          }),
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

      // C.5 Durable signed artifact (SWA-140 / Opus R1) — a self-contained
      // HTML document composed server-side from the exact snapshot, stored
      // with the record so the evidence never depends on a future React
      // bundle re-rendering correctly.
      const artifact = composeWaiverArtifactHtml({
        recordId: record.id,
        fullName: trimmedName,
        dateOfBirth,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        signedAt: now,
        source,
        submittedByGuardian: !!submittedByGuardian,
        guardianName: submittedByGuardian ? guardianName?.trim() : null,
        participantName: submittedByGuardian ? trimmedName : null,
        emergencyContactName: trimmedEmergencyName || null,
        emergencyContactPhone: trimmedEmergencyPhone || null,
        signatureData,
        consents: {
          liabilityAccepted: true,
          aiConsentAccepted,
          mediaConsentAccepted: mediaConsentAccepted ?? false,
          guardianAcknowledged: !!submittedByGuardian,
        },
        versions: resolvedVersions.map((v) => ({
          id: v.id,
          waiverType: v.waiverType,
          activityType: v.activityType,
          version: v.version,
          title: v.title,
          textHash: v.textHash,
          effectiveAt: v.effectiveAt,
          displayText: resolveDisplayText(v),
        })),
      });

      await record.update(
        { metadata: { ...record.metadata, artifactSha256: artifact.sha256, artifactHtml: artifact.html } },
        { transaction },
      );

      await transaction.commit();

      // ── Phase D: Response ──────────────────────────────────
      return res.status(201).json({
        success: true,
        waiverRecordId: record.id,
        status,
        message: 'Waiver submitted successfully',
        signedAt: now.toISOString(),
        signedSummary: resolvedVersions.map((v) => ({
          id: v.id,
          title: v.title,
          version: v.version,
          waiverType: v.waiverType,
          activityType: v.activityType,
        })),
        artifactHtml: artifact.html,
        artifactSha256: artifact.sha256,
      });
    } catch (err) {
      await transaction.rollback();
      // Idempotency race: two in-flight submits with the same key — the loser
      // of the unique-index race replays the winner instead of failing.
      if (idempotencyKey && err?.name === 'SequelizeUniqueConstraintError') {
        const existing = await getModel('WaiverRecord').findOne({ where: { idempotencyKey } });
        if (existing) {
          return res.status(201).json({
            success: true,
            waiverRecordId: existing.id,
            status: existing.status,
            replayed: true,
            message: 'Waiver already submitted',
          });
        }
      }
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
