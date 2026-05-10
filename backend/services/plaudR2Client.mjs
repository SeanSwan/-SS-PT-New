/**
 * plaudR2Client.mjs
 * ==================
 * R2 client + bucket factory for PLAUD clip storage. Reuses the same R2
 * credentials as the video R2 service but targets a different bucket
 * (`R2_PLAUD_BUCKET`, falling back to the configured shared R2 bucket,
 * then `swanstudios-plaud-clips`). Singleton.
 *
 * Phase 3 Slice 3.3 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §17.3.
 */
import { S3Client } from '@aws-sdk/client-s3';
import logger from '../utils/logger.mjs';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET_NAME,
  R2_PLAUD_BUCKET,
} = process.env;

const PLAUD_BUCKET_CANDIDATES = Array.from(new Set([
  R2_PLAUD_BUCKET,
  R2_BUCKET_NAME,
  'swanstudios-plaud-clips',
].filter(Boolean)));
const PLAUD_BUCKET = PLAUD_BUCKET_CANDIDATES[0];

let _client = null;

export function getPlaudR2Client() {
  if (_client) return { client: _client, bucket: PLAUD_BUCKET };

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('[PlaudR2Client] Missing R2 credentials in env');
  }

  const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  _client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  logger.info('[PlaudR2Client] Initialized for bucket %s', PLAUD_BUCKET);
  return { client: _client, bucket: PLAUD_BUCKET };
}

export function isPlaudR2Configured() {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

export function getPlaudR2BucketCandidates() {
  return PLAUD_BUCKET_CANDIDATES;
}

export const PLAUD_R2_BUCKET = PLAUD_BUCKET;
