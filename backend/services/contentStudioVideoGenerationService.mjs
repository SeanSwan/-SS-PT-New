/**
 * Content Studio video generation service.
 *
 * Validates AI-video generation requests and calls the explicitly configured
 * provider endpoint. The route remains fail-closed until Render has both the
 * provider API key and URL, so the app never fabricates generated media.
 */

const VALID_CATEGORIES = new Set(['exercise-demo', 'social-clip', 'marketing']);
const VALID_STYLES = new Set(['cinematic', 'dynamic', 'minimal', 'editorial']);
const VALID_DURATIONS = new Set([5, 10, 15, 30]);
const MAX_PROMPT_LENGTH = 500;

export class ContentStudioVideoGenerationError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ContentStudioVideoGenerationError';
    this.statusCode = statusCode;
  }
}

export function resolveVideoGenerationConfig(env = process.env) {
  const apiKey = env.SEEDANCE_API_KEY || env.DREAMINA_API_KEY || '';
  const apiUrl = env.SEEDANCE_API_URL || env.DREAMINA_API_URL || env.HIGGSFIELD_API_URL || '';
  const provider = env.DREAMINA_API_URL ? 'dreamina' : 'seedance';

  return {
    apiKey: apiKey.trim(),
    apiUrl: apiUrl.trim(),
    provider,
    configured: Boolean(apiKey.trim() && apiUrl.trim()),
  };
}

export function validateVideoGenerationInput(input = {}) {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const category = typeof input.category === 'string' ? input.category : '';
  const style = typeof input.style === 'string' ? input.style : '';
  const duration = Number(input.duration);

  if (!prompt) {
    throw new ContentStudioVideoGenerationError(400, 'Prompt is required.');
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new ContentStudioVideoGenerationError(400, `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`);
  }
  if (!VALID_CATEGORIES.has(category)) {
    throw new ContentStudioVideoGenerationError(400, 'Video category is invalid.');
  }
  if (!VALID_STYLES.has(style)) {
    throw new ContentStudioVideoGenerationError(400, 'Video style is invalid.');
  }
  if (!VALID_DURATIONS.has(duration)) {
    throw new ContentStudioVideoGenerationError(400, 'Video duration is invalid.');
  }

  return { prompt, category, style, duration };
}

function firstString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() || null;
}

function normalizeProviderResponse(data = {}) {
  const nestedData = data.data && typeof data.data === 'object' ? data.data : {};
  const output = data.output && typeof data.output === 'object' ? data.output : {};
  const providerJobId = firstString(data.id, data.jobId, data.taskId, nestedData.id, nestedData.jobId, output.id);
  const videoUrl = firstString(data.videoUrl, data.video_url, nestedData.videoUrl, nestedData.video_url, output.videoUrl, output.url);
  const rawStatus = firstString(data.status, nestedData.status, output.status);
  const status = videoUrl ? 'completed' : 'queued';

  return {
    providerJobId,
    status,
    rawStatus,
    videoUrl,
  };
}

export async function requestContentStudioVideoGeneration(input, options = {}) {
  const requestPayload = validateVideoGenerationInput(input);
  const config = resolveVideoGenerationConfig(options.env || process.env);

  if (!config.configured) {
    throw new ContentStudioVideoGenerationError(
      424,
      'Seedance video generation is not configured yet. Set SEEDANCE_API_KEY and SEEDANCE_API_URL on Render.',
    );
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new ContentStudioVideoGenerationError(500, 'Video generation transport is unavailable.');
  }

  const providerBody = {
    ...requestPayload,
    metadata: {
      source: 'swanstudios-content-studio',
      requestedBy: options.requestedBy || null,
    },
  };

  const response = await fetchImpl(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(providerBody),
  });

  if (!response.ok) {
    throw new ContentStudioVideoGenerationError(502, `Video provider returned ${response.status}.`);
  }

  const providerData = await response.json();
  const normalized = normalizeProviderResponse(providerData);

  return {
    provider: config.provider,
    providerJobId: normalized.providerJobId,
    status: normalized.status,
    rawStatus: normalized.rawStatus,
    videoUrl: normalized.videoUrl,
    request: requestPayload,
  };
}
