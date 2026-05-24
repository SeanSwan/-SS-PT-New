import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin content moderation truth contract', () => {
  it('fails closed instead of returning fabricated moderation data', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/adminContentModerationController.mjs'), 'utf8');

    expect(source).not.toMatch(/fallback to mock/i);
    expect(source).not.toMatch(/using fallback data/i);
    expect(source).not.toContain('fallback: true');
    expect(source).not.toContain('getMockPosts');
    expect(source).not.toContain('getMockComments');
    expect(source).not.toContain('getMockReports');
    expect(source).toContain('throw dbError');
  });

  it('does not return synthetic moderation trend or reason metrics', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/adminContentModerationController.mjs'), 'utf8');

    expect(source).not.toMatch(/dailyModerations:\s*\[[0-9,\s]+\]/);
    expect(source).not.toMatch(/flaggedContent:\s*\[[0-9,\s]+\]/);
    expect(source).not.toMatch(/resolvedReports:\s*\[[0-9,\s]+\]/);
    expect(source).not.toMatch(/Inappropriate content['"],\s*count:\s*25/);
    expect(source).not.toMatch(/Spam['"],\s*count:\s*18/);
    expect(source).not.toContain('sequelize.Op');
    expect(source).toContain('ModerationAction.findAll');
  });

  it('logs status changes with ModerationAction enum-compatible actions', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/adminContentModerationController.mjs'), 'utf8');

    expect(source).not.toContain("action: 'status-update'");
    expect(source).toContain('getModerationAuditAction(status)');
  });

  it('bulk moderation delegates to real moderation logic instead of unconditional success rows', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/adminContentModerationRoutes.mjs'), 'utf8');

    expect(source).not.toMatch(/Mock bulk action/i);
    expect(source).not.toMatch(/contentIds\.map\(id => \(\{/);
    expect(source).toContain('adminContentModerationController.moderateContent');
    expect(source).toContain('successful: results.filter(result => result.success).length');
  });

  it('queue alias captures controller payloads instead of reading undefined returns', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/adminContentModerationRoutes.mjs'), 'utf8');

    expect(source).not.toContain('json: (data) => data');
    expect(source).not.toContain('postsResponse.data');
    expect(source).not.toContain('commentsResponse.data');
    expect(source).toContain('getModerationQueueSegment');
  });

  it('does not expose raw moderation route errors to admin clients', () => {
    const controllerSource = readFileSync(resolve(__dirname, '../../controllers/adminContentModerationController.mjs'), 'utf8');
    const routeSource = readFileSync(resolve(__dirname, '../../routes/adminContentModerationRoutes.mjs'), 'utf8');

    expect(controllerSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(controllerSource).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
    expect(routeSource).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
    expect(controllerSource).not.toContain('error: error.message');
    expect(routeSource).not.toContain('error: error.message');
    expect(controllerSource).toContain('Database query failures return a stable internal_error code to clients');
  });

  it('bounds bulk moderation alias payloads before dispatching controller work', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/adminContentModerationRoutes.mjs'), 'utf8');

    expect(source).toContain("const BULK_ACTIONS = new Set(['approve', 'reject', 'flag', 'hide', 'delete'])");
    expect(source).toContain("const BULK_CONTENT_TYPES = new Set(['post', 'comment'])");
    expect(source).toContain('const MAX_BULK_CONTENT_IDS = 50');
    expect(source).toContain('contentIds.length > MAX_BULK_CONTENT_IDS');
    expect(source).toContain('!contentIds.every(isValidContentId)');
    expect(source).toContain("message: 'Invalid bulk moderation payload'");
  });
});
