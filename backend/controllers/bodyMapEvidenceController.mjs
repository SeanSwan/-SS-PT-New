import { getAllModels } from '../models/index.mjs';
import BodyMapEvidence from '../models/BodyMapEvidence.mjs';
import logger from '../utils/logger.mjs';
import {
  uploadEvidenceFile,
  getEvidenceReadUrl,
  getEvidenceBuffer,
  deleteEvidenceObjects,
} from '../services/bodyMapEvidenceStorage.mjs';
import { analyzeBodyMapEvidence as runVisionAnalysis } from '../services/ai/bodyMapVisionService.mjs';

const STAFF_ROLES = new Set(['admin', 'trainer']);
const isStaff = (user) => STAFF_ROLES.has(user?.role);
const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const toPlain = (record) => (record?.toJSON ? record.toJSON() : { ...record });

function parseCaptureContext(body = {}) {
  if (body.captureContext) {
    try {
      const parsed = typeof body.captureContext === 'string' ? JSON.parse(body.captureContext) : body.captureContext;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      return {};
    }
  }
  return {
    movement: body.movement || null,
    exerciseName: body.exerciseName || null,
    phaseOfMovement: body.phaseOfMovement || null,
    cameraAngle: body.cameraAngle || null,
    moment: body.moment || null,
    clientCaption: body.clientCaption || null,
  };
}

async function getEntry({ userId, entryId }) {
  const { ClientPainEntry } = getAllModels();
  return ClientPainEntry.findOne({ where: { id: entryId, userId } });
}

async function getEvidence({ userId, entryId, mediaId }) {
  return BodyMapEvidence.findOne({ where: { id: mediaId, userId, painEntryId: entryId, isDeleted: false } });
}

async function sanitizeEvidence(record, requester) {
  const data = toPlain(record);
  data.mediaUrl = await getEvidenceReadUrl({
    mediaKey: data.mediaKey,
    mimeType: data.mimeType,
    thumbnailKey: data.thumbnailKey,
  }).catch(() => null);

  if (!isStaff(requester)) {
    delete data.mediaKey;
    delete data.thumbnailKey;
    delete data.trainerReview;
    if (data.analysisStatus === 'approved') {
      data.analysisSummary = data.aiAnalysis?.swanCoachNotesDraft || null;
    }
    delete data.aiAnalysis;
  }
  return data;
}

async function mergeApprovedReviewIntoEntry(entry, evidence, review) {
  const existingFindings = entry.assessmentFindings && typeof entry.assessmentFindings === 'object'
    ? entry.assessmentFindings
    : {};
  const analysis = evidence.aiAnalysis || {};
  const coachNotes = review?.swanCoachNotes || analysis.swanCoachNotesDraft || '';
  const currentAiNotes = entry.aiNotes || '';
  const nextAiNotes = coachNotes && !currentAiNotes.includes(coachNotes)
    ? [currentAiNotes, `Body map evidence review: ${coachNotes}`].filter(Boolean).join('\n\n')
    : currentAiNotes;

  return entry.update({
    aiNotes: nextAiNotes || entry.aiNotes,
    assessmentFindings: {
      ...existingFindings,
      bodyMapEvidence: {
        latestMediaId: evidence.id,
        reviewedAt: new Date().toISOString(),
        visualObservations: analysis.visualObservations || [],
        possibleContributors: analysis.possibleContributors || [],
        trainerChecks: analysis.trainerChecks || [],
        avoidModify: analysis.avoidModify || [],
        confidence: analysis.confidence ?? null,
        approvedCoachNotes: coachNotes || null,
      },
    },
  });
}

export async function createBodyMapEvidence(req, res) {
  try {
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    if (!userId || !entryId) return res.status(400).json({ success: false, message: 'Invalid entry identifier' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No media file provided' });

    const entry = await getEntry({ userId, entryId });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const stored = await uploadEvidenceFile(req.file, { userId, entryId });
    const evidence = await BodyMapEvidence.create({
      painEntryId: entryId,
      userId,
      uploadedById: req.user?.id || null,
      mediaKey: stored.mediaKey,
      thumbnailKey: stored.thumbnailKey,
      originalFilename: req.file.originalname || null,
      mimeType: req.file.mimetype,
      fileSize: req.file.size || 0,
      mediaType,
      captureContext: parseCaptureContext(req.body),
      analysisStatus: 'pending',
    });

    return res.status(201).json({ success: true, data: await sanitizeEvidence(evidence, req.user) });
  } catch (error) {
    logger.error('[BodyMapEvidence] Create failed: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to upload evidence' });
  }
}

export async function listBodyMapEvidence(req, res) {
  try {
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    if (!userId || !entryId) return res.status(400).json({ success: false, message: 'Invalid entry identifier' });
    const entry = await getEntry({ userId, entryId });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    const records = await BodyMapEvidence.findAll({
      where: { userId, painEntryId: entryId, isDeleted: false },
      order: [['createdAt', 'DESC']],
    });
    const data = await Promise.all(records.map((record) => sanitizeEvidence(record, req.user)));
    return res.json({ success: true, data, count: data.length });
  } catch (error) {
    logger.error('[BodyMapEvidence] List failed: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load evidence' });
  }
}

export async function analyzeBodyMapEvidence(req, res) {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ success: false, message: 'Trainer review is required' });
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    const mediaId = parsePositiveInt(req.params.mediaId);
    if (!userId || !entryId || !mediaId) return res.status(400).json({ success: false, message: 'Invalid media identifier' });

    const entry = await getEntry({ userId, entryId });
    const evidence = await getEvidence({ userId, entryId, mediaId });
    if (!entry || !evidence) return res.status(404).json({ success: false, message: 'Evidence not found' });
    if (evidence.mediaType !== 'image') return res.status(400).json({ success: false, message: 'Vision analysis currently supports images only' });

    await evidence.update({ analysisStatus: 'processing' });
    const buffer = await getEvidenceBuffer(evidence.mediaKey);
    const result = await runVisionAnalysis({
      imageBuffer: buffer,
      mimeType: evidence.mimeType,
      entry: toPlain(entry),
      captureContext: evidence.captureContext,
    });

    if (!result.success) {
      await evidence.update({ analysisStatus: 'failed', aiAnalysis: { error: result.error, failedAt: new Date().toISOString() } });
      return res.status(502).json({ success: false, message: result.error });
    }

    await evidence.update({ analysisStatus: 'needs_review', aiAnalysis: result.analysis });
    return res.json({ success: true, data: await sanitizeEvidence(evidence, req.user) });
  } catch (error) {
    logger.error('[BodyMapEvidence] Analyze failed: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to analyze evidence' });
  }
}

export async function reviewBodyMapEvidence(req, res) {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ success: false, message: 'Trainer review is required' });
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    const mediaId = parsePositiveInt(req.params.mediaId);
    const decision = req.body?.decision === 'approved' ? 'approved' : req.body?.decision === 'rejected' ? 'rejected' : null;
    if (!userId || !entryId || !mediaId || !decision) return res.status(400).json({ success: false, message: 'Invalid review payload' });

    const entry = await getEntry({ userId, entryId });
    const evidence = await getEvidence({ userId, entryId, mediaId });
    if (!entry || !evidence) return res.status(404).json({ success: false, message: 'Evidence not found' });

    const review = {
      decision,
      clientSummary: req.body.clientSummary || null,
      swanCoachNotes: req.body.swanCoachNotes || null,
      safetyConstraints: Array.isArray(req.body.safetyConstraints) ? req.body.safetyConstraints : [],
      internalNotes: req.body.internalNotes || null,
      reviewedById: req.user.id,
      reviewedAt: new Date().toISOString(),
    };

    await evidence.update({ analysisStatus: decision, trainerReview: review, reviewedById: req.user.id, reviewedAt: new Date() });
    if (decision === 'approved') await mergeApprovedReviewIntoEntry(entry, evidence, review);
    return res.json({ success: true, data: await sanitizeEvidence(evidence, req.user) });
  } catch (error) {
    logger.error('[BodyMapEvidence] Review failed: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to review evidence' });
  }
}

export async function deleteBodyMapEvidence(req, res) {
  try {
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    const mediaId = parsePositiveInt(req.params.mediaId);
    if (!userId || !entryId || !mediaId) return res.status(400).json({ success: false, message: 'Invalid media identifier' });
    const evidence = await getEvidence({ userId, entryId, mediaId });
    if (!evidence) return res.status(404).json({ success: false, message: 'Evidence not found' });

    await deleteEvidenceObjects({ mediaKey: evidence.mediaKey, thumbnailKey: evidence.thumbnailKey }).catch(() => null);
    await evidence.update({ isDeleted: true, deletedAt: new Date() });
    return res.json({ success: true, message: 'Evidence removed' });
  } catch (error) {
    logger.error('[BodyMapEvidence] Delete failed: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to remove evidence' });
  }
}
