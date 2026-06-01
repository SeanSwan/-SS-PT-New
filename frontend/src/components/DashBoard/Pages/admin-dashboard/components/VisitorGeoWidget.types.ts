export interface GeoVisitor {
  userId: number | null;
  name: string;
  role: string;
  source: 'login' | 'gallery';
  lastActive: string;
  lastLogin: string;
  ip: string;
  country: string;
  countryCode: string | null;
  region: string | null;
  city: string | null;
}

export interface CountryAgg {
  country: string;
  countryCode: string;
  count: number;
}

export interface CityAgg {
  city: string;
  country: string;
  countryCode: string;
  count: number;
}

export interface TopPage {
  page: string;
  views: number;
}

export interface AnonVisitor {
  ip: string;
  country: string;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  pages: string[];
  pageCount: number;
  firstSeen: string;
  lastSeen: string;
  referrer: string | null;
}

export interface AnonData {
  activeNow: number;
  lastHour: number;
  last24h: number;
  totalPageViews: number;
  topPages: TopPage[];
  byCountry: CountryAgg[];
  recentVisitors: AnonVisitor[];
}

export interface GeoData {
  totalVisitors: number;
  loginVisitors: number;
  galleryVisitors: number;
  uniqueCountries: number;
  uniqueCities: number;
  visitors: GeoVisitor[];
  byCountry: CountryAgg[];
  byCity: CityAgg[];
}

export interface HistoryVisitor {
  id: string | number;
  ip?: string;
  country?: string;
  country_code?: string | null;
  city?: string | null;
  region?: string | null;
  pages?: string[];
  page_count?: number;
  first_seen?: string;
  last_seen?: string;
  referrer?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoryData {
  visitors: HistoryVisitor[];
  total: number;
  page: number;
  totalPages: number;
}

export type SelectedVisitor = AnonVisitor | GeoVisitor;
export type BadgeVariant = 'login' | 'gallery' | 'anonymous' | 'stat';
export type TabKey = 'countries' | 'cities' | 'recent' | 'pages' | 'live';
