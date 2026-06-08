/**
 * Workout Plan PDF Storage Service
 * =================================
 *
 * Stores trainer/admin-uploaded workout-plan PDFs and returns safe metadata
 * for WorkoutPlan.metadata.planPdf. Metadata URLs point at the authenticated
 * app endpoint; storageKey preserves the private local/R2 object path.
 */

import { PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.mjs';
import { buildProtectedWorkoutPlanPdfUrl } from './workoutPlanPdfContentService.mjs';
import { slugifyWorkoutPlanPdfSegment } from './workoutPlanPdfKeyService.mjs';

export const WORKOUT_PLAN_PDF_MAX_BYTES = 20 * 1024 * 1024;

const PDF_CONTENT_TYPE = 'application/pdf';
const MAX_FILE_NAME_LENGTH = 160;

let r2Loaded = false;
let getR2Client = null;
let r2Configured = false;

export class WorkoutPlanPdfValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkoutPlanPdfValidationError';
  }
}

const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const sanitizeDisplayFileName = (value) => {
  const cleaned = compactString(value)
    ?.replace(/[\\/]+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_FILE_NAME_LENGTH);

  const fallback = 'Workout Plan.pdf';
  if (!cleaned) return fallback;
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
};

const flagEnabled = (value) => (
  ['1', 'true', 'yes', 'local'].includes(String(value || '').trim().toLowerCase())
);

const allowLocalWorkoutPlanPdfStorage = () => {
  const explicit = process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
  if (explicit !== undefined && explicit !== '') return flagEnabled(explicit);
  return process.env.NODE_ENV !== 'production';
};

const allowLocalFallbackAfterR2Failure = allowLocalWorkoutPlanPdfStorage;

async function ensureR2Imports() {
  if (r2Loaded) return;
  r2Loaded = true;
  try {
    const mod = await import('./r2StorageService.mjs');
    getR2Client = mod.getR2Client;
    r2Configured = Boolean(mod.r2Configured);
  } catch {
    r2Configured = false;
  }
}

function validateWorkoutPlanPdfFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new WorkoutPlanPdfValidationError('A valid PDF file is required');
  }

  const size = Number(file.size || file.buffer.length);
  if (!Number.isFinite(size) || size <= 0 || size > WORKOUT_PLAN_PDF_MAX_BYTES) {
    throw new WorkoutPlanPdfValidationError('A valid PDF file under 20MB is required');
  }

  const originalName = compactString(file.originalname) || '';
  const fileName = sanitizeDisplayFileName(originalName);
  if (!/\.pdf$/i.test(originalName)) {
    throw new WorkoutPlanPdfValidationError('A valid PDF file is required');
  }

  if (file.mimetype !== PDF_CONTENT_TYPE) {
    throw new WorkoutPlanPdfValidationError('A valid PDF file is required');
  }

  const header = file.buffer.subarray(0, 5).toString('latin1');
  if (header !== '%PDF-') {
    throw new WorkoutPlanPdfValidationError('A valid PDF file is required');
  }

  return { fileName, size };
}

export async function storeWorkoutPlanPdf({
  file,
  planId,
  clientId,
  uploadedBy,
  uploadsRoot,
  idFactory = uuidv4,
  now = new Date(),
} = {}) {
  const { fileName, size } = validateWorkoutPlanPdfFile(file);
  const clientSegment = slugifyWorkoutPlanPdfSegment(clientId, 'client');
  const planSegment = slugifyWorkoutPlanPdfSegment(planId, 'plan');
  const uploadId = slugifyWorkoutPlanPdfSegment(idFactory(), 'upload');
  const fileSlug = slugifyWorkoutPlanPdfSegment(fileName, 'workout-plan');
  const storageKey = `workout-plans/${clientSegment}/${planSegment}-${uploadId}-${fileSlug}.pdf`;
  const updatedAt = now.toISOString();
  const protectedUrl = buildProtectedWorkoutPlanPdfUrl(planId);

  await ensureR2Imports();

  if (r2Configured && !uploadsRoot) {
    try {
      const client = getR2Client();
      await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: storageKey,
        Body: file.buffer,
        ContentType: PDF_CONTENT_TYPE,
        ContentDisposition: `inline; filename="${fileName.replace(/"/g, '')}"`,
      }));

      logger.info('[WorkoutPlanPDF] Uploaded plan PDF to R2: %s (%d bytes)', storageKey, size);
      return {
        url: protectedUrl,
        fileName,
        contentType: PDF_CONTENT_TYPE,
        storage: 'r2',
        storageKey,
        size,
        updatedBy: uploadedBy,
        updatedAt,
      };
    } catch (error) {
      if (!allowLocalFallbackAfterR2Failure()) {
        logger.error('[WorkoutPlanPDF] R2 upload failed and local fallback is disabled: %s', error.message);
        throw new Error('Workout plan PDF R2 upload failed and local fallback is disabled');
      }
      logger.error('[WorkoutPlanPDF] R2 upload failed, falling back to local disk: %s', error.message);
    }
  }

  if (!allowLocalWorkoutPlanPdfStorage()) {
    logger.error('[WorkoutPlanPDF] R2 is not configured and production local fallback is disabled');
    throw new Error('Workout plan PDF durable production storage is not configured');
  }

  const root = path.resolve(uploadsRoot || process.env.SWAN_WORKOUT_PLAN_UPLOAD_ROOT || path.join(process.cwd(), 'uploads'));
  const fullPath = path.resolve(root, storageKey);
  if (!fullPath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Resolved workout plan PDF path escaped uploads root');
  }

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, file.buffer);

  logger.info('[WorkoutPlanPDF] Saved plan PDF locally: /uploads/%s (%d bytes)', storageKey, size);
  return {
    url: protectedUrl,
    fileName,
    contentType: PDF_CONTENT_TYPE,
    storage: 'local',
    storageKey,
    size,
    updatedBy: uploadedBy,
    updatedAt,
  };
}
