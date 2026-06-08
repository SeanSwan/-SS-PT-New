/**
 * Workout Plan PDF Content Service
 * =================================
 *
 * Resolves stored WorkoutPlan.metadata.planPdf content for authenticated
 * delivery. Keeps local/R2 storage details out of Express route handlers.
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';

const PDF_CONTENT_TYPE = 'application/pdf';
const WORKOUT_PLAN_PREFIX = 'workout-plans/';

export class WorkoutPlanPdfContentError extends Error {
  constructor(message, status = 404) {
    super(message);
    this.name = 'WorkoutPlanPdfContentError';
    this.status = status;
  }
}

const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);

const safeFileName = (value) => {
  const cleaned = typeof value === 'string'
    ? value.replace(/[\\/]+/g, ' ').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 160)
    : '';
  if (!cleaned) return 'Workout Plan.pdf';
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
};

const normalizeStorageKey = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = value.trim().replace(/^\/+/, '');
  if (
    !key.startsWith(WORKOUT_PLAN_PREFIX)
    || !/\.pdf$/i.test(key)
    || key.includes('\\')
    || key.includes('\0')
    || key.split('/').some((part) => part === '..' || part === '')
  ) {
    return null;
  }
  return key;
};

const flagEnabled = (value) => (
  ['1', 'true', 'yes', 'local'].includes(String(value || '').trim().toLowerCase())
);

const allowLocalWorkoutPlanPdfStorage = () => {
  const explicit = process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
  if (explicit !== undefined && explicit !== '') return flagEnabled(explicit);
  return process.env.NODE_ENV !== 'production';
};

const streamToBuffer = async (body) => {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const readLocalPdf = async ({ storageKey, uploadsRoot }) => {
  if (!allowLocalWorkoutPlanPdfStorage()) {
    throw new WorkoutPlanPdfContentError('Workout plan PDF local storage is disabled in production', 503);
  }

  const root = path.resolve(uploadsRoot || process.env.SWAN_WORKOUT_PLAN_UPLOAD_ROOT || path.join(process.cwd(), 'uploads'));
  const fullPath = path.resolve(root, storageKey);
  if (!fullPath.startsWith(`${root}${path.sep}`)) {
    throw new WorkoutPlanPdfContentError('Workout plan PDF path is invalid', 400);
  }
  return fs.readFile(fullPath);
};

const readR2Pdf = async (storageKey) => {
  const { getR2Client, r2Configured } = await import('./r2StorageService.mjs');
  if (!r2Configured) {
    throw new WorkoutPlanPdfContentError('Workout plan PDF storage is unavailable', 503);
  }
  const response = await getR2Client().send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: storageKey,
  }));
  return streamToBuffer(response.Body);
};

export const buildProtectedWorkoutPlanPdfUrl = (planId) => (
  planId ? `/api/workout-plans/${encodeURIComponent(String(planId))}/pdf/content.pdf` : null
);

export async function resolveWorkoutPlanPdfContent({ plan, uploadsRoot } = {}) {
  const rawPlan = toPlainObject(plan) || {};
  const metadata = toPlainObject(rawPlan.metadata) || {};
  const planPdf = toPlainObject(metadata.planPdf || metadata.pdfFile) || null;
  const storageKey = normalizeStorageKey(planPdf?.storageKey);
  if (!planPdf || !storageKey) {
    throw new WorkoutPlanPdfContentError('Workout plan PDF is not available', 404);
  }

  const storage = planPdf.storage === 'r2' ? 'r2' : 'local';
  const buffer = storage === 'r2'
    ? await readR2Pdf(storageKey)
    : await readLocalPdf({ storageKey, uploadsRoot });

  if (!buffer.length || buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new WorkoutPlanPdfContentError('Stored workout plan PDF is invalid', 422);
  }

  return {
    buffer,
    contentType: PDF_CONTENT_TYPE,
    fileName: safeFileName(planPdf.fileName),
    size: buffer.length,
  };
}
