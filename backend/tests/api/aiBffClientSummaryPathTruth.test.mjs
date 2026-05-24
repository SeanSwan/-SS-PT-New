import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const aiBffSource = readFileSync(resolve(__dirname, '../../routes/aiBffRoutes.mjs'), 'utf8');
const adminClientRoutesSource = readFileSync(resolve(__dirname, '../../routes/adminClientRoutes.mjs'), 'utf8');
const painEntryRoutesSource = readFileSync(resolve(__dirname, '../../routes/painEntryRoutes.mjs'), 'utf8');

describe('AI BFF client summary path truth contracts', () => {
  it('anchors the client summary BFF under the mounted admin AI BFF router', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin/ai-bff', aiBffRoutes)");
    expect(aiBffSource).toContain("router.get('/client-summary/:clientId'");
  });

  it('uses mounted internal sources for pain entries and workout stats', () => {
    expect(coreRoutesSource).toContain("app.use('/api/pain-entries', painEntryRoutes)");
    expect(painEntryRoutesSource).toContain("router.get('/:userId/active'");
    expect(adminClientRoutesSource).toContain("router.get('/clients/:clientId/workout-stats'");

    expect(aiBffSource).not.toContain('/api/pain/${clientId}/active');
    expect(aiBffSource).not.toContain('/api/admin/clients/${clientId}/workouts');
    expect(aiBffSource).toContain('/api/pain-entries/${clientId}/active');
    expect(aiBffSource).toContain('/api/admin/clients/${clientId}/workout-stats');
  });

  it('scopes client summary cache entries by requester and client', () => {
    expect(aiBffSource).not.toContain('const cacheKey = `client_summary_${clientId}`;');
    expect(aiBffSource).toContain("const requesterCacheScope = `${req.user?.role || 'unknown'}_${req.user?.id || 'anonymous'}`;");
    expect(aiBffSource).toContain('const cacheKey = `client_summary_${requesterCacheScope}_${clientId}`;');
  });
});
