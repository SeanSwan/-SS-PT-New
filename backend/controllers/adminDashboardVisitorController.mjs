import { getAllModels, Op } from '../models/index.mjs';
import { PAGE_VIEW_CACHE, PAGE_VIEW_TTL } from '../services/pageViewCache.mjs';
import logger from '../utils/logger.mjs';

export const getVisitorGeo = async (req, res) => {
  try {
    const { lookupGeo } = await import('../services/geoIpService.mjs');
    const { User } = getAllModels();
    if (!User) {
      return res.status(500).json({ success: false, error: 'User model not found' });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { lastLoginIP: { [Op.ne]: null } },
          { registrationIP: { [Op.ne]: null } },
        ],
        lastActive: { [Op.gte]: ninetyDaysAgo },
        role: { [Op.ne]: 'admin' },
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'lastLoginIP', 'registrationIP', 'lastActive', 'lastLogin'],
      order: [['lastActive', 'DESC']],
      raw: true,
    });

    const ipSet = new Map();
    const results = [];

    for (const user of users) {
      const ip = user.lastLoginIP || user.registrationIP;
      if (!ipSet.has(ip)) ipSet.set(ip, await lookupGeo(ip));
      const geo = ipSet.get(ip);
      results.push({
        userId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        role: user.role,
        source: user.lastLoginIP ? 'login' : 'signup',
        lastActive: user.lastActive,
        lastLogin: user.lastLogin,
        ip,
        ...(geo || { country: 'Unknown', countryCode: null, region: null, city: null, lat: null, lon: null }),
      });
    }

    const galleryResults = [];
    try {
      const GalleryVisitor = (await import('../models/GalleryVisitor.mjs')).default;
      const galleryVisitors = await GalleryVisitor.findAll({
        where: {
          [Op.or]: [
            { ipAddress: { [Op.ne]: null } },
            { country: { [Op.ne]: null } },
          ],
        },
        attributes: ['id', 'email', 'firstName', 'lastName', 'ipAddress', 'country', 'countryCode', 'region', 'city', 'lat', 'lon', 'createdAt', 'updatedAt'],
        order: [['updatedAt', 'DESC']],
        limit: 100,
        raw: true,
      });
      const seenEmails = new Set(results.map((result) => result.name?.toLowerCase()));

      for (const visitor of galleryVisitors) {
        const email = visitor.email?.toLowerCase();
        if (seenEmails.has(email)) continue;
        seenEmails.add(email);

        let geo = visitor.country ? {
          country: visitor.country,
          countryCode: visitor.countryCode,
          region: visitor.region,
          city: visitor.city,
          lat: visitor.lat,
          lon: visitor.lon,
        } : null;

        if (!geo && visitor.ipAddress) {
          if (!ipSet.has(visitor.ipAddress)) ipSet.set(visitor.ipAddress, await lookupGeo(visitor.ipAddress));
          geo = ipSet.get(visitor.ipAddress);
        }

        galleryResults.push({
          userId: null,
          name: [visitor.firstName, visitor.lastName].filter(Boolean).join(' ') || visitor.email,
          role: 'gallery_visitor',
          source: 'gallery',
          lastActive: visitor.updatedAt,
          lastLogin: visitor.createdAt,
          ip: visitor.ipAddress,
          ...(geo || { country: 'Unknown', countryCode: null, region: null, city: null, lat: null, lon: null }),
        });
      }
    } catch (galleryErr) {
      logger.debug('[AdminDashboard] Gallery visitor geo skipped: %s', galleryErr.message);
    }

    const allResults = [...results, ...galleryResults].sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    const countryMap = {};
    const cityMap = {};

    for (const result of allResults) {
      const countryCode = result.countryCode || 'XX';
      const country = result.country || 'Unknown';
      const city = result.city || 'Unknown';
      countryMap[countryCode] = countryMap[countryCode] || { country, countryCode, count: 0 };
      countryMap[countryCode].count += 1;
      if (city !== 'Unknown') {
        const cityKey = `${city}, ${country}`;
        cityMap[cityKey] = cityMap[cityKey] || {
          city,
          country,
          countryCode,
          lat: result.lat,
          lon: result.lon,
          count: 0,
        };
        cityMap[cityKey].count += 1;
      }
    }

    return res.json({
      success: true,
      totalVisitors: allResults.length,
      loginVisitors: results.length,
      galleryVisitors: galleryResults.length,
      uniqueCountries: Object.keys(countryMap).filter((key) => key !== 'XX').length,
      uniqueCities: Object.keys(cityMap).length,
      visitors: allResults.slice(0, 50),
      byCountry: Object.values(countryMap).sort((a, b) => b.count - a.count),
      byCity: Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 20),
    });
  } catch (err) {
    logger.error('[AdminDashboard] Visitor geo error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch visitor geo data' });
  }
};

export const getAnonymousVisitors = async (req, res) => {
  try {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - PAGE_VIEW_TTL;
    const all = [...PAGE_VIEW_CACHE.values()].filter((visitor) => visitor.lastSeen > oneDayAgo);
    const countryMap = {};
    const pageMap = {};

    for (const visitor of all) {
      const countryCode = visitor.geo?.countryCode || 'XX';
      const country = visitor.geo?.country || 'Unknown';
      countryMap[countryCode] = countryMap[countryCode] || { country, countryCode, count: 0 };
      countryMap[countryCode].count += 1;
      for (const page of visitor.pages) pageMap[page] = (pageMap[page] || 0) + 1;
    }

    return res.json({
      success: true,
      activeNow: all.filter((visitor) => visitor.lastSeen > fiveMinAgo).length,
      lastHour: all.filter((visitor) => visitor.lastSeen > oneHourAgo).length,
      last24h: all.length,
      totalPageViews: all.reduce((sum, visitor) => sum + (visitor.pageCount || 1), 0),
      topPages: Object.entries(pageMap).sort(([, a], [, b]) => b - a).slice(0, 15).map(([page, views]) => ({ page, views })),
      byCountry: Object.values(countryMap).sort((a, b) => b.count - a.count),
      recentVisitors: all
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 20)
        .map((visitor) => ({
          ip: visitor.ip,
          visitorKey: visitor.ip,
          country: visitor.geo?.country || 'Unknown',
          countryCode: visitor.geo?.countryCode || null,
          city: visitor.geo?.city || null,
          region: visitor.geo?.region || null,
          pages: visitor.pages,
          pageCount: visitor.pageCount,
          firstSeen: new Date(visitor.firstSeen).toISOString(),
          lastSeen: new Date(visitor.lastSeen).toISOString(),
          referrer: visitor.referrer,
        })),
    });
  } catch (err) {
    logger.error('[AdminDashboard] Anonymous visitors error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch anonymous visitor data' });
  }
};

export const getVisitorHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    let PageView;

    try {
      const mod = await import('../models/PageView.mjs');
      PageView = mod.default;
    } catch {
      return res.json({ success: true, visitors: [], total: 0, page, limit, message: 'PageView model not yet available' });
    }

    const { count, rows } = await PageView.findAndCountAll({
      where: {
        [Op.or]: [
          { userAgent: null },
          { userAgent: { [Op.notILike]: '%playwright%' } },
        ],
        [Op.not]: [{ page: { [Op.iLike]: '/dashboard%' } }],
        page: { [Op.notIn]: ['/login', '/auth'] },
      },
      order: [['last_seen', 'DESC']],
      limit,
      offset,
      raw: true,
    });

    return res.json({
      success: true,
      visitors: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    logger.error('[AdminDashboard] Visitor history error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch visitor history' });
  }
};
