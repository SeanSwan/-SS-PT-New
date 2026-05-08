/**
 * plaudClipService source-shape tests
 * =====================================
 * Phase 3 Slice 3.10. TypeScript compilation + structural locks for the
 * frontend service. Behavioral test of HTTP integration runs in slice
 * 3.14 Playwright with a live backend.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as plaudClipService from './plaudClipService';
import * as plaudMergeService from './plaudMergeService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLIP_SRC = readFileSync(resolve(__dirname, 'plaudClipService.ts'), 'utf8');
const MERGE_SRC = readFileSync(resolve(__dirname, 'plaudMergeService.ts'), 'utf8');

describe('plaudClipService — exports', () => {
  it('exports uploadClips, listClips, deleteClip', () => {
    expect(typeof plaudClipService.uploadClips).toBe('function');
    expect(typeof plaudClipService.listClips).toBe('function');
    expect(typeof plaudClipService.deleteClip).toBe('function');
  });

  it('exports PlaudApiError class with code field', () => {
    expect(plaudClipService.PlaudApiError).toBeTypeOf('function');
    const err = new plaudClipService.PlaudApiError('TEST', 'm', 400);
    expect(err.code).toBe('TEST');
    expect(err.status).toBe(400);
  });

  it('uploadClips rejects empty file array client-side', async () => {
    await expect(plaudClipService.uploadClips([])).rejects.toMatchObject({ code: 'NO_FILES' });
  });

  it('uploadClips rejects > 5 files client-side', async () => {
    const files = Array.from({ length: 6 }, (_, i) => new File([''], `f${i}.mp3`, { type: 'audio/mpeg' }));
    await expect(plaudClipService.uploadClips(files)).rejects.toMatchObject({ code: 'TOO_MANY_FILES' });
  });

  it('deleteClip rejects malformed clipId client-side', async () => {
    await expect(plaudClipService.deleteClip('not-a-uuid')).rejects.toMatchObject({ code: 'INVALID_CLIP_ID' });
  });

  it('routes protected clip requests through apiService', () => {
    expect(CLIP_SRC).toMatch(/import\s+apiService\s+from\s+['"]\.\/api\.service['"]/);
    expect(CLIP_SRC).toMatch(/apiService\.post[\s\S]{0,160}\(['"]\/api\/plaud\/clips\/upload/);
    expect(CLIP_SRC).toMatch(/apiService\.get[\s\S]{0,160}\(['"]\/api\/plaud\/clips/);
    expect(CLIP_SRC).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    expect(CLIP_SRC).not.toMatch(/Bearer \$\{token\}/);
  });

  it('uploadClips uses multipart/form-data with files field', () => {
    expect(CLIP_SRC).toMatch(/form\.append\(['"]files['"]/);
    expect(CLIP_SRC).toMatch(/multipart\/form-data/);
  });
});

describe('plaudMergeService — exports', () => {
  it('exports submitMerge, listMergeRequests, getMergeRequest, approveMergeRequest, discardMergeRequest', () => {
    expect(typeof plaudMergeService.submitMerge).toBe('function');
    expect(typeof plaudMergeService.listMergeRequests).toBe('function');
    expect(typeof plaudMergeService.getMergeRequest).toBe('function');
    expect(typeof plaudMergeService.approveMergeRequest).toBe('function');
    expect(typeof plaudMergeService.discardMergeRequest).toBe('function');
  });

  it('submitMerge enforces 1-5 clip cardinality client-side', async () => {
    await expect(plaudMergeService.submitMerge({ clipIds: [], clientId: 1 })).rejects.toMatchObject({ code: 'TOO_FEW_CLIPS' });
    const six = Array.from({ length: 6 }, () => '00000000-0000-0000-0000-000000000000');
    await expect(plaudMergeService.submitMerge({ clipIds: six, clientId: 1 })).rejects.toMatchObject({ code: 'TOO_MANY_FILES' });
    expect(MERGE_SRC).toMatch(/args\.clipIds\.length\s*<\s*1/);
  });

  it('submitMerge enforces clientId integer >0 client-side', async () => {
    await expect(plaudMergeService.submitMerge({
      clipIds: ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001'],
      clientId: 0,
    })).rejects.toMatchObject({ code: 'INVALID_CLIENT_ID' });
  });

  it('getMergeRequest rejects malformed mergeRequestId client-side', async () => {
    await expect(plaudMergeService.getMergeRequest('bad-id')).rejects.toMatchObject({ code: 'INVALID_MERGE_REQUEST_ID' });
  });

  it('discardMergeRequest rejects malformed mergeRequestId client-side', async () => {
    await expect(plaudMergeService.discardMergeRequest('bad-id')).rejects.toMatchObject({ code: 'INVALID_MERGE_REQUEST_ID' });
  });

  it('approveMergeRequest rejects malformed mergeRequestId client-side', async () => {
    await expect(plaudMergeService.approveMergeRequest('bad-id')).rejects.toMatchObject({ code: 'INVALID_MERGE_REQUEST_ID' });
  });

  it('hits separate apiService paths for /merge vs /merge-requests', () => {
    expect(MERGE_SRC).toMatch(/apiService\.post[\s\S]{0,160}\(['"]\/api\/plaud\/merge/);
    expect(MERGE_SRC).toMatch(/apiService\.get[\s\S]{0,160}\(['"]\/api\/plaud\/merge-requests/);
  });

  it('does not create a private merge auth lane', () => {
    expect(MERGE_SRC).toMatch(/import\s+apiService\s+from\s+['"]\.\/api\.service['"]/);
    expect(MERGE_SRC).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    expect(MERGE_SRC).not.toMatch(/Bearer \$\{token\}/);
  });
});
