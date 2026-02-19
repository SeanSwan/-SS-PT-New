/**
 * Video Library V2 — Security-Critical Integration Tests
 * ======================================================
 * Tests the critical security paths identified by AI reviewers:
 *
 *   1. Upload Mode A/B selection (requestUploadUrl)
 *   2. Upload-complete server-trust gates (completeUpload)
 *   3. Publish gates (publishVideo)
 *   4. Watch entitlement (watchVideo — probing-resistant 404)
 *   5. Refresh URL uniform 403 (refreshUrl — no info leakage)
 *   6. isUniqueViolation helper resilience
 *
 * All external dependencies (Sequelize models, R2 service, job queue, database)
 * are mocked so tests are fast, isolated, and deterministic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../fixtures/testData.mjs';

// ─── Mock: logger (already mocked in setup.mjs, but explicit for clarity) ────
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Mock: models/index.mjs ─────────────────────────────────────────────────
// We build per-test stubs and expose them via the getter functions.
const mockVideoCatalogModel = {
  create: vi.fn(),
  findOne: vi.fn(),
  findByPk: vi.fn(),
  findAndCountAll: vi.fn(),
};

vi.mock('../../models/index.mjs', () => ({
  getVideoCatalog: () => mockVideoCatalogModel,
  getVideoCollection: vi.fn(() => ({})),
  getVideoCollectionItem: vi.fn(() => ({})),
  getVideoAccessGrant: vi.fn(() => ({})),
  getVideoJobLog: vi.fn(() => ({})),
  Op: {
    contains: Symbol('contains'),
    or: Symbol('or'),
    gt: Symbol('gt'),
  },
}));

// ─── Mock: database.mjs (sequelize instance with transaction support) ────────
const mockTransaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: vi.fn(),
  rollback: vi.fn(),
};

vi.mock('../../database.mjs', () => ({
  default: {
    authenticate: vi.fn().mockResolvedValue(true),
    transaction: vi.fn(async (cb) => cb(mockTransaction)),
  },
}));

// ─── Mock: R2 storage service ────────────────────────────────────────────────
vi.mock('../../services/r2StorageService.mjs', () => ({
  generateUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://r2.example.com/presigned-put',
    mode: 'A',
  }),
  generatePlaybackUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned-get'),
  generateThumbnailUrl: vi.fn().mockResolvedValue('https://r2.example.com/thumbnail'),
  generateObjectKey: vi.fn().mockReturnValue('videos/1/2026-02/uuid-test.mp4'),
  generateThumbnailKey: vi.fn().mockReturnValue('thumbnails/vid-1/uuid-thumb.jpg'),
  headObject: vi.fn().mockResolvedValue({
    contentLength: 1024000,
    contentType: 'video/mp4',
    checksumSHA256: null,
  }),
  deleteObject: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock: videoJobQueue ─────────────────────────────────────────────────────
vi.mock('../../services/videoJobQueue.mjs', () => ({
  addJob: vi.fn().mockResolvedValue({ id: 'job-1' }),
}));

// ─── Mock: videoEntitlementService ───────────────────────────────────────────
vi.mock('../../services/videoEntitlementService.mjs', () => ({
  canAccessVideo: vi.fn(),
}));

// ─── Imports (after all vi.mock calls) ───────────────────────────────────────
import {
  requestUploadUrl,
  completeUpload,
  publishVideo,
} from '../../controllers/videoCatalogController.mjs';

import {
  watchVideo,
  refreshUrl,
} from '../../controllers/videoCatalogPublicController.mjs';

import { generateUploadUrl, headObject, deleteObject } from '../../services/r2StorageService.mjs';
import { addJob } from '../../services/videoJobQueue.mjs';
import { canAccessVideo } from '../../services/videoEntitlementService.mjs';

// ─── Helper: enhanced mock response with `set()` for Cache-Control headers ──
function createEnhancedMockResponse() {
  const res = createMockResponse();
  res.headers = {};
  res.set = vi.fn((key, value) => { res.headers[key] = value; });
  return res;
}

// ─── Helpers: build video-like plain objects ─────────────────────────────────
function makeVideo(overrides = {}) {
  return {
    id: 'vid-uuid-1',
    title: 'Test Video',
    slug: 'test-video',
    source: 'upload',
    status: 'draft',
    creatorId: 1,
    pendingObjectKey: 'videos/1/2026-02/uuid-test.mp4',
    hostedKey: null,
    declaredChecksum: null,
    declaredFileSize: 1024000,
    declaredMimeType: 'video/mp4',
    uploadMode: 'B',
    fileChecksumSha256: null,
    metadataCompleted: false,
    visibility: 'public',
    accessTier: 'free',
    thumbnailKey: null,
    thumbnailUrl: null,
    youtubeVideoId: null,
    deletedAt: null,
    update: vi.fn().mockImplementation(function (data) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    destroy: vi.fn().mockResolvedValue(undefined),
    toJSON: function () { return { ...this }; },
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Upload Mode A/B — requestUploadUrl
// ═════════════════════════════════════════════════════════════════════════════
describe('requestUploadUrl — Upload Mode A/B', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: create succeeds on first attempt
    mockVideoCatalogModel.create.mockResolvedValue(makeVideo({ id: 'new-vid-1' }));
  });

  it('Mode A: returns mode="A" when sha256hex is provided', async () => {
    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        contentType: 'video/mp4',
        fileSize: '1024000',
        sha256hex: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.mode).toBe('A');
  });

  it('Mode B: returns mode="B" when sha256hex is omitted', async () => {
    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        contentType: 'video/mp4',
        fileSize: '1024000',
        // sha256hex intentionally omitted
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.mode).toBe('B');
  });

  it('strips TRUST_FIELDS from the draft row written to DB', async () => {
    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        contentType: 'video/mp4',
        fileSize: '1024000',
        // Attacker tries to inject trust fields
        hostedKey: 'EVIL/key.mp4',
        fileChecksumSha256: 'deadbeef',
        hosted_key: 'EVIL/key2.mp4',
        file_checksum_sha256: 'deadbeef2',
        uploadMode: 'X',
        upload_mode: 'Y',
        legacyImport: true,
        legacy_import: true,
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(200);

    // Verify the data passed to VideoCatalog.create does NOT contain injected trust fields.
    // The controller builds draftData from validated inputs, not from req.body directly,
    // but the stripTrust function is used in other endpoints (createVideo, updateVideo).
    // For requestUploadUrl, trust fields are set from server-side logic only.
    const createCall = mockVideoCatalogModel.create.mock.calls[0][0];
    // The controller sets uploadMode from its own logic, not from req.body
    expect(createCall.uploadMode).toBe('B'); // Server-determined, not 'X' from body
    // hostedKey should NOT be in the draft row (drafts start with null)
    expect(createCall.hostedKey).toBeUndefined();
  });

  it('returns 400 when required fields are missing', async () => {
    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        // contentType and fileSize missing
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.success).toBe(false);
  });

  it('returns 400 for disallowed MIME type', async () => {
    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
        fileSize: '1024',
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toContain('Invalid contentType');
  });

  it('returns 400 for file size exceeding 2 GB', async () => {
    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'huge.mp4',
        contentType: 'video/mp4',
        fileSize: String(3_000_000_000), // 3 GB
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toContain('fileSize');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Upload Complete — Server-Trust Gates (completeUpload)
// ═════════════════════════════════════════════════════════════════════════════
describe('completeUpload — Server-Trust Gates', () => {
  const objectKey = 'videos/1/2026-02/uuid-test.mp4';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default HEAD response: valid object
    headObject.mockResolvedValue({
      contentLength: 1024000,
      contentType: 'video/mp4',
      checksumSHA256: null,
    });
  });

  it('returns 403 when creatorId does not match req.user.id (ownership check)', async () => {
    // findOne returns null because WHERE creatorId = req.user.id won't match
    mockVideoCatalogModel.findOne.mockResolvedValue(null);

    const req = createMockRequest({
      user: { id: 999, role: 'admin' },
      body: { videoId: 'vid-uuid-1', objectKey },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toContain('not found or access denied');
  });

  it('returns 409 when hostedKey is already set (one-time gate)', async () => {
    const video = makeVideo({
      hostedKey: 'videos/1/already-completed.mp4', // Already completed
      pendingObjectKey: objectKey,
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: 'vid-uuid-1', objectKey },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.jsonData.error).toContain('already completed');
  });

  it('returns 400 when objectKey does not match pendingObjectKey (key binding)', async () => {
    const video = makeVideo({
      pendingObjectKey: 'videos/1/2026-02/DIFFERENT-KEY.mp4',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: 'vid-uuid-1', objectKey },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toContain('does not match');
  });

  it('Mode A: verifies checksum and stores it on success', async () => {
    const sha256hex = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const sha256base64 = Buffer.from(sha256hex, 'hex').toString('base64');

    const video = makeVideo({
      uploadMode: 'A',
      declaredChecksum: sha256hex,
      declaredFileSize: 1024000,
      declaredMimeType: 'video/mp4',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    headObject.mockResolvedValue({
      contentLength: 1024000,
      contentType: 'video/mp4',
      checksumSHA256: sha256base64,
    });

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: 'vid-uuid-1', objectKey },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    // Verify update was called with the verified checksum
    expect(video.update).toHaveBeenCalledWith(
      expect.objectContaining({
        hostedKey: objectKey,
        pendingObjectKey: null,
        fileChecksumSha256: sha256hex,
      }),
      expect.objectContaining({ transaction: mockTransaction }),
    );
  });

  it('Mode A: returns 400 on checksum mismatch', async () => {
    const declaredHex = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const differentBase64 = Buffer.from(
      '1111111111111111111111111111111111111111111111111111111111111111',
      'hex',
    ).toString('base64');

    const video = makeVideo({
      uploadMode: 'A',
      declaredChecksum: declaredHex,
      declaredFileSize: 1024000,
      declaredMimeType: 'video/mp4',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    headObject.mockResolvedValue({
      contentLength: 1024000,
      contentType: 'video/mp4',
      checksumSHA256: differentBase64,
    });

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: 'vid-uuid-1', objectKey },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toContain('Checksum mismatch');
    // R2 object should be scheduled for deletion on checksum mismatch
    expect(deleteObject).toHaveBeenCalledWith(objectKey);
  });

  it('Mode B: enqueues checksum_verify job (no immediate checksum)', async () => {
    const video = makeVideo({
      uploadMode: 'B',
      declaredChecksum: null,
      declaredFileSize: 1024000,
      declaredMimeType: 'video/mp4',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: 'vid-uuid-1', objectKey },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    // fileChecksumSha256 should be null for Mode B (verified async)
    expect(video.update).toHaveBeenCalledWith(
      expect.objectContaining({
        hostedKey: objectKey,
        fileChecksumSha256: null,
      }),
      expect.anything(),
    );
    // Checksum job should be enqueued after transaction commits
    expect(addJob).toHaveBeenCalledWith('checksum_verify', {
      videoId: video.id,
      objectKey,
    });
  });

  it('returns 400 when required fields (videoId, objectKey) are missing', async () => {
    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: 'vid-uuid-1' }, // objectKey missing
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toContain('Missing required fields');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Publish Gate — publishVideo
// ═════════════════════════════════════════════════════════════════════════════
describe('publishVideo — Publish Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects publish when metadataCompleted is false (400)', async () => {
    const video = makeVideo({ metadataCompleted: false });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      params: { id: 'vid-uuid-1' },
      body: { publish: true },
    });
    const res = createMockResponse();

    await publishVideo(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toContain('metadata is not completed');
  });

  it('rejects publish when source="upload" and fileChecksumSha256 is null (400)', async () => {
    const video = makeVideo({
      metadataCompleted: true,
      source: 'upload',
      fileChecksumSha256: null,
    });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      params: { id: 'vid-uuid-1' },
      body: { publish: true },
    });
    const res = createMockResponse();

    await publishVideo(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toContain('missing checksum');
  });

  it('succeeds when both gates pass (metadata complete + checksum present)', async () => {
    const video = makeVideo({
      metadataCompleted: true,
      source: 'upload',
      fileChecksumSha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      params: { id: 'vid-uuid-1' },
      body: { publish: true },
    });
    const res = createMockResponse();

    await publishVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    expect(video.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' }),
    );
  });

  it('succeeds for YouTube source (no checksum required)', async () => {
    const video = makeVideo({
      metadataCompleted: true,
      source: 'youtube',
      fileChecksumSha256: null, // YouTube videos have no checksum
    });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      params: { id: 'vid-uuid-1' },
      body: { publish: true },
    });
    const res = createMockResponse();

    await publishVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(video.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' }),
    );
  });

  it('unpublish sets status to draft and clears publishedAt', async () => {
    const video = makeVideo({ status: 'published' });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      params: { id: 'vid-uuid-1' },
      body: { publish: false },
    });
    const res = createMockResponse();

    await publishVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(video.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', publishedAt: null }),
    );
  });

  it('returns 404 for non-existent video', async () => {
    mockVideoCatalogModel.findByPk.mockResolvedValue(null);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      params: { id: 'non-existent-id' },
      body: { publish: true },
    });
    const res = createMockResponse();

    await publishVideo(req, res);

    expect(res.statusCode).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Watch Entitlement — watchVideo (probing-resistant)
// ═════════════════════════════════════════════════════════════════════════════
describe('watchVideo — Entitlement & Anti-Probing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for non-existent video', async () => {
    mockVideoCatalogModel.findOne.mockResolvedValue(null);

    const req = createMockRequest({
      params: { slug: 'does-not-exist' },
      user: null,
    });
    const res = createEnhancedMockResponse();

    await watchVideo(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData.error).toBe('not_found');
  });

  it('returns 404 for unpublished video when user is not admin (anti-probing)', async () => {
    const video = makeVideo({ status: 'draft', slug: 'secret-draft' });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    const req = createMockRequest({
      params: { slug: 'secret-draft' },
      user: { id: 5, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await watchVideo(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData.error).toBe('not_found');
  });

  it('anti-probing: unpublished and non-existent return IDENTICAL response shape', async () => {
    // First: non-existent
    mockVideoCatalogModel.findOne.mockResolvedValue(null);

    const reqNotFound = createMockRequest({
      params: { slug: 'nonexistent' },
      user: { id: 5, role: 'client' },
    });
    const resNotFound = createEnhancedMockResponse();
    await watchVideo(reqNotFound, resNotFound);

    // Second: unpublished
    const video = makeVideo({ status: 'draft' });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    const reqDraft = createMockRequest({
      params: { slug: 'draft-video' },
      user: { id: 5, role: 'client' },
    });
    const resDraft = createEnhancedMockResponse();
    await watchVideo(reqDraft, resDraft);

    // Both must have identical status + body (anti-probing)
    expect(resNotFound.statusCode).toBe(resDraft.statusCode);
    expect(resNotFound.jsonData).toEqual(resDraft.jsonData);
  });

  it('returns 401 for login_required (members-only video, anonymous user)', async () => {
    const video = makeVideo({
      status: 'published',
      visibility: 'members_only',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({
      allowed: false,
      reason: 'login_required',
    });

    const req = createMockRequest({
      params: { slug: 'members-only-video' },
      user: null,
    });
    const res = createEnhancedMockResponse();

    await watchVideo(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.error).toBe('login_required');
  });

  it('returns 403 for access_denied (premium video, user without grant)', async () => {
    const video = makeVideo({
      status: 'published',
      visibility: 'members_only',
      accessTier: 'premium',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({
      allowed: false,
      reason: 'premium_required',
    });

    const req = createMockRequest({
      params: { slug: 'premium-video' },
      user: { id: 5, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await watchVideo(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe('access_denied');
  });

  it('returns 200 with video data when entitlement is granted (hosted)', async () => {
    const video = makeVideo({
      status: 'published',
      visibility: 'public',
      source: 'upload',
      hostedKey: 'videos/1/2026-02/uuid.mp4',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({
      allowed: true,
      signedUrl: 'https://r2.example.com/signed-playback',
      captionsUrl: null,
    });

    const req = createMockRequest({
      params: { slug: 'test-video' },
      user: { id: 5, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await watchVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.signedUrl).toBe('https://r2.example.com/signed-playback');
    expect(res.jsonData.data.video).toBeDefined();
    // Internal fields must be stripped
    expect(res.jsonData.data.video.hostedKey).toBeUndefined();
    expect(res.jsonData.data.video.pendingObjectKey).toBeUndefined();
    expect(res.jsonData.data.video.declaredChecksum).toBeUndefined();
    expect(res.jsonData.data.video.fileChecksumSha256).toBeUndefined();
    expect(res.jsonData.data.video.uploadMode).toBeUndefined();
  });

  it('returns 200 with youtubeVideoId for YouTube source', async () => {
    const video = makeVideo({
      status: 'published',
      visibility: 'public',
      source: 'youtube',
      youtubeVideoId: 'dQw4w9WgXcQ',
    });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({
      allowed: true,
      signedUrl: null,
      captionsUrl: null,
    });

    const req = createMockRequest({
      params: { slug: 'youtube-video' },
      user: { id: 5, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await watchVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.data.youtubeVideoId).toBe('dQw4w9WgXcQ');
    // Should NOT have signedUrl field for YouTube
    expect(res.jsonData.data.signedUrl).toBeUndefined();
  });

  it('sets Cache-Control: private, no-store header', async () => {
    const video = makeVideo({ status: 'published', visibility: 'public' });
    mockVideoCatalogModel.findOne.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({ allowed: true, signedUrl: null, captionsUrl: null });

    const req = createMockRequest({
      params: { slug: 'test-video' },
      user: { id: 1, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await watchVideo(req, res);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Refresh URL — Uniform 403 (no info leakage)
// ═════════════════════════════════════════════════════════════════════════════
describe('refreshUrl — Uniform 403 (Anti-Leakage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper: all failure cases must produce IDENTICAL 403 response
  const expect403Uniform = (res) => {
    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toEqual({ success: false, error: 'access_denied' });
  };

  it('returns 403 { error: "access_denied" } when video not found', async () => {
    mockVideoCatalogModel.findByPk.mockResolvedValue(null);

    const req = createMockRequest({
      params: { id: 'non-existent' },
      user: { id: 1, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await refreshUrl(req, res);

    expect403Uniform(res);
  });

  it('returns 403 { error: "access_denied" } for YouTube-source video', async () => {
    const video = makeVideo({ source: 'youtube' });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    const req = createMockRequest({
      params: { id: 'vid-uuid-1' },
      user: { id: 1, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await refreshUrl(req, res);

    expect403Uniform(res);
  });

  it('returns 403 { error: "access_denied" } when entitlement denied', async () => {
    const video = makeVideo({ source: 'upload' });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({
      allowed: false,
      reason: 'premium_required',
    });

    const req = createMockRequest({
      params: { id: 'vid-uuid-1' },
      user: { id: 5, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await refreshUrl(req, res);

    expect403Uniform(res);
  });

  it('returns 403 { error: "access_denied" } when signedUrl is null', async () => {
    const video = makeVideo({ source: 'upload' });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({
      allowed: true,
      signedUrl: null, // Allowed but no URL (edge case)
    });

    const req = createMockRequest({
      params: { id: 'vid-uuid-1' },
      user: { id: 1, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await refreshUrl(req, res);

    expect403Uniform(res);
  });

  it('all failure paths produce byte-identical response bodies (no type leakage)', async () => {
    // Collect responses from all four failure scenarios
    const responses = [];

    // 1. Not found
    mockVideoCatalogModel.findByPk.mockResolvedValue(null);
    let req = createMockRequest({ params: { id: 'x' }, user: { id: 1, role: 'client' } });
    let res = createEnhancedMockResponse();
    await refreshUrl(req, res);
    responses.push(res.jsonData);

    // 2. YouTube source
    mockVideoCatalogModel.findByPk.mockResolvedValue(makeVideo({ source: 'youtube' }));
    req = createMockRequest({ params: { id: 'x' }, user: { id: 1, role: 'client' } });
    res = createEnhancedMockResponse();
    await refreshUrl(req, res);
    responses.push(res.jsonData);

    // 3. Entitlement denied
    mockVideoCatalogModel.findByPk.mockResolvedValue(makeVideo({ source: 'upload' }));
    canAccessVideo.mockResolvedValue({ allowed: false, reason: 'not_member' });
    req = createMockRequest({ params: { id: 'x' }, user: { id: 1, role: 'client' } });
    res = createEnhancedMockResponse();
    await refreshUrl(req, res);
    responses.push(res.jsonData);

    // 4. No signedUrl
    canAccessVideo.mockResolvedValue({ allowed: true, signedUrl: null });
    req = createMockRequest({ params: { id: 'x' }, user: { id: 1, role: 'client' } });
    res = createEnhancedMockResponse();
    await refreshUrl(req, res);
    responses.push(res.jsonData);

    // All four must be deep-equal (no extra fields that leak failure type)
    const canonical = JSON.stringify(responses[0]);
    for (let i = 1; i < responses.length; i++) {
      expect(JSON.stringify(responses[i])).toBe(canonical);
    }
  });

  it('returns 200 with signedUrl when entitlement is granted', async () => {
    const video = makeVideo({ source: 'upload' });
    mockVideoCatalogModel.findByPk.mockResolvedValue(video);

    canAccessVideo.mockResolvedValue({
      allowed: true,
      signedUrl: 'https://r2.example.com/fresh-signed-url',
    });

    const req = createMockRequest({
      params: { id: 'vid-uuid-1' },
      user: { id: 1, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await refreshUrl(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.signedUrl).toBe('https://r2.example.com/fresh-signed-url');
    expect(res.jsonData.data.expiresAt).toBeDefined();
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('returns 403 even on internal server errors (uniform error)', async () => {
    mockVideoCatalogModel.findByPk.mockRejectedValue(new Error('DB connection lost'));

    const req = createMockRequest({
      params: { id: 'vid-uuid-1' },
      user: { id: 1, role: 'client' },
    });
    const res = createEnhancedMockResponse();

    await refreshUrl(req, res);

    expect403Uniform(res);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. isUniqueViolation Helper
// ═════════════════════════════════════════════════════════════════════════════
describe('isUniqueViolation — Dual Detection', () => {
  // We test this indirectly through createVideo/requestUploadUrl slug retry logic.
  // The isUniqueViolation function is not exported, but its behavior is observable
  // through createWithSlugRetry, which is used by requestUploadUrl.

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('catches SequelizeUniqueConstraintError by name and retries slug', async () => {
    const uniqueError = new Error('Unique constraint violated');
    uniqueError.name = 'SequelizeUniqueConstraintError';

    // First call: unique violation → retry with -2 suffix
    // Second call: success
    const createdVideo = makeVideo({ id: 'new-vid', slug: 'workout-2' });
    mockVideoCatalogModel.create
      .mockRejectedValueOnce(uniqueError)
      .mockResolvedValueOnce(createdVideo);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        contentType: 'video/mp4',
        fileSize: '1024000',
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(200);
    // create was called twice (first failed, second succeeded)
    expect(mockVideoCatalogModel.create).toHaveBeenCalledTimes(2);
    // Second call should have the -2 slug suffix
    const secondCallData = mockVideoCatalogModel.create.mock.calls[1][0];
    expect(secondCallData.slug).toMatch(/-2$/);
  });

  it('catches PG error code 23505 (even without SequelizeUniqueConstraintError name)', async () => {
    const pgError = new Error('duplicate key value violates unique constraint');
    pgError.name = 'SomeOtherError'; // NOT the Sequelize name
    pgError.original = { code: '23505' }; // PG error code

    const createdVideo = makeVideo({ id: 'new-vid', slug: 'workout-2' });
    mockVideoCatalogModel.create
      .mockRejectedValueOnce(pgError)
      .mockResolvedValueOnce(createdVideo);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        contentType: 'video/mp4',
        fileSize: '1024000',
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockVideoCatalogModel.create).toHaveBeenCalledTimes(2);
  });

  it('does NOT catch non-unique errors (rethrows)', async () => {
    const otherError = new Error('connection refused');
    otherError.name = 'SequelizeDatabaseError';
    // No .original.code = '23505'

    mockVideoCatalogModel.create.mockRejectedValue(otherError);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        contentType: 'video/mp4',
        fileSize: '1024000',
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    // Should return 500 (not retried, error propagated)
    expect(res.statusCode).toBe(500);
    // create was called only once (no retry)
    expect(mockVideoCatalogModel.create).toHaveBeenCalledTimes(1);
  });

  it('exhausts all retry attempts and falls back to timestamp slug', async () => {
    const uniqueError = new Error('Unique constraint violated');
    uniqueError.name = 'SequelizeUniqueConstraintError';

    // Fail on base slug, -2, -3, -4 → succeed on timestamp fallback
    const createdVideo = makeVideo({ id: 'new-vid', slug: 'workout-1708000000000' });
    mockVideoCatalogModel.create
      .mockRejectedValueOnce(uniqueError) // base slug
      .mockRejectedValueOnce(uniqueError) // -2
      .mockRejectedValueOnce(uniqueError) // -3
      .mockRejectedValueOnce(uniqueError) // -4
      .mockResolvedValueOnce(createdVideo); // timestamp fallback

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: {
        filename: 'workout.mp4',
        contentType: 'video/mp4',
        fileSize: '1024000',
      },
    });
    const res = createMockResponse();

    await requestUploadUrl(req, res);

    expect(res.statusCode).toBe(200);
    // 5 calls: base, -2, -3, -4, timestamp fallback
    expect(mockVideoCatalogModel.create).toHaveBeenCalledTimes(5);
    // The fifth call should have a timestamp-based slug
    const fifthCallSlug = mockVideoCatalogModel.create.mock.calls[4][0].slug;
    expect(fifthCallSlug).toMatch(/^workout-\d+$/);
  });
});
