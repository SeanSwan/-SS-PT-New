/**
 * Gemini Badge Image Service
 * ==========================
 *
 * Generates Badge Creator artwork through Gemini Nano Banana and returns a
 * short app-safe URL. The Badge.imageUrl column is a string field, so this
 * service stores generated image bytes instead of returning data URLs.
 */

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import logger from '../utils/logger.mjs';

export const DEFAULT_GEMINI_BADGE_IMAGE_MODEL = 'gemini-3.1-flash-image';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1';
const PROVIDER = 'gemini';
const LOCAL_UPLOAD_CATEGORY = 'products';
const LOCAL_PREFIX = 'badge';
const MAX_PROMPT_LENGTH = 1800;
const MIME_EXTENSION = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
});

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.GOOGLE_AI_API_KEY
    || null;
}

export function getBadgeImageModel() {
  return process.env.GEMINI_BADGE_IMAGE_MODEL
    || process.env.AI_GEMINI_IMAGE_MODEL
    || DEFAULT_GEMINI_BADGE_IMAGE_MODEL;
}

export function isConfigured() {
  return Boolean(getGeminiApiKey());
}

function compactText(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const compacted = value.replace(/\s+/g, ' ').trim();
  return compacted || fallback;
}

function clampPrompt(value) {
  return compactText(value, 'premium SwanStudios achievement badge')
    .slice(0, MAX_PROMPT_LENGTH);
}

function buildPrompt({ prompt, style, size }) {
  const targetSize = Number.isFinite(Number(size)) ? Number(size) : 1024;
  return [
    `Create a square ${targetSize}x${targetSize} achievement badge icon for SwanStudios.`,
    `Badge concept: ${clampPrompt(prompt)}.`,
    `Visual style: ${clampPrompt(style)}.`,
    'Use a premium dark-first fitness SaaS aesthetic: midnight sapphire, frost white, crystalline accents, clean silhouette, polished emblem lighting.',
    'No readable text, no watermark text, no UI chrome, no background scene, no people, no logos copied from existing brands.',
    'Center the badge with transparent or simple dark background, suitable for an app icon and achievement gallery.',
  ].join(' ');
}

function parseGeminiInlineImage(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      const inlineData = part?.inlineData || part?.inline_data;
      const mimeType = inlineData?.mimeType || inlineData?.mime_type;
      const data = inlineData?.data;
      if (typeof data === 'string' && MIME_EXTENSION[mimeType]) {
        return { mimeType, data };
      }
    }
  }
  return null;
}

function safeUserSegment(userId) {
  return String(userId || 'admin')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64) || 'admin';
}

function currentYearMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function tryStoreInR2({ buffer, mimeType, userId, filename, now }) {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return null;

  const mod = await import('./r2StorageService.mjs');
  if (!mod.r2Configured) return null;

  const key = `badges/generated/${safeUserSegment(userId)}/${currentYearMonth(now)}/${filename}`;
  const client = mod.getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ContentDisposition: `inline; filename="${filename}"`,
  }));

  return {
    imageUrl: `${publicUrl.replace(/\/+$/, '')}/${key}`,
    storage: 'r2',
    storageKey: key,
  };
}

export async function storeGeneratedBadgeImage({
  buffer,
  mimeType,
  userId,
  now = new Date(),
  idFactory = randomUUID,
} = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A generated image buffer is required');
  }
  const extension = MIME_EXTENSION[mimeType];
  if (!extension) {
    throw new Error('Unsupported generated image type');
  }

  const id = String(idFactory()).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || randomUUID();
  const filename = `${LOCAL_PREFIX}-${safeUserSegment(userId)}-${currentYearMonth(now)}-${id}.${extension}`;

  try {
    const r2Result = await tryStoreInR2({ buffer, mimeType, userId, filename, now });
    if (r2Result) {
      logger.info('[GeminiBadgeImage] Stored generated badge in R2: %s', r2Result.storageKey);
      return r2Result;
    }
  } catch (err) {
    logger.warn('[GeminiBadgeImage] R2 badge storage failed; using local fallback: %s', err.message);
  }

  const uploadsRoot = path.resolve(process.cwd(), 'uploads', LOCAL_UPLOAD_CATEGORY);
  const fullPath = path.resolve(uploadsRoot, filename);
  if (!fullPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new Error('Resolved badge image path escaped uploads root');
  }
  await fs.mkdir(uploadsRoot, { recursive: true });
  await fs.writeFile(fullPath, buffer);

  const imageUrl = `/uploads/${LOCAL_UPLOAD_CATEGORY}/${filename}`;
  logger.info('[GeminiBadgeImage] Stored generated badge locally: %s', imageUrl);
  return {
    imageUrl,
    storage: 'local',
    storageKey: imageUrl,
  };
}

export async function generateBadge({
  prompt,
  style,
  size = 1024,
  userId,
  fetchImpl = globalThis.fetch,
  storeImage = storeGeneratedBadgeImage,
} = {}) {
  const apiKey = getGeminiApiKey();
  const model = getBadgeImageModel();
  if (!apiKey) {
    return {
      success: false,
      code: 'GEMINI_NOT_CONFIGURED',
      error: 'Gemini image generation is not configured',
      provider: PROVIDER,
      model,
    };
  }
  if (typeof fetchImpl !== 'function') {
    return {
      success: false,
      code: 'GEMINI_FETCH_UNAVAILABLE',
      error: 'Gemini fetch client is unavailable',
      provider: PROVIDER,
      model,
    };
  }

  try {
    const response = await fetchImpl(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: buildPrompt({ prompt, style, size }) }],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!response.ok) {
      await response.text().catch(() => '');
      logger.error('[GeminiBadgeImage] Gemini provider returned status %s', response.status);
      return {
        success: false,
        code: 'GEMINI_PROVIDER_FAILED',
        statusCode: response.status,
        error: 'Gemini image generation provider failed',
        provider: PROVIDER,
        model,
      };
    }

    const payload = await response.json();
    const image = parseGeminiInlineImage(payload);
    if (!image) {
      return {
        success: false,
        code: 'GEMINI_NO_IMAGE',
        error: 'Gemini did not return an image',
        provider: PROVIDER,
        model,
      };
    }

    const stored = await storeImage({
      buffer: Buffer.from(image.data, 'base64'),
      mimeType: image.mimeType,
      userId,
    });

    return {
      success: true,
      imageUrl: stored.imageUrl,
      storage: stored.storage,
      storageKey: stored.storageKey,
      provider: PROVIDER,
      model,
    };
  } catch (err) {
    logger.error('[GeminiBadgeImage] Badge generation failed: %s', err.message);
    return {
      success: false,
      code: 'GEMINI_GENERATION_FAILED',
      error: 'Gemini image generation failed',
      provider: PROVIDER,
      model,
    };
  }
}

export async function checkHealth() {
  const configured = isConfigured();
  return {
    success: configured,
    configured,
    provider: PROVIDER,
    model: getBadgeImageModel(),
    error: configured ? null : 'Gemini image generation is not configured',
  };
}

export default {
  generateBadge,
  isConfigured,
  checkHealth,
};
