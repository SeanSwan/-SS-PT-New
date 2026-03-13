/**
 * Image Variant Service
 * =====================
 * Generates thumbnail + medium variants from a full-size JPEG buffer.
 * Also extracts width/height metadata.
 *
 * Variants:
 *   thumb  — 400px wide, Q80, progressive JPEG (30-60KB, for grid view)
 *   medium — 1200px wide, Q85, progressive JPEG (200-400KB, for detail modal)
 *   full   — original (5-12MB, for download only)
 *
 * R2 key pattern:
 *   gallery/{slug}/{photoNumber}.jpg         ← full (unchanged)
 *   gallery/{slug}/{photoNumber}_thumb.jpg   ← thumbnail
 *   gallery/{slug}/{photoNumber}_medium.jpg  ← medium
 */
import sharp from 'sharp';
import logger from '../utils/logger.mjs';

/**
 * Generate thumbnail and medium variants from a full-size image buffer.
 *
 * @param {Buffer} inputBuffer - The full-size JPEG buffer (post-watermark)
 * @param {Object} [options]
 * @param {number} [options.thumbWidth=400] - Max width for thumbnail
 * @param {number} [options.thumbQuality=80] - JPEG quality for thumbnail
 * @param {number} [options.mediumWidth=1200] - Max width for medium
 * @param {number} [options.mediumQuality=85] - JPEG quality for medium
 * @returns {Promise<{ thumb: Buffer, medium: Buffer, width: number, height: number }>}
 */
export async function generateVariants(inputBuffer, options = {}) {
  const {
    thumbWidth = 400,
    thumbQuality = 80,
    mediumWidth = 1200,
    mediumQuality = 85,
  } = options;

  // Extract original dimensions
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Generate thumbnail (400px wide, progressive JPEG)
  const thumbBuffer = await sharp(inputBuffer)
    .resize(thumbWidth, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: thumbQuality, progressive: true, mozjpeg: true })
    .toBuffer();

  // Generate medium (1200px wide, progressive JPEG)
  const mediumBuffer = await sharp(inputBuffer)
    .resize(mediumWidth, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: mediumQuality, progressive: true, mozjpeg: true })
    .toBuffer();

  logger.info(
    '[ImageVariants] Generated: thumb=%dKB, medium=%dKB from %dx%d original (%dKB)',
    Math.round(thumbBuffer.length / 1024),
    Math.round(mediumBuffer.length / 1024),
    width,
    height,
    Math.round(inputBuffer.length / 1024)
  );

  return { thumb: thumbBuffer, medium: mediumBuffer, width, height };
}

/**
 * Build R2 storage keys for all variants from a base key.
 *
 * @param {string} baseKey - e.g. "gallery/super-nova/1.jpg"
 * @returns {{ fullKey: string, thumbKey: string, mediumKey: string }}
 */
export function variantKeys(baseKey) {
  const base = baseKey.replace(/\.jpg$/i, '');
  return {
    fullKey: baseKey,
    thumbKey: `${base}_thumb.jpg`,
    mediumKey: `${base}_medium.jpg`,
  };
}

export default { generateVariants, variantKeys };
