/**
 * GeoIP Service
 * =============
 * Looks up visitor location (country, city, region, lat/lon) from IP address.
 * Uses ip-api.com (free tier: 45 req/min, no API key needed).
 * Non-blocking — never fails the parent request if lookup fails.
 */
import logger from '../utils/logger.mjs';

const CACHE = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Look up geo data for an IP address.
 * Returns { country, countryCode, region, city, lat, lon } or null.
 */
export async function lookupGeo(ip) {
  if (!ip) return null;

  // Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  let cleanIp = ip;
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }

  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.')) {
    return null; // Skip private/localhost IPs
  }

  // Check cache (use cleanIp as key)
  const cached = CACHE.get(cleanIp);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,lat,lon`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status !== 'success') return null;

    const geo = {
      country: data.country,
      countryCode: data.countryCode,
      region: data.regionName,
      city: data.city,
      lat: data.lat,
      lon: data.lon,
    };

    CACHE.set(cleanIp, { data: geo, ts: Date.now() });

    // Prune cache if it gets too large
    if (CACHE.size > 5000) {
      const oldest = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(0, 1000);
      for (const [key] of oldest) CACHE.delete(key);
    }

    return geo;
  } catch (err) {
    logger.debug('[GeoIP] Lookup failed for %s: %s', cleanIp, err.message);
    return null;
  }
}

/**
 * Extract client IP from Express request (handles proxies).
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be comma-separated; first is the real client
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || null;
}

export default { lookupGeo, getClientIp };
