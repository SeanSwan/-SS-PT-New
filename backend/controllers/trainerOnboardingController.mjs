/**
 * Trainer Onboarding Controller — self-serve trainer application + contract e-sign.
 * ============================================================================
 * Endpoints (all under /api/trainer-onboarding, all require an authenticated user):
 *   GET  /contract            — serve current trainer agreement text + consents (draft v1)
 *   GET  /status              — the current user's latest application status (or none)
 *   POST /credentials         — encrypt and privately store a COI/certification file
 *   POST /apply               — submit the signed application (fail-closed: pending_review)
 *
 * FAIL-CLOSED: submitting creates a TrainerApplication with status 'pending_review'.
 * It grants NO trainer capability. An admin verifies insurance + certs and approves
 * separately. Stripe Connect payout wiring is a SEPARATE future slice.
 *
 * PRIVACY (rule 8): no SSN/EIN/bank details are accepted here (those go to Stripe's
 * embedded onboarding in the future slice). Credential files are encrypted before
 * private R2 storage and referenced here only by owner-scoped opaque keys.
 *
 * @module controllers/trainerOnboardingController
 */
import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import {
  getCurrentContract,
  CURRENT_CONTRACT_VERSION,
  CONTRACT_CONSENTS,
  contractTextHash,
  contractPackageHash,
} from '../config/trainerContract.mjs';
import {
  CredentialStorageError,
} from '../services/trainerCredentialStorageService.mjs';
import {
  CredentialReceiptError,
  createApplicationWithCredentialReceipts,
  storeTrainerCredentialUpload,
} from '../services/trainerCredentialReceiptService.mjs';
import {
  validateApplicationFields,
  validateSignatureData,
} from '../utils/trainerOnboardingValidation.mjs';

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
      attributes: ['id', 'status', 'contractVersion', 'signedAt', 'reviewedAt', 'createdAt'],
    });
    return res.json({ success: true, application: app || null });
  } catch (err) {
    logger.error('[trainerOnboarding] status error:', err);
    return res.status(500).json({ success: false, message: 'Could not load application status.' });
  }
}

/**
 * POST /credentials — upload a COI or certification document to private storage.
 * Multipart: field 'file' (validated by multer + magic bytes). Returns an opaque key.
 */
export async function uploadCredential(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const requestedKind = req.body?.kind;
    if (requestedKind != null && !['insurance', 'certification'].includes(requestedKind)) {
      return res.status(400).json({ success: false, message: 'Credential kind must be insurance or certification' });
    }
    const kind = requestedKind || 'certification';
    const result = await storeTrainerCredentialUpload(req.file.buffer, {
      userId: req.user.id,
      kind,
      declaredMime: req.file.mimetype,
    });
    const key = result?.storageKey || null;
    if (!key) {
      logger.error('[trainerOnboarding] upload returned no storageKey', { result: Object.keys(result || {}) });
      return res.status(502).json({ success: false, message: 'Upload storage did not return a reference.' });
    }
    return res.json({ success: true, kind, key });
  } catch (err) {
    if (err instanceof CredentialReceiptError || err?.name === 'CredentialReceiptError') {
      const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
      const message = status === 409
        ? 'Pending credential storage is full. Submit your application or wait for old uploads to expire.'
        : status === 400
          ? 'The credential upload was rejected.'
          : 'Private credential storage is temporarily unavailable.';
      return res.status(status).json({ success: false, message });
    }
    if (err instanceof CredentialStorageError || err?.name === 'CredentialStorageError') {
      const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
      const message = status === 400
        ? 'The credential file was rejected. Upload a valid PDF or image.'
        : 'Private credential storage is temporarily unavailable.';
      return res.status(status).json({ success: false, message });
    }
    logger.error('[trainerOnboarding] credential upload error:', err);
    return res.status(500).json({ success: false, message: 'Upload failed. Please try again.' });
  }
}

/**
 * POST /apply — submit the signed trainer application. Fail-closed → pending_review.
 */
export async function submitApplication(req, res) {
  try {
    const TrainerApplication = getModel('TrainerApplication');
    const userId = req.user.id;
    const b = req.body || {};

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

    // ── Normalize and bound every persisted applicant field ──
    const fieldValidation = validateApplicationFields(b);
    if (!fieldValidation.ok) {
      return res.status(fieldValidation.statusCode).json({
        success: false,
        message: fieldValidation.message,
      });
    }
    const fields = fieldValidation.values;

    // ── Contract version must match the current one (prevents stale-text signing) ──
    if (b.contractVersion !== CURRENT_CONTRACT_VERSION) {
      return res.status(409).json({
        success: false,
        message: 'The agreement was updated. Please reload and review the current version before signing.',
        currentVersion: CURRENT_CONTRACT_VERSION,
      });
    }
    const currentContractPackageHash = contractPackageHash();
    if (b.contractPackageHash !== currentContractPackageHash) {
      return res.status(409).json({
        success: false,
        message: 'The agreement contents changed. Please reload and review them before signing.',
        currentVersion: CURRENT_CONTRACT_VERSION,
      });
    }

    // ── Signature required ──
    const signatureValidation = validateSignatureData(b.signatureData);
    if (!signatureValidation.ok) {
      return res.status(signatureValidation.statusCode).json({
        success: false,
        message: signatureValidation.message,
      });
    }
    const signatureData = signatureValidation.value;

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

    // ── Normalize keys; durable receipt ownership/kind/existence is checked atomically below ──
    const credentialKeys = {};
    for (const field of ['certificationFileKey', 'insuranceFileKey']) {
      const key = b[field];
      if (key == null || key === '') {
        credentialKeys[field] = null;
        continue;
      }
      if (typeof key !== 'string' || key.length > 500) {
        return res.status(400).json({
          success: false,
          message: `The uploaded file for ${field} is missing or does not belong to this account.`,
        });
      }
      credentialKeys[field] = key;
    }

    // ── Create application + consume upload receipts in one transaction ──
    const contractDisplaySnapshot = getCurrentContract();
    const applicationPayload = {
      userId,
      ...fields,
      certificationFileKey: credentialKeys.certificationFileKey,
      insuranceFileKey: credentialKeys.insuranceFileKey,
      additionalInsuredAttested: consentFlags.selfInsure === true,
      contractVersion: CURRENT_CONTRACT_VERSION,
      signatureData,
      signedAt: new Date(),
      // req.ip is the proxy-aware client IP ('trust proxy' is set app-wide in core/app.mjs).
      // Do NOT fall back to the raw x-forwarded-for header — it's client-spoofable and would
      // corrupt this legal e-signature evidence field.
      ipAddress: req.ip || null,
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent'].slice(0, 1_000)
        : null,
      consentFlags,
      // v1 is independent-trainer only (15% fee). When the trainer-TYPE branch lands (SWA-62
      // Part 1), this must be derived from the chosen type — affiliated ≠ 15%. Do NOT keep
      // this literal once the type split ships.
      platformFeePercent: contractDisplaySnapshot.platformFeePercent,
      status: 'pending_review',
      metadata: {
        contractTextHash: contractTextHash(),
        contractPackageHash: currentContractPackageHash,
        contractDisplaySnapshot,
        submittedAt: new Date().toISOString(),
        source: 'in_app',
        isDraftContract: true,
      },
    };
    const application = await createApplicationWithCredentialReceipts({
      userId,
      credentialKeys,
      applicationModel: TrainerApplication,
      applicationPayload,
    });

    logger.info(`[trainerOnboarding] application ${application.id} submitted by user ${userId} (pending_review)`);

    return res.status(201).json({
      success: true,
      message: "Application received for review. We'll contact you with next steps after verifying your insurance and certifications.",
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
    if (err instanceof CredentialReceiptError || err?.name === 'CredentialReceiptError') {
      const status = Number.isInteger(err.statusCode) ? err.statusCode : 400;
      const message = status === 400
        ? 'A credential upload is missing, expired, already used, or belongs to another field.'
        : 'Credential verification is temporarily unavailable.';
      return res.status(status).json({ success: false, message });
    }
    if (err instanceof CredentialStorageError || err?.name === 'CredentialStorageError') {
      const status = Number.isInteger(err.statusCode) ? err.statusCode : 503;
      return res.status(status).json({
        success: false,
        message: 'Private credential storage is temporarily unavailable.',
      });
    }
    logger.error('[trainerOnboarding] submit error:', err);
    return res.status(500).json({ success: false, message: 'Could not submit your application. Please try again.' });
  }
}
