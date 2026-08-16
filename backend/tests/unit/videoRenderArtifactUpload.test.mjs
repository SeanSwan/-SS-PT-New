/**
 * Presigned artifact upload — key derivation and lease ownership.
 * ============================================================================
 *
 * The security property under test: THE OBJECT KEY IS DERIVED FROM THE JOB, NEVER
 * FROM THE CLIENT. An agent supplies a filename; if that filename could steer the
 * key, an enrolled agent could obtain a signed PUT for someone else's object and
 * overwrite it. Every traversal test below is that one attack in a different shape.
 *
 * The second property: an agent may only touch a job it currently holds the lease
 * on — the same rule heartbeat and complete already enforce.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/r2StorageService.mjs', () => ({
  r2Configured: true,
  generateUploadUrl: vi.fn(async ({ objectKey, sha256hex }) => ({
    uploadUrl: `https://r2.example/${objectKey}?sig=x`,
    mode: sha256hex ? 'A' : 'B',
  })),
}));

vi.mock('../../services/videoRenderJobService.mjs', () => ({
  getJob: vi.fn(async (id) => (id === 'missing' ? null : { id, leasedBy: 'agent-1' })),
}));

const {
  createArtifactUploadUrl, safeLeafName, artifactObjectKey,
  MAX_ARTIFACT_BYTES, ArtifactUploadError,
} = await import('../../services/videoRenderArtifactUpload.mjs');
const { generateUploadUrl } = await import('../../services/r2StorageService.mjs');

const GOOD_SHA = 'a'.repeat(64);
const call = (over = {}) => createArtifactUploadUrl({
  jobId: 'job-1', agentId: 'agent-1', filename: 'out.mp4',
  contentType: 'video/mp4', sha256: GOOD_SHA, bytes: 1024, ...over,
});

beforeEach(() => { generateUploadUrl.mockClear(); });

describe('filename reduction — every case is path traversal in disguise', () => {
  it('keeps only the final segment under BOTH separators', () => {
    expect(safeLeafName('../../etc/passwd.mp4')).toBe('passwd.mp4');
    expect(safeLeafName('C:\\windows\\system32\\evil.mp4')).toBe('evil.mp4');
    // A Windows agent sending backslashes must not smuggle a directory past a
    // POSIX-only basename.
    expect(safeLeafName('a/b\\c/d.mp4')).toBe('d.mp4');
  });

  it('strips leading dots so nothing becomes a hidden file or a parent ref', () => {
    expect(safeLeafName('...hidden.mp4')).toBe('hidden.mp4');
  });

  it('replaces exotic characters rather than trusting them', () => {
    expect(safeLeafName('a b;rm -rf.mp4')).toBe('a_b_rm_-rf.mp4');
    expect(safeLeafName('sh%20ell$(x).webm')).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it('requires a recognisable extension', () => {
    expect(() => safeLeafName('noextension')).toThrow(/extension/i);
    expect(() => safeLeafName('')).toThrow(/extension/i);
  });

  it('caps length while KEEPING the extension', () => {
    // ComfyUI emits long names by default, so this is the common path, not an exotic
    // one. Truncating the whole string first removed the extension and then rejected
    // the file for not having one.
    const out = safeLeafName(`${'x'.repeat(400)}.mp4`);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith('.mp4')).toBe(true);
    // A realistic ComfyUI name survives intact.
    expect(safeLeafName('ComfyUI_00042_swan_dawn_cinematic_take3.mp4'))
      .toBe('ComfyUI_00042_swan_dawn_cinematic_take3.mp4');
  });
});

describe('object key is job-namespaced', () => {
  it('prefixes with the job and cannot be steered out of it', () => {
    expect(artifactObjectKey('job-1', 'out.mp4')).toBe('renders/job-1/out.mp4');
    expect(artifactObjectKey('job-1', '../../videos/theirs.mp4')).toBe('renders/job-1/theirs.mp4');
  });

  it('sanitises the job id too', () => {
    expect(artifactObjectKey('../evil', 'a.mp4')).toBe('renders/__evil/a.mp4');
    // A bare ".." must never survive as a path segment.
    expect(artifactObjectKey('..', 'a.mp4')).toBe('renders/_/a.mp4');
  });
});

describe('lease ownership', () => {
  it('issues a URL to the agent holding the lease', async () => {
    const out = await call();
    expect(out.objectKey).toBe('renders/job-1/out.mp4');
    expect(out.uploadUrl).toContain('renders/job-1/out.mp4');
    expect(out.checksumEnforced).toBe(true);
  });

  it('REFUSES an agent that does not hold the lease', async () => {
    // The IDOR case. Without this, any enrolled agent could write into any job.
    const err = await call({ agentId: 'agent-2' }).catch(e => e);
    expect(err).toBeInstanceOf(ArtifactUploadError);
    expect(err.code).toBe('LEASE_LOST');
    expect(err.status).toBe(409);
    expect(generateUploadUrl).not.toHaveBeenCalled();
  });

  it('refuses an unknown job', async () => {
    const err = await call({ jobId: 'missing' }).catch(e => e);
    expect(err.status).toBe(404);
  });

  it('refuses an unauthenticated caller', async () => {
    const err = await call({ agentId: '' }).catch(e => e);
    expect(err.status).toBe(401);
  });
});

describe('input ceilings', () => {
  it('rejects a media type that is not a render artifact', async () => {
    const err = await call({ contentType: 'application/x-msdownload' }).catch(e => e);
    expect(err.status).toBe(415);
    expect(generateUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects an artifact over the size ceiling', async () => {
    const err = await call({ bytes: MAX_ARTIFACT_BYTES + 1 }).catch(e => e);
    expect(err.status).toBe(413);
  });

  it('rejects a non-positive or absent byte count', async () => {
    expect((await call({ bytes: 0 }).catch(e => e)).status).toBe(400);
    expect((await call({ bytes: 'lots' }).catch(e => e)).status).toBe(400);
  });

  it('rejects a malformed sha256 rather than passing it to the signer', async () => {
    const err = await call({ sha256: 'nothex' }).catch(e => e);
    expect(err.status).toBe(400);
    expect(generateUploadUrl).not.toHaveBeenCalled();
  });

  it('forwards the hash so R2 itself verifies the bytes', async () => {
    await call();
    expect(generateUploadUrl).toHaveBeenCalledWith(expect.objectContaining({ sha256hex: GOOD_SHA }));
  });

  it('still signs without a hash, and says the checksum is unenforced', async () => {
    const out = await call({ sha256: '' });
    expect(out.checksumEnforced).toBe(false);
  });
});

describe('storage not configured', () => {
  it('fails closed rather than reporting a successful upload to nowhere', async () => {
    vi.resetModules();
    vi.doMock('../../services/r2StorageService.mjs', () => ({
      r2Configured: false, generateUploadUrl: vi.fn(),
    }));
    vi.doMock('../../services/videoRenderJobService.mjs', () => ({
      getJob: vi.fn(async (id) => ({ id, leasedBy: 'agent-1' })),
    }));
    const mod = await import('../../services/videoRenderArtifactUpload.mjs');
    const err = await mod.createArtifactUploadUrl({
      jobId: 'job-1', agentId: 'agent-1', filename: 'a.mp4',
      contentType: 'video/mp4', sha256: GOOD_SHA, bytes: 10,
    }).catch(e => e);
    expect(err.status).toBe(503);
    expect(err.code).toBe('R2_NOT_CONFIGURED');
    vi.resetModules();
  });
});
