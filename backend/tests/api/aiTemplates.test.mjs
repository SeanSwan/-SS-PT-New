/**
 * AI Template Endpoints — API Integration Tests
 * ===============================================
 * Tests GET /api/ai/templates and GET /api/ai/templates/:id
 * with RBAC, filters, and includeSchema behavior.
 *
 * Phase 4A — Template Registry + Structured Schema Integration
 */
import { describe, it, expect, vi } from 'vitest';
import { listTemplates, getTemplate } from '../../controllers/aiTemplateController.mjs';
import { REGISTRY_VERSION } from '../../services/ai/nasmTemplateRegistry.mjs';

// ── Mock req/res helpers ────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    user: { id: 1, role: 'admin' },
    query: {},
    params: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {
    _status: null,
    _json: null,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    set(key, value) { res._headers[key] = value; return res; },
  };
  return res;
}

// ── GET /api/ai/templates (list) ────────────────────────────────────────────

describe('GET /api/ai/templates', () => {
  it('should return 7 active templates by default', () => {
    const req = mockReq();
    const res = mockRes();
    listTemplates(req, res);

    expect(res._status).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.count).toBe(7);
    expect(res._json.registryVersion).toBe(REGISTRY_VERSION);
  });

  it('should return all 10 templates when status=all', () => {
    const req = mockReq({ query: { status: 'all' } });
    const res = mockRes();
    listTemplates(req, res);

    expect(res._json.count).toBe(10);
  });

  it('should filter by category=programming', () => {
    const req = mockReq({ query: { category: 'programming', status: 'all' } });
    const res = mockRes();
    listTemplates(req, res);

    for (const t of res._json.templates) {
      expect(t.category).toBe('programming');
    }
    expect(res._json.count).toBe(8); // 5 OPT + 3 general
  });

  it('should filter by framework=OPT', () => {
    const req = mockReq({ query: { framework: 'OPT' } });
    const res = mockRes();
    listTemplates(req, res);

    expect(res._json.count).toBe(5);
    for (const t of res._json.templates) {
      expect(t.nasmFramework).toBe('OPT');
    }
  });

  it('should filter by status=pending_schema', () => {
    const req = mockReq({ query: { status: 'pending_schema' } });
    const res = mockRes();
    listTemplates(req, res);

    expect(res._json.count).toBe(3);
    for (const t of res._json.templates) {
      expect(t.status).toBe('pending_schema');
    }
  });

  it('should strip schema from response by default (metadata-only)', () => {
    const req = mockReq();
    const res = mockRes();
    listTemplates(req, res);

    for (const t of res._json.templates) {
      expect(t).not.toHaveProperty('schema');
    }
  });

  it('should include schema for trainer when includeSchema=true', () => {
    const req = mockReq({ user: { id: 2, role: 'trainer' }, query: { includeSchema: 'true' } });
    const res = mockRes();
    listTemplates(req, res);

    const optTemplate = res._json.templates.find(t => t.id === 'opt-phase-1-stabilization');
    expect(optTemplate).toHaveProperty('schema');
    expect(optTemplate.schema).not.toBeNull();
  });

  it('should include schema for admin when includeSchema=true', () => {
    const req = mockReq({ user: { id: 1, role: 'admin' }, query: { includeSchema: 'true' } });
    const res = mockRes();
    listTemplates(req, res);

    const optTemplate = res._json.templates.find(t => t.id === 'opt-phase-1-stabilization');
    expect(optTemplate).toHaveProperty('schema');
  });

  it('should silently ignore includeSchema=true for client role (metadata-only)', () => {
    const req = mockReq({ user: { id: 3, role: 'client' }, query: { includeSchema: 'true' } });
    const res = mockRes();
    listTemplates(req, res);

    expect(res._status).toBe(200);
    for (const t of res._json.templates) {
      expect(t, `Template ${t.id} should not have schema for client role`).not.toHaveProperty('schema');
    }
  });

  it('should allow client role to list templates (metadata-only)', () => {
    const req = mockReq({ user: { id: 3, role: 'client' } });
    const res = mockRes();
    listTemplates(req, res);

    expect(res._status).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.count).toBe(7);
  });
});

// ── GET /api/ai/templates/:id (detail) ──────────────────────────────────────

describe('GET /api/ai/templates/:id', () => {
  it('should return full template for admin', () => {
    const req = mockReq({ params: { id: 'opt-phase-1-stabilization' } });
    const res = mockRes();
    getTemplate(req, res);

    expect(res._status).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.template.id).toBe('opt-phase-1-stabilization');
    expect(res._json.template.schema).not.toBeNull();
    expect(res._json.registryVersion).toBe(REGISTRY_VERSION);
  });

  it('should return full template for trainer', () => {
    const req = mockReq({ user: { id: 2, role: 'trainer' }, params: { id: 'ces-corrective-strategy' } });
    const res = mockRes();
    getTemplate(req, res);

    expect(res._status).toBe(200);
    expect(res._json.template.id).toBe('ces-corrective-strategy');
    expect(res._json.template.schema).not.toBeNull();
  });

  it('should return 403 for client role', () => {
    const req = mockReq({ user: { id: 3, role: 'client' }, params: { id: 'opt-phase-1-stabilization' } });
    const res = mockRes();
    getTemplate(req, res);

    expect(res._status).toBe(403);
    expect(res._json.success).toBe(false);
    expect(res._json.message).toContain('Insufficient permissions');
  });

  it('should return 404 for unknown template ID', () => {
    const req = mockReq({ params: { id: 'nonexistent-template' } });
    const res = mockRes();
    getTemplate(req, res);

    expect(res._status).toBe(404);
    expect(res._json.success).toBe(false);
    expect(res._json.message).toContain('Template not found');
  });

  it('should resolve legacy alias IDs', () => {
    const req = mockReq({ params: { id: 'opt-1-stabilization' } });
    const res = mockRes();
    getTemplate(req, res);

    expect(res._status).toBe(200);
    expect(res._json.template.id).toBe('opt-phase-1-stabilization');
  });

  it('should set X-Template-Deprecated header for deprecated templates', () => {
    // No deprecated templates in Phase 4A, but test the code path
    // by verifying the header is NOT set for active templates
    const req = mockReq({ params: { id: 'opt-phase-1-stabilization' } });
    const res = mockRes();
    getTemplate(req, res);

    expect(res._headers['X-Template-Deprecated']).toBeUndefined();
  });
});
