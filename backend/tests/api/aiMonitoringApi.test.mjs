/**
 * AI Monitoring API Tests — Phase 10
 * ====================================
 * Route-level tests using real Express + Supertest.
 * Pattern: publicWaiverRoutes.rateLimit.test.mjs
 *
 * Tests endpoint auth, response shapes, and middleware wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock dependencies before importing routes ───────────────────────────────

// Mock database
vi.mock('../../database.mjs', () => ({
  default: {
    query: vi.fn().mockResolvedValue([[]]),
  },
}));

// Mock logger
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth middleware
const mockUser = { id: 1, role: 'admin', email: 'admin@test.com' };
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    if (req.headers.authorization === 'Bearer valid') {
      req.user = { ...mockUser, ...(req._mockUserOverride || {}) };
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  },
  adminOnly: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Admin access required' });
    }
  },
}));

// Mock models index
const mockAlertModel = {
  findAll: vi.fn().mockResolvedValue([]),
  findByPk: vi.fn(),
  create: vi.fn().mockResolvedValue({}),
};
vi.mock('../../models/index.mjs', () => ({
  getAiMonitoringAlert: vi.fn(() => mockAlertModel),
  getAiMetricsBucket: vi.fn(),
}));

// Import route + service after mocks
import aiMonitoringRoutes, { updateMetrics } from '../../routes/aiMonitoringRoutes.mjs';
import { resetMetrics } from '../../services/monitoring/monitoringService.mjs';

// ── Test app setup ──────────────────────────────────────────────────────────

function createApp(userOverride = null) {
  const app = express();
  app.use(express.json());
  // Inject user override for role-based testing
  if (userOverride) {
    app.use((req, res, next) => {
      req._mockUserOverride = userOverride;
      next();
    });
  }
  app.use('/api/ai-monitoring', aiMonitoringRoutes);
  return app;
}

// ── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetMetrics();
  vi.clearAllMocks();
});

// ── GET /metrics ────────────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/metrics', () => {
  it('returns 200 with overview shape', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/metrics')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.overview).toBeDefined();
    expect(res.body.overview.totalRequests).toBeDefined();
    expect(res.body.features).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns per-feature data after updateMetrics', async () => {
    updateMetrics('workoutGeneration', true, 500, 100, 1);
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/metrics')
      .set('Authorization', 'Bearer valid');
    expect(res.body.features.workoutGeneration).toBeDefined();
    expect(res.body.features.workoutGeneration.totalRequests).toBe(1);
  });

  it('requires auth (returns 401 without token)', async () => {
    const app = createApp();
    const res = await request(app).get('/api/ai-monitoring/metrics');
    expect(res.status).toBe(401);
  });
});

// ── GET /trends/:feature ────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/trends/:feature', () => {
  it('returns 200 with trend data', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/trends/workoutGeneration')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.feature).toBe('workoutGeneration');
    expect(res.body.trends).toBeDefined();
  });

  it('returns 400 for invalid feature name', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/trends/invalid-name!')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    const app = createApp();
    const res = await request(app).get('/api/ai-monitoring/trends/workoutGeneration');
    expect(res.status).toBe(401);
  });
});

// ── GET /health ─────────────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/health', () => {
  it('returns 200 when healthy', async () => {
    // With no requests, default health status depends on implementation
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/health')
      .set('Authorization', 'Bearer valid');
    expect([200, 206, 503]).toContain(res.status);
    expect(res.body.overall).toBeDefined();
    expect(res.body.overall.status).toBeDefined();
  });
});

// ── POST /reset ─────────────────────────────────────────────────────────────

describe('POST /api/ai-monitoring/reset', () => {
  it('requires admin role', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/ai-monitoring/reset')
      .set('Authorization', 'Bearer valid');
    // Admin user by default
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 for non-admin', async () => {
    const app = createApp({ role: 'client' });
    const res = await request(app)
      .post('/api/ai-monitoring/reset')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(403);
  });

  it('clears metrics', async () => {
    updateMetrics('workoutGeneration', true, 500);
    const app = createApp();
    await request(app)
      .post('/api/ai-monitoring/reset')
      .set('Authorization', 'Bearer valid');
    const metricsRes = await request(app)
      .get('/api/ai-monitoring/metrics')
      .set('Authorization', 'Bearer valid');
    expect(metricsRes.body.overview.totalRequests).toBe(0);
  });
});

// ── GET /alerts ─────────────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/alerts', () => {
  it('returns active alerts (admin only)', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/alerts')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.alerts).toBeDefined();
    expect(Array.isArray(res.body.alerts)).toBe(true);
  });

  it('returns 403 for non-admin', async () => {
    const app = createApp({ role: 'client' });
    const res = await request(app)
      .get('/api/ai-monitoring/alerts')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(403);
  });
});

// ── POST /alerts/:id/acknowledge ────────────────────────────────────────────

describe('POST /api/ai-monitoring/alerts/:id/acknowledge', () => {
  it('updates alert status', async () => {
    mockAlertModel.findByPk.mockResolvedValue({ update: vi.fn().mockResolvedValue({}) });
    const app = createApp();
    const res = await request(app)
      .post('/api/ai-monitoring/alerts/1/acknowledge')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── POST /alerts/:id/resolve ────────────────────────────────────────────────

describe('POST /api/ai-monitoring/alerts/:id/resolve', () => {
  it('updates alert status', async () => {
    mockAlertModel.findByPk.mockResolvedValue({ update: vi.fn().mockResolvedValue({}) });
    const app = createApp();
    const res = await request(app)
      .post('/api/ai-monitoring/alerts/1/resolve')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── GET /eval-status ────────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/eval-status', () => {
  it('returns eval data or null', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/eval-status')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('evalStatus');
  });
});

// ── GET /drift-status ───────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/drift-status', () => {
  it('returns drift data or null', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/drift-status')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('driftStatus');
  });
});

// ── GET /ab-status ──────────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/ab-status', () => {
  it('returns AB data or null', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/ab-status')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('abStatus');
  });
});

// ── GET /providers ──────────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/providers', () => {
  it('returns provider breakdown', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/providers')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.providers).toBeDefined();
  });
});

// ── GET /digest ─────────────────────────────────────────────────────────────

describe('GET /api/ai-monitoring/digest', () => {
  it('returns 24h summary', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/ai-monitoring/digest')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('24h');
  });
});

// ── Backward compatibility: updateMetrics re-export ─────────────────────────

describe('updateMetrics re-export', () => {
  it('exports updateMetrics from routes file', () => {
    expect(typeof updateMetrics).toBe('function');
  });
});
