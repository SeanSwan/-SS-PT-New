import { afterEach, describe, expect, it } from 'vitest';
import {
  PAGE_VIEW_BUFFER,
  anonymizeVisitorIp,
  bufferPageView,
  sanitizePagePath,
  sanitizeReferrer,
  shouldSkipPageViewPath,
  summarizeUserAgent,
} from '../../services/pageViewCache.mjs';

describe('page view privacy helpers', () => {
  afterEach(() => {
    PAGE_VIEW_BUFFER.length = 0;
    delete process.env.PAGE_VIEW_ANONYMIZATION_SALT;
  });

  it('turns raw visitor IPs into stable non-reversible visitor keys', () => {
    process.env.PAGE_VIEW_ANONYMIZATION_SALT = 'test-page-view-salt';

    const key = anonymizeVisitorIp('203.0.113.42');

    expect(key).toMatch(/^pv_[a-f0-9]{32}$/);
    expect(key).toBe(anonymizeVisitorIp('203.0.113.42'));
    expect(key).not.toContain('203.0.113.42');
  });

  it('strips query strings and reduces raw user agents before buffering', () => {
    process.env.PAGE_VIEW_ANONYMIZATION_SALT = 'test-page-view-salt';
    const visitorKey = anonymizeVisitorIp('203.0.113.42');
    const referrer = sanitizeReferrer('https://example.com/landing?email=client@example.com#signup');
    const page = sanitizePagePath('/store?coupon=private#cart');
    const userAgent = summarizeUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36'
    );

    bufferPageView({
      visitorKey,
      pages: [page],
      referrer,
      userAgent,
      pageCount: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      geo: { country: 'United States', countryCode: 'US', region: 'WA', city: 'Seattle' },
    });

    expect(PAGE_VIEW_BUFFER).toHaveLength(1);
    expect(PAGE_VIEW_BUFFER[0]).toMatchObject({
      ip: visitorKey,
      page: '/store',
      referrer: 'https://example.com/landing',
      userAgent: 'desktop:chrome',
    });
    expect(JSON.stringify(PAGE_VIEW_BUFFER[0])).not.toContain('203.0.113.42');
    expect(JSON.stringify(PAGE_VIEW_BUFFER[0])).not.toContain('client@example.com');
    expect(JSON.stringify(PAGE_VIEW_BUFFER[0])).not.toContain('Mozilla/5.0');
  });
  it('tracks public signup and register pages while skipping admin and login surfaces', () => {
    expect(shouldSkipPageViewPath('/signup')).toBe(false);
    expect(shouldSkipPageViewPath('/register')).toBe(false);
    expect(shouldSkipPageViewPath('/auth/register')).toBe(false);
    expect(shouldSkipPageViewPath('/auth/signup')).toBe(false);

    expect(shouldSkipPageViewPath(null)).toBe(true);
    expect(shouldSkipPageViewPath('/dashboard/admin/overview')).toBe(true);
    expect(shouldSkipPageViewPath('/login')).toBe(true);
    expect(shouldSkipPageViewPath('/auth')).toBe(true);
    expect(shouldSkipPageViewPath('/auth/login')).toBe(true);
  });
});
