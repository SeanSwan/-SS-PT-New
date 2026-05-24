import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/dashboard/sharedDashboardRoutes.mjs'), 'utf8');
const cacheSource = readFileSync(resolve(__dirname, '../../services/pageViewCache.mjs'), 'utf8');
const modelSource = readFileSync(resolve(__dirname, '../../models/PageView.mjs'), 'utf8');

describe('page view route privacy guard', () => {
  it('anonymizes visitor telemetry before cache and database buffering', () => {
    expect(routeSource).toContain('const rawIp = getClientIp(req);');
    expect(routeSource).toContain('const visitorKey = anonymizeVisitorIp(rawIp);');
    expect(routeSource).toContain('const pagePath = sanitizePagePath(page);');
    expect(routeSource).toContain('const sanitizedReferrer = sanitizeReferrer(referrer);');
    expect(routeSource).toContain('const userAgent = summarizeUserAgent(rawUserAgent);');
    expect(routeSource).toContain('PAGE_VIEW_CACHE.get(visitorKey)');
    expect(routeSource).toContain('PAGE_VIEW_CACHE.set(visitorKey, entry)');
    expect(routeSource).not.toContain('PAGE_VIEW_CACHE.get(ip)');
    expect(routeSource).not.toContain('PAGE_VIEW_CACHE.set(ip, entry)');
    expect(routeSource).not.toContain('userAgent.slice(0, 200)');
    expect(routeSource).not.toContain('referrer?.slice(0, 200)');
  });

  it('documents that the legacy page_views.ip field now stores an anonymized key', () => {
    expect(cacheSource).toContain('createHmac');
    expect(cacheSource).toContain('visitorKey ->');
    expect(cacheSource).toContain('ip: entry.visitorKey || entry.ip');
    expect(modelSource).toContain('Stores anonymized visitor key, never raw IP.');
  });
});
