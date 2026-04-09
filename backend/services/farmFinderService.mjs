/**
 * ============================================================================
 * FILE: farmFinderService.mjs
 * PURPOSE: USDA Farmers Market Directory proxy + distance-based search
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Searches the USDA Farmers Market Directory API for
 * nearby farmers markets by zip code or lat/lng coordinates. Returns market
 * details including products, schedule, and contact info.
 *
 * HOW IT FITS IN THE APP: Used by farm finder routes for the FarmFinderTab map.
 * KEY DECISIONS: USDA API is the primary source — if it's down, returns empty.
 * No local database caching (markets change seasonally).
 */
import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: USDA Farmers Market Directory API
// ─────────────────────────────────────────────────────────────
const USDA_BASE = 'https://search.ams.usda.gov/farmersmarkets/v1/data.svc';

/**
 * Search for farmers markets near a zip code.
 * @param {string} zip - 5-digit US zip code
 * @returns {Object[]} Array of { id, marketname (includes distance) }
 */
export async function searchByZip(zip) {
  let res;
  try {
    res = await fetch(`${USDA_BASE}/zipSearch?zip=${encodeURIComponent(zip)}`);
  } catch (err) {
    logger.error(`[FarmFinder] USDA zip search network error: ${err.message}`);
    const e = new Error('USDA service unreachable');
    e.apiDown = true;
    throw e;
  }
  if (!res.ok) {
    logger.warn(`[FarmFinder] USDA zip search failed: ${res.status}`);
    const e = new Error(`USDA API error: ${res.status}`);
    e.apiDown = true;
    throw e;
  }
  const data = await res.json();
  return normalizeSearchResults(data.results || []);
}

/**
 * Search for farmers markets near coordinates.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object[]} Array of market summaries
 */
export async function searchByLocation(lat, lng) {
  let res;
  try {
    res = await fetch(`${USDA_BASE}/locSearch?lat=${lat}&lng=${lng}`);
  } catch (err) {
    logger.error(`[FarmFinder] USDA location search network error: ${err.message}`);
    const e = new Error('USDA service unreachable');
    e.apiDown = true;
    throw e;
  }
  if (!res.ok) {
    logger.warn(`[FarmFinder] USDA location search failed: ${res.status}`);
    const e = new Error(`USDA API error: ${res.status}`);
    e.apiDown = true;
    throw e;
  }
  const data = await res.json();
  return normalizeSearchResults(data.results || []);
}

/**
 * Get detailed market info by USDA market ID.
 * @param {string} marketId - USDA market ID
 * @returns {Object|null} Market details
 */
export async function getMarketDetail(marketId) {
  try {
    const res = await fetch(`${USDA_BASE}/mktDetail?id=${encodeURIComponent(marketId)}`);
    if (!res.ok) {
      logger.warn(`[FarmFinder] USDA market detail failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const detail = data.marketdetails;
    if (!detail) return null;

    // Parse Google link for lat/lng
    let lat = null;
    let lng = null;
    const gLink = detail.GoogleLink || '';
    const coordMatch = gLink.match(/q=([+-]?\d+\.?\d*),\s*([+-]?\d+\.?\d*)/);
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    }

    return {
      address: detail.Address || '',
      schedule: detail.Schedule || '',
      products: detail.Products || '',
      googleLink: gLink,
      lat,
      lng,
    };
  } catch (err) {
    logger.error(`[FarmFinder] Market detail error: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: Normalization
// ─────────────────────────────────────────────────────────────

/**
 * Normalize USDA search results.
 * Raw format: { id: "1234", marketname: "2.3 Farm Name" }
 * The marketname includes distance in miles as a prefix.
 */
function normalizeSearchResults(results) {
  return results
    .filter(r => r.id && r.marketname)
    .map(r => {
      const match = r.marketname.match(/^([\d.]+)\s+(.+)$/);
      return {
        id: String(r.id),
        name: match ? match[2].trim() : r.marketname,
        distanceMiles: match ? parseFloat(match[1]) : null,
      };
    })
    .slice(0, 30); // Cap at 30 results
}

export default {
  searchByZip,
  searchByLocation,
  getMarketDetail,
};
