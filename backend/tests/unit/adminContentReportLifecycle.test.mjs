/**
 * SWA-138 S2 — PostReport lifecycle route/controller contract.
 * The original defect class: PostReportsWidget's blueprint promised
 * Resolve/Dismiss while no route or controller method existed. These
 * tests lock the wiring so the promise can never go dark again.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import adminContentModerationController from '../../controllers/adminContentModerationController.mjs';
import { PostReport } from '../../models/social/index.mjs';

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function fakeReport(overrides = {}) {
  return {
    id: 5,
    status: 'pending',
    actionTaken: null,
    resolvedAt: null,
    resolve: vi.fn(async function resolveImpl(adminId, action, notes) {
      this.status = 'resolved';
      this.actionTaken = action;
      this.adminNotes = notes;
      this.resolvedAt = new Date('2026-08-04T12:00:00Z');
      return this;
    }),
    dismiss: vi.fn(async function dismissImpl(adminId, notes) {
      this.status = 'dismissed';
      this.actionTaken = 'no-action';
      this.adminNotes = notes;
      this.resolvedAt = new Date('2026-08-04T12:00:00Z');
      return this;
    }),
    ...overrides,
  };
}

const adminReq = (params, body = {}) => ({
  params,
  body,
  user: { id: 7, email: 'admin@example.test' },
});

describe('resolveReport', () => {
  beforeEach(() => {
    vi.spyOn(PostReport, 'findByPk');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects an invalid actionTaken with 400 before touching the DB', async () => {
    const res = createResponse();
    await adminContentModerationController.resolveReport(
      adminReq({ id: '5' }, { actionTaken: 'nuke-from-orbit' }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(PostReport.findByPk).not.toHaveBeenCalled();
  });

  it('404s when the report does not exist', async () => {
    PostReport.findByPk.mockResolvedValue(null);
    const res = createResponse();
    await adminContentModerationController.resolveReport(
      adminReq({ id: '999' }, { actionTaken: 'no-action' }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });

  it('409s when another admin already finalized the report', async () => {
    PostReport.findByPk.mockResolvedValue(fakeReport({ status: 'resolved' }));
    const res = createResponse();
    await adminContentModerationController.resolveReport(
      adminReq({ id: '5' }, { actionTaken: 'content-removed' }),
      res,
    );
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe('Report already resolved');
  });

  it('resolves a pending report through the model method with the acting admin id', async () => {
    const report = fakeReport();
    PostReport.findByPk.mockResolvedValue(report);
    const res = createResponse();
    await adminContentModerationController.resolveReport(
      adminReq({ id: '5' }, { actionTaken: 'content-removed', adminNotes: 'spam ring' }),
      res,
    );
    expect(report.resolve).toHaveBeenCalledWith(7, 'content-removed', 'spam ring');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { id: '5', status: 'resolved', actionTaken: 'content-removed' },
    });
  });
});

describe('dismissReport', () => {
  beforeEach(() => {
    vi.spyOn(PostReport, 'findByPk');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('404s when the report does not exist', async () => {
    PostReport.findByPk.mockResolvedValue(null);
    const res = createResponse();
    await adminContentModerationController.dismissReport(adminReq({ id: '999' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('409s when already finalized', async () => {
    PostReport.findByPk.mockResolvedValue(fakeReport({ status: 'dismissed' }));
    const res = createResponse();
    await adminContentModerationController.dismissReport(adminReq({ id: '5' }), res);
    expect(res.statusCode).toBe(409);
  });

  it('dismisses a pending report through the model method', async () => {
    const report = fakeReport();
    PostReport.findByPk.mockResolvedValue(report);
    const res = createResponse();
    await adminContentModerationController.dismissReport(
      adminReq({ id: '5' }, { adminNotes: 'not a violation' }),
      res,
    );
    expect(report.dismiss).toHaveBeenCalledWith(7, 'not a violation');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { id: '5', status: 'dismissed', actionTaken: 'no-action' },
    });
  });
});

describe('route wiring (the original never-built defect)', () => {
  const SOURCE = readFileSync(
    resolvePath(process.cwd(), 'routes/adminContentModerationRoutes.mjs'),
    'utf8',
  );

  it('registers PATCH /reports/:id/resolve and /reports/:id/dismiss on the router', () => {
    expect(SOURCE).toContain(
      "router.patch('/reports/:id/resolve', adminContentModerationController.resolveReport)",
    );
    expect(SOURCE).toContain(
      "router.patch('/reports/:id/dismiss', adminContentModerationController.dismissReport)",
    );
  });
});
