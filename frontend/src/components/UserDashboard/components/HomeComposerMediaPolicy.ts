/**
 * FILE: HomeComposerMediaPolicy.ts
 * PURPOSE: Client-side Quick Post media allowlist and size guard.
 */

export const HOME_COMPOSER_MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const HOME_COMPOSER_ACCEPT = [
  'image/gif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
].join(',');

const MAX_MEDIA_LABEL = '50 MB';

const ALLOWED_MIME_TYPES = new Set(HOME_COMPOSER_ACCEPT.split(','));

const ALLOWED_EXTENSIONS = new Set([
  'gif',
  'heic',
  'heif',
  'jpeg',
  'jpg',
  'm4v',
  'mov',
  'mp4',
  'png',
  'webm',
  'webp',
]);

const TYPE_ERROR = 'Choose a supported image or video file: JPG, PNG, WebP, GIF, HEIC, MP4, WebM, or MOV.';
const SIZE_ERROR = `Quick Post media must be ${MAX_MEDIA_LABEL} or smaller.`;

export interface HomeComposerMediaValidation {
  accepted: boolean;
  error: string | null;
}

function fileExtension(name: string): string {
  const [, extension = ''] = name.toLowerCase().match(/\.([a-z0-9]+)$/) || [];
  return extension;
}

export function validateHomeComposerMediaFile(file: File | null | undefined): HomeComposerMediaValidation {
  if (!file) return { accepted: false, error: 'Choose an image or video file first.' };
  if (file.size > HOME_COMPOSER_MAX_MEDIA_BYTES) return { accepted: false, error: SIZE_ERROR };

  const type = file.type.trim().toLowerCase();
  const extension = fileExtension(file.name);
  const typeAllowed = type.length > 0 && ALLOWED_MIME_TYPES.has(type);
  const extensionAllowed = ALLOWED_EXTENSIONS.has(extension);

  if (!extensionAllowed) return { accepted: false, error: TYPE_ERROR };
  if (type.length > 0 && !typeAllowed) return { accepted: false, error: TYPE_ERROR };
  return { accepted: true, error: null };
}
