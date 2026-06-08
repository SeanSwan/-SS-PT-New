/**
 * Workout Plan PDF Attachment Service
 * ===================================
 *
 * Framework-free helpers for exposing workout-plan PDF references inside
 * WorkoutPlan.metadata.planPdf. Public/external URLs are intentionally not
 * accepted here; durable PDFs must resolve through the authenticated app
 * endpoint backed by local persistent disk or private R2 object storage.
 */

import { buildProtectedWorkoutPlanPdfUrl } from './workoutPlanPdfContentService.mjs';
import {
  normalizeWorkoutPlanPdfStorageKey,
  workoutPlanPdfStorageKeyMatchesPlan,
} from './workoutPlanPdfKeyService.mjs';

const PDF_CONTENT_TYPE = 'application/pdf';
const MAX_FILE_NAME_LENGTH = 160;
const PROTECTED_PDF_PATH = /^\/api\/workout-plans\/([^/]+)\/pdf\/content\.pdf$/;

const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const stripUnsafeFileName = (value) => {
  const fallback = 'Workout Plan.pdf';
  const cleaned = compactString(value)
    ?.replace(/[\\/]+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_FILE_NAME_LENGTH);
  if (!cleaned) return fallback;
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
};

const decodeSegment = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const fileNameFromUrl = (url) => {
  try {
    const parsed = new URL(url, 'https://swanstudios.local');
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    return stripUnsafeFileName(last ? decodeURIComponent(last) : null);
  } catch {
    return 'Workout Plan.pdf';
  }
};

const normalizeStorage = (value) => (value === 'local' ? 'local' : 'r2');

const flagEnabled = (value) => (
  ['1', 'true', 'yes', 'local'].includes(String(value || '').trim().toLowerCase())
);

const allowLocalWorkoutPlanPdfStorage = () => {
  const explicit = process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
  if (explicit !== undefined && explicit !== '') return flagEnabled(explicit);
  return process.env.NODE_ENV !== 'production';
};

const normalizeProtectedPdfUrl = (value, planId = null) => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim() || /[\r\n\t]/.test(raw)) return null;
  const pdfUrl = raw.trim();
  if (!pdfUrl.startsWith('/') || pdfUrl.startsWith('//')) return null;

  try {
    const parsed = new URL(pdfUrl, 'https://swanstudios.local');
    if (parsed.username || parsed.password) return null;
    if (parsed.search || parsed.hash) return null;
    const match = parsed.pathname.match(PROTECTED_PDF_PATH);
    if (!match) return null;
    if (planId && decodeSegment(match[1]) !== String(planId)) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
};

const normalizeMetadataObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const pdfAttachmentMetadata = (metadata = {}) => {
  const raw = metadata?.planPdf || metadata?.pdfFile || null;
  return normalizeMetadataObject(raw);
};

const normalizePdfAttachment = (raw = {}) => {
  const url = normalizeProtectedPdfUrl(raw.url || raw.pdfUrl);
  if (!url) return null;

  return {
    url,
    fileName: stripUnsafeFileName(raw.fileName || fileNameFromUrl(url)),
    contentType: PDF_CONTENT_TYPE,
    updatedAt: compactString(raw.updatedAt) || null,
  };
};

export const extractWorkoutPlanPdfAttachment = (metadata = {}) => (
  normalizePdfAttachment(pdfAttachmentMetadata(metadata))
);

export const buildWorkoutPlanPdfMetadata = ({
  currentMetadata = {},
  planId,
  pdfUrl,
  fileName,
  storage,
  storageKey,
  updatedBy,
  updatedAt = new Date().toISOString(),
} = {}) => {
  const current = pdfAttachmentMetadata(currentMetadata);
  const url = normalizeProtectedPdfUrl(pdfUrl || buildProtectedWorkoutPlanPdfUrl(planId), planId);
  if (!url) {
    return { ok: false, message: 'A protected app PDF URL for this plan is required' };
  }

  const providedStorageKey = normalizeWorkoutPlanPdfStorageKey(storageKey);
  const normalizedStorageKey = providedStorageKey || normalizeWorkoutPlanPdfStorageKey(current.storageKey);
  if (!normalizedStorageKey) {
    return { ok: false, message: 'Upload a PDF file or provide an existing protected PDF storage key' };
  }
  if (!workoutPlanPdfStorageKeyMatchesPlan(normalizedStorageKey, planId)) {
    return { ok: false, message: 'PDF storage key must match this workout plan' };
  }

  const normalizedStorage = normalizeStorage(storage || current.storage);
  if (normalizedStorage === 'local' && !allowLocalWorkoutPlanPdfStorage()) {
    return {
      ok: false,
      message: 'Local PDF storage requires explicit production fallback configuration',
    };
  }

  const planPdf = {
    url,
    fileName: stripUnsafeFileName(fileName || current.fileName || fileNameFromUrl(url)),
    contentType: PDF_CONTENT_TYPE,
    storage: normalizedStorage,
    storageKey: normalizedStorageKey,
    ...(!providedStorageKey && Number.isFinite(Number(current.size)) && Number(current.size) > 0
      ? { size: Number(current.size) }
      : {}),
    updatedBy,
    updatedAt,
  };

  return {
    ok: true,
    metadata: {
      ...normalizeMetadataObject(currentMetadata),
      planPdf,
    },
    planPdf: extractWorkoutPlanPdfAttachment({ planPdf }),
  };
};
