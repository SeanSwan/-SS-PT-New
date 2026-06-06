/**
 * Workout Plan PDF Attachment Service
 * ===================================
 *
 * Framework-free helpers for storing and exposing a workout plan's PDF file
 * reference inside WorkoutPlan.metadata.planPdf. This avoids a migration for
 * the first trainer/admin viewer slice while keeping validation centralized.
 */

const PDF_CONTENT_TYPE = 'application/pdf';
const MAX_FILE_NAME_LENGTH = 160;

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

const fileNameFromUrl = (url) => {
  try {
    const parsed = new URL(url, 'https://swanstudios.local');
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    return stripUnsafeFileName(last ? decodeURIComponent(last) : null);
  } catch {
    return 'Workout Plan.pdf';
  }
};

const normalizePdfUrl = (value) => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim() || /[\r\n\t]/.test(raw)) return null;
  const pdfUrl = raw.trim();
  const isRootRelative = pdfUrl.startsWith('/') && !pdfUrl.startsWith('//');
  const isHttpsAbsolute = /^https:\/\//i.test(pdfUrl);
  if (!isRootRelative && !isHttpsAbsolute) return null;

  try {
    const parsed = new URL(pdfUrl, 'https://swanstudios.local');
    if (isHttpsAbsolute && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (!/\.pdf$/i.test(parsed.pathname)) return null;
    return isRootRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
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
  const url = normalizePdfUrl(raw.url || raw.pdfUrl);
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
  pdfUrl,
  fileName,
  updatedBy,
  updatedAt = new Date().toISOString(),
} = {}) => {
  const url = normalizePdfUrl(pdfUrl);
  if (!url) {
    return { ok: false, message: 'A valid PDF URL ending in .pdf is required' };
  }

  const planPdf = {
    url,
    fileName: stripUnsafeFileName(fileName || fileNameFromUrl(url)),
    contentType: PDF_CONTENT_TYPE,
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
