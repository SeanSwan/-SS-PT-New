/**
 * Form Analysis Storage Service
 * =============================
 * Handles uploading form analysis media (video/images) to R2.
 * Falls back gracefully if R2 is not configured (dev mode).
 */
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../utils/logger.mjs';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

const r2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

/**
 * Upload a multer file buffer to R2.
 * Returns the object key (not a full URL — use presigned URLs for access).
 *
 * @param {Object} file - Multer file object with buffer, originalname, mimetype
 * @param {string} prefix - Key prefix (e.g., 'form-analysis/123')
 * @returns {Promise<string>} R2 object key
 */
export async function uploadToR2(file, prefix) {
  if (!r2Configured) {
    throw new Error('R2 is not configured');
  }

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const ext = path.extname(file.originalname) || '.mp4';
  const objectKey = `${prefix}/${uuidv4()}${ext}`;

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  logger.info('[FormAnalysisStorage] Uploaded %s to R2 key: %s (%d bytes)',
    file.originalname, objectKey, file.size);

  return objectKey;
}
