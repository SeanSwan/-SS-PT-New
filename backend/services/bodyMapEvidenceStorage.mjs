import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  getR2Client,
  generatePlaybackUrl,
  generateThumbnailUrl,
  deleteObject,
  r2Configured,
} from './r2StorageService.mjs';
import logger from '../utils/logger.mjs';

const { R2_BUCKET_NAME } = process.env;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function buildEvidenceKey({ userId, entryId, filename }) {
  const ext = path.extname(filename || '').replace(/^\./, '') || 'bin';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `body-map-evidence/${userId}/${entryId}/${yearMonth}/${uuidv4()}.${ext}`;
}

export async function uploadEvidenceFile(file, { userId, entryId }) {
  if (!file?.buffer) throw new Error('No upload buffer supplied');

  const mediaKey = buildEvidenceKey({ userId, entryId, filename: file.originalname });

  if (!r2Configured) {
    logger.warn('[BodyMapEvidenceStorage] R2 not configured; using local placeholder key for %s', mediaKey);
    return { mediaKey: `local://${mediaKey}`, thumbnailKey: null };
  }

  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: mediaKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      userId: String(userId),
      entryId: String(entryId),
      originalFilename: file.originalname || 'upload',
    },
  }));

  return { mediaKey, thumbnailKey: null };
}

export async function getEvidenceReadUrl({ mediaKey, mimeType, thumbnailKey = null }) {
  if (!mediaKey || mediaKey.startsWith('local://')) return null;
  return thumbnailKey
    ? generateThumbnailUrl(thumbnailKey)
    : generatePlaybackUrl({ objectKey: mediaKey, mimeType });
}

export async function getEvidenceBuffer(mediaKey) {
  if (!mediaKey || mediaKey.startsWith('local://')) {
    throw new Error('Stored file is not available from object storage');
  }
  const client = getR2Client();
  const response = await client.send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: mediaKey,
  }));
  return streamToBuffer(response.Body);
}

export async function deleteEvidenceObjects({ mediaKey, thumbnailKey }) {
  if (mediaKey && !mediaKey.startsWith('local://')) await deleteObject(mediaKey);
  if (thumbnailKey && !thumbnailKey.startsWith('local://')) await deleteObject(thumbnailKey);
}
