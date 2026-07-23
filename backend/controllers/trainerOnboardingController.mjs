/**
 * Trainer Onboarding Controller — self-serve trainer application + contract e-sign.
 * ============================================================================
 * Endpoints (all under /api/trainer-onboarding, all require an authenticated user):
 *   GET  /contract            — serve current trainer agreement text + consents (draft v1)
 *   GET  /status              — the current user's latest application status (or none)
 *   POST /credentials         — upload a COI / certification file to R2, returns a key
 *   POST /apply               — submit the signed application (fail-closed: pending_review)
 *
 * FAIL-CLOSED: submitting creates a TrainerApplication with status 'pending_review'.
 * It grants NO trainer capability. An admin verifies insurance + certs and approves
 * separately. Stripe Connect payout wiring is a SEPARATE future slice.
 *
 * PRIVACY (rule 8): no SSN/EIN/bank details are accepted here (those go to Stripe's
 * embedded onboarding in the future slice). Files go to R2 by key, not stored inline.
 *
 * @module controllers/trainerOnboardingController
 */
import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { getCurrentContract, CURRENT_CONTRACT_VERSION, CONTRACT_CONSENTS, contractTextHash } from '../config/trainerContract.mjs';
import { uploadPhoto } from '../services/photoStorageService.mjs';

const ALL_CONSENT_KEYS = CONTRACT_CONSENTS.map((c) => c.key);
const REQUIRED_CONSENT_KEYS = CONTRACT_CONSENTS.filter((c) => c.required).map((c) => c.key);
const NON_REAPPLY_STATUSES = ['pending_review', 'approved', 'suspended'];

/** GET /contract — current agreement text for display + the consent checklist. */
export async function getContract(req, res) {
  return res.json({ success: true, contract: getCurrentContract() });
}

/** GET /status — the authenticated user's latest application (status only surface). */
export async function getMyApplicationStatus(req, res) {
  try {
    const TrainerApplication = getModel('TrainerApplication');
    const app = await TrainerApplication.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'status', 'contractVersion', 'signedAt', 'reviewedAt', 'reviewNotes', 'createdAt'],
    });
    return res.json({ success: true, application: app || null });
  } catch (err) {
    logger.error('[trainerOnboarding] status error:', err);
    return res.status(500).json({ success: false, message: 'Could not load application status.' });
  }
}

/**
 * POST /credentials — upload a COI or certification document to R2.
 * Multipart: field 'file' (validated by multer in the route). Returns an R2 key only.
 */
export async function uploadCredential(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const kind = req.body?.kind === 'insurance' ? 'insurance' : 'certification';
    const result = await uploadPhoto(req.file.buffer, {
      userId: req.user.id,
      category: 'trainer-credentials',
      originalFilename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    // photoStorageService.uploadPhoto returns { url, storageKey, storage } (r2 or local).
    const key = result?.storageKey || null;
    if (!key) {
      logger.error('[trainerOnboarding] upload returned no storageKey', { result: Object.keys(result || {}) });
      return res.status(502).json({ success: false, message: 'Upload storage did not return a reference.' });
    }
    return res.json({ success: true, kind, key });
  } catch (err) {
    logger.error('[trainerOnboarding] credential upload error:', err);
    return res.status(500).json({ success: false, message: 'Upload failed. Please try again.' });
  }
}

function isValidDateOnly(v) {
  if (v == null || v === '') return true; // optional
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * POST /apply — submit the signed trainer application. Fail-closed → pending_review.
 */
export async function submitApplication(req, res) {
  try {
    const TrainerApplication = getModel('TrainerApplication');
    const userId = req.user.id;
    const b = req.body || {};

    // Accept only file keys the upload endpoint (POST /credentials) could have produced
    // for the trainer-credentials category. In R2 mode keys are user-scoped
    // (photos/trainer-credentials/<userId>/...) — enforce THIS user's segment to block a
    // caller from attaching another user's file by posting its key (IDOR). In local-disk
    // fallback keys are /uploads/trainer-credentials/... (not user-scoped by the service),
    // so we can only constrain them to the category namespace. Anything else → null.
    const r2Prefix = `photos/trainer-credentials/${userId}/`;
    const localPrefix = `/uploads/trainer-credentials/`;
    const safeKey = (k) => {
      if (typeof k !== 'string') return null;
      if (k.startsWith(r2Prefix)) return k;
      if (k.startsWith(localPrefix) && !k.includes('..')) return k;
      return null;
    };

    // ── Block duplicate/active applications ──
    const existing = await TrainerApplication.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
    if (existing && NON_REAPPLY_STATUSES.includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: `You already have an application (${existing.status}). You can't submit another right now.`,
      });
    }

    // ── Required core fields ──
    const fullName = typeof b.fullName === 'string' ? b.fullName.trim() : '';
    const email = typeof b.email === 'string' ? b.email.trim() : '';
    if (!fullName) return res.status(400).json({ success: false, message: 'Full name is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required.' });
    }

    // ── Contract version must match the current one (prevents stale-text signing) ──
    if (b.contractVersion !== CURRENT_CONTRACT_VERSION) {
      return res.status(409).json({
        success: false,
        message: 'The agreement was updated. Please reload and review the current version before signing.',
        currentVersion: CURRENT_CONTRACT_VERSION,
      });
    }

    // ── Signature required ──
    const signatureData = typeof b.signatureData === 'string' ? b.signatureData : '';
    if (!signatureData.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'A drawn signature is required.' });
    }
    // Cap signature size (~250KB base64) to prevent oversized payloads.
    if (signatureData.length > 250_000) {
      return res.status(413).json({ success: false, message: 'Signature image is too large.' });
    }

    // ── All required consents must be affirmatively true ──
    const rawConsents = (b.consentFlags && typeof b.consentFlags === 'object') ? b.consentFlags : {};
    const missing = REQUIRED_CONSENT_KEYS.filter((k) => rawConsents[k] !== true);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: 'Please agree to all required terms before signing.',
        missingConsents: missing,
      });
    }
    // Store ONLY known consent keys as booleans — never persist attacker-supplied extra
    // keys/values into the JSONB evidence record (keeps the signed-consent record clean + tamper-resistant).
    const consentFlags = Object.fromEntries(ALL_CONSENT_KEYS.map((k) => [k, rawConsents[k] === true]));

    // ── Validate optional date fields ──
    for (const f of ['certificationExpiry', 'cprAedExpiry', 'insuranceExpiry']) {
      if (!isValidDateOnly(b[f])) {
        return res.status(400).json({ success: false, message: `Invalid date for ${f}.` });
      }
    }

    // ── Create the application (fail-closed pending_review) ──
    const application = await TrainerApplication.create({
      userId,
      fullName,
      email,
      phone: typeof b.phone === 'string' ? b.phone.trim() || null : null,
      businessName: typeof b.businessName === 'string' ? b.businessName.trim() || null : null,
      specialties: typeof b.specialties === 'string' ? b.specialties.trim() || null : null,
      bio: typeof b.bio === 'string' ? b.bio.trim() || null : null,
      yearsExperience: Number.isInteger(b.yearsExperience) ? b.yearsExperience : null,
      primaryCertification: typeof b.primaryCertification === 'string' ? b.primaryCertification.trim() || null : null,
      certificationNumber: typeof b.certificationNumber === 'string' ? b.certificationNumber.trim() || null : null,
      certificationExpiry: b.certificationExpiry || null,
      cprAedExpiry: b.cprAedExpiry || null,
      certificationFileKey: safeKey(b.certificationFileKey),
      insuranceCarrier: typeof b.insuranceCarrier === 'string' ? b.insuranceCarrier.trim() || null : null,
      insurancePolicyNumber: typeof b.insurancePolicyNumber === 'string' ? b.insurancePolicyNumber.trim() || null : null,
      insuranceExpiry: b.insuranceExpiry || null,
      insuranceFileKey: safeKey(b.insuranceFileKey),
      additionalInsuredAttested: consentFlags.selfInsure === true,
      contractVersion: CURRENT_CONTRACT_VERSION,
      signatureData,
      signedAt: new Date(),
      // req.ip is the proxy-aware client IP ('trust proxy' is set app-wide in core/app.mjs).
      // Do NOT fall back to the raw x-forwarded-for header — it's client-spoofable and would
      // corrupt this legal e-signature evidence field.
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      consentFlags,
      // v1 is independent-trainer only (15% fee). When the trainer-TYPE branch lands (SWA-62
      // Part 1), this must be derived from the chosen type — affiliated ≠ 15%. Do NOT keep
      // this literal once the type split ships.
      platformFeePercent: 15.0,
      status: 'pending_review',
      metadata: {
        contractTextHash: contractTextHash(),
        submittedAt: new Date().toISOString(),
        source: 'in_app',
        isDraftContract: true,
      },
    });

    logger.info(`[trainerOnboarding] application ${application.id} submitted by user ${userId} (pending_review)`);

    return res.status(201).json({
      success: true,
      message: "Application received. We'll verify your insurance and certifications, then activate your trainer account.",
      application: { id: application.id, status: application.status },
    });
  } catch (err) {
    // Lost race on the partial-unique "one active application per user" index → clean 409, not 500.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: "You already have an application in progress. You can't submit another right now.",
      });
    }
    logger.error('[trainerOnboarding] submit error:', err);
    return res.status(500).json({ success: false, message: 'Could not submit your application. Please try again.' });
  }
}
