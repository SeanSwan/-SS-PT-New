export type SeedanceJobStatus = 'idle' | 'generating' | 'queued' | 'complete' | 'error';

export interface SeedanceGenerationData {
  status?: string | null;
  providerJobId?: string | null;
  videoUrl?: string | null;
}

export interface SeedanceJobPatch {
  status: Extract<SeedanceJobStatus, 'queued' | 'complete'>;
  providerJobId?: string;
  videoUrl?: string;
}

export function resolveSeedanceJobResult(data: SeedanceGenerationData | null | undefined): SeedanceJobPatch {
  const videoUrl = typeof data?.videoUrl === 'string' && data.videoUrl.trim()
    ? data.videoUrl.trim()
    : undefined;
  const providerJobId = typeof data?.providerJobId === 'string' && data.providerJobId.trim()
    ? data.providerJobId.trim()
    : undefined;

  return {
    status: videoUrl ? 'complete' : 'queued',
    providerJobId,
    videoUrl,
  };
}

export function getSeedanceJobErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown; error?: unknown } } }).response;
    const message = response?.data?.message || response?.data?.error;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Generation failed';
}
