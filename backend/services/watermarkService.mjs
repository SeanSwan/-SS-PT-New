/**
 * Watermark Service
 * =================
 * Auto-watermarks gallery photos with the SwanStudios logo + sswanstudios.com text.
 *
 * Uses `sharp` for image compositing:
 *   1. Reads the original photo buffer
 *   2. Composites the SwanStudios logo (resized proportionally) at bottom-right
 *   3. Overlays "sswanstudios.com" text below the logo
 *   4. Returns the watermarked buffer
 *
 * The watermark can be toggled on/off per upload via the `applyWatermark` flag.
 * Default: ON (true).
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logo path — use the frontend public Logo.png (972x972 PNG with transparency)
const LOGO_PATH = path.resolve(__dirname, '../../frontend/public/Logo.png');

// Fallback: if Logo.png not found at deploy time, skip watermarking gracefully
let logoBuffer = null;

try {
  if (fs.existsSync(LOGO_PATH)) {
    logoBuffer = fs.readFileSync(LOGO_PATH);
    logger.info('[WatermarkService] Logo loaded from %s', LOGO_PATH);
  } else {
    logger.warn('[WatermarkService] Logo not found at %s — watermarking disabled', LOGO_PATH);
  }
} catch (err) {
  logger.warn('[WatermarkService] Failed to load logo: %s', err.message);
}

/**
 * Apply SwanStudios watermark to a photo buffer.
 *
 * @param {Buffer} photoBuffer - Original photo file buffer
 * @param {Object} [options]
 * @param {boolean} [options.applyWatermark=true] - Whether to apply the watermark
 * @param {number}  [options.logoScale=0.08] - Logo width as fraction of photo width (default 8%)
 * @param {number}  [options.opacity=0.7] - Watermark opacity (0-1)
 * @param {number}  [options.padding=20] - Pixels from bottom-right corner
 * @returns {Promise<Buffer>} Watermarked (or original) photo buffer
 */
export async function applyWatermark(photoBuffer, options = {}) {
  const {
    applyWatermark: shouldApply = true,
    logoScale = 0.08,
    opacity = 0.7,
    padding = 20,
  } = options;

  // Skip if disabled or logo not available
  if (!shouldApply || !logoBuffer) {
    if (!logoBuffer && shouldApply) {
      logger.warn('[WatermarkService] Watermark requested but logo not available, returning original');
    }
    return photoBuffer;
  }

  try {
    // Get photo dimensions
    const photoMeta = await sharp(photoBuffer).metadata();
    const photoWidth = photoMeta.width || 1920;
    const photoHeight = photoMeta.height || 1080;

    // Calculate logo size (proportional to photo width)
    const logoWidth = Math.round(photoWidth * logoScale);
    const logoHeight = logoWidth; // Logo is square (972x972)

    // Resize logo
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoWidth, logoHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .toBuffer();

    // Apply opacity to logo
    const logoWithOpacity = await sharp(resizedLogo)
      .ensureAlpha()
      .composite([{
        input: Buffer.from([0, 0, 0, Math.round(255 * opacity)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      }])
      .toBuffer();

    // Create "sswanstudios.com" text as SVG
    // Text needs to be wide enough to fit the full URL — approx 10 chars * 0.6em each
    const textFontSize = Math.max(12, Math.round(logoWidth * 0.18));
    const textWidth = Math.max(logoWidth + 40, Math.round(textFontSize * 10.5));
    const textHeight = Math.round(textFontSize * 1.8);

    const textSvg = Buffer.from(`
      <svg width="${textWidth}" height="${textHeight}">
        <style>
          .url { fill: white; font-family: Arial, Helvetica, sans-serif; font-size: ${textFontSize}px; font-weight: bold; }
        </style>
        <text x="50%" y="60%" text-anchor="middle" class="url" opacity="${opacity}">sswanstudios.com</text>
      </svg>
    `);

    // Total watermark height = logo + text + gap
    const textGap = Math.round(textFontSize * 0.3);
    const totalWatermarkHeight = logoHeight + textGap + textHeight;

    // Position: bottom-right with padding, center text under logo
    const logoLeft = photoWidth - logoWidth - padding;
    const logoCenterX = logoLeft + Math.round(logoWidth / 2);
    const logoTop = photoHeight - totalWatermarkHeight - padding;
    const textLeft = Math.max(0, logoCenterX - Math.round(textWidth / 2));
    const textTop = logoTop + logoHeight + textGap;

    // Composite logo + text onto photo
    const watermarked = await sharp(photoBuffer)
      .composite([
        {
          input: logoWithOpacity,
          top: Math.max(0, logoTop),
          left: Math.max(0, logoLeft),
        },
        {
          input: textSvg,
          top: Math.max(0, textTop),
          left: Math.max(0, textLeft),
        },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();

    logger.info('[WatermarkService] Applied watermark (%dx%d logo on %dx%d photo)', logoWidth, logoHeight, photoWidth, photoHeight);
    return watermarked;
  } catch (err) {
    logger.error('[WatermarkService] Watermark failed, returning original: %s', err.message);
    return photoBuffer;
  }
}

/**
 * Check if the watermark service is available (logo loaded).
 * @returns {boolean}
 */
export function isWatermarkAvailable() {
  return logoBuffer !== null;
}

export default { applyWatermark, isWatermarkAvailable };
