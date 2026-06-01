import type { AnonVisitor, CityAgg, CountryAgg, GeoVisitor, HistoryVisitor, TabKey } from './VisitorGeoWidget.types';

export const VISITOR_TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'live', label: 'Live Feed' },
  { key: 'countries', label: 'Countries' },
  { key: 'cities', label: 'Cities' },
  { key: 'pages', label: 'Top Pages' },
  { key: 'recent', label: 'Users' },
];

export const countryFlag = (code: string | null): string => {
  if (!code || code.length !== 2) return String.fromCodePoint(0x1F310);
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(char => 0x1F1E6 + char.charCodeAt(0) - 65)
  );
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const pageName = (path: string): string => {
  const map: Record<string, string> = {
    '/': 'Homepage',
    '/store': 'Store',
    '/gallery': 'Gallery',
    '/about': 'About',
    '/contact': 'Contact',
    '/login': 'Login',
    '/signup': 'Sign Up',
    '/waiver': 'Waiver',
    '/video-library': 'Video Library',
    '/dashboard': 'Dashboard',
  };

  if (map[path]) return map[path];
  if (path.startsWith('/gallery/')) return 'Gallery Event';
  if (path.startsWith('/dashboard/')) return `Admin: ${path.split('/').pop()}`;
  return path;
};

export const isAnonVisitor = (visitor: unknown): visitor is AnonVisitor =>
  typeof visitor === 'object' &&
  visitor !== null &&
  'pages' in visitor &&
  Array.isArray((visitor as AnonVisitor).pages);

export const historyVisitorToAnon = (visitor: HistoryVisitor): AnonVisitor => ({
  ip: visitor.ip || '',
  country: visitor.country || 'Unknown',
  countryCode: visitor.country_code || null,
  city: visitor.city || null,
  region: visitor.region || null,
  pages: visitor.pages || [],
  pageCount: visitor.page_count || 1,
  firstSeen: visitor.first_seen || visitor.createdAt || new Date().toISOString(),
  lastSeen: visitor.last_seen || visitor.updatedAt || new Date().toISOString(),
  referrer: visitor.referrer || null,
});

export const anonVisitorKey = (visitor: AnonVisitor): string =>
  [
    'anon',
    visitor.ip || 'unknown-ip',
    visitor.firstSeen,
    visitor.lastSeen,
    visitor.pageCount,
    visitor.pages.join('|'),
  ].join('-');

export const geoVisitorKey = (visitor: GeoVisitor): string => {
  if (visitor.userId !== null && visitor.userId !== undefined) {
    return `geo-${visitor.source}-${visitor.userId}`;
  }

  return [
    'geo',
    visitor.source,
    visitor.role,
    visitor.name,
    visitor.lastActive,
    visitor.ip || visitor.city || visitor.country || 'unknown-location',
  ].join('-');
};

export const countryAggKey = (country: CountryAgg): string =>
  `country-${country.countryCode || 'unknown'}-${country.country}`;

export const cityAggKey = (city: CityAgg): string =>
  `city-${city.countryCode || 'unknown'}-${city.country}-${city.city}`;

export const pageVisitItems = (pages: string[] = []): Array<{ key: string; page: string }> => {
  const counts = new Map<string, number>();

  return pages.map((page) => {
    const nextCount = (counts.get(page) || 0) + 1;
    counts.set(page, nextCount);
    return { key: `page-${page}-${nextCount}`, page };
  });
};
