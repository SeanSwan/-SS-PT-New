import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  anonVisitorKey,
  cityAggKey,
  countryAggKey,
  geoVisitorKey,
  pageVisitItems,
} from './VisitorGeoWidget.logic';
import type { AnonVisitor, CityAgg, CountryAgg, GeoVisitor } from './VisitorGeoWidget.types';

const sectionSource = readFileSync(resolve(__dirname, './VisitorGeoWidget.sections.tsx'), 'utf8');
const detailSource = readFileSync(resolve(__dirname, './VisitorGeoWidget.detail.tsx'), 'utf8');

const anonVisitor: AnonVisitor = {
  ip: '127.0.0.1',
  country: 'United States',
  countryCode: 'US',
  city: 'Austin',
  region: 'TX',
  pages: ['/store', '/store', '/dashboard'],
  pageCount: 3,
  firstSeen: '2026-05-31T10:00:00.000Z',
  lastSeen: '2026-05-31T10:15:00.000Z',
  referrer: null,
};

const geoVisitor: GeoVisitor = {
  userId: 42,
  name: 'Client Alpha',
  role: 'client',
  source: 'login',
  lastActive: '2026-05-31T10:20:00.000Z',
  lastLogin: '2026-05-31T09:00:00.000Z',
  ip: '127.0.0.2',
  country: 'United States',
  countryCode: 'US',
  region: 'TX',
  city: 'Austin',
};

describe('VisitorGeoWidget stable list identity', () => {
  it('uses stable visitor and aggregate keys instead of rendered array indexes', () => {
    expect(sectionSource).toContain('anonVisitorKey(visitor)');
    expect(sectionSource).toContain('geoVisitorKey(visitor)');
    expect(sectionSource).toContain('countryAggKey(country)');
    expect(sectionSource).toContain('cityAggKey(city)');
    expect(detailSource).toContain('pageVisitItems(');
    expect(detailSource).not.toMatch(/key=\{`(?:anon|user)-\$\{index\}`\}/);
    expect(`${sectionSource}\n${detailSource}`).not.toMatch(/key=\{(?:index|pageIndex)\}/);
    expect(`${sectionSource}\n${detailSource}`).not.toMatch(/key=\{[^}]*\|\| index\}/);
    expect(sectionSource).not.toContain('key={`${city.city}-${index}`}');
  });

  it('keeps row identity stable when visitor lists reorder', () => {
    const movedAnon = { ...anonVisitor, city: 'Dallas' };
    const movedGeo = { ...geoVisitor, name: 'Client Alpha Renamed' };
    const country: CountryAgg = { country: 'United States', countryCode: 'US', count: 12 };
    const city: CityAgg = { city: 'Austin', country: 'United States', countryCode: 'US', count: 5 };

    expect(anonVisitorKey(movedAnon)).toContain('2026-05-31T10:15:00.000Z');
    expect(anonVisitorKey(movedAnon)).not.toBe(anonVisitorKey({ ...movedAnon, lastSeen: '2026-05-31T10:16:00.000Z' }));
    expect(geoVisitorKey(movedGeo)).toBe('geo-login-42');
    expect(countryAggKey(country)).toBe('country-US-United States');
    expect(cityAggKey(city)).toBe('city-US-United States-Austin');
  });

  it('generates unique keys for repeated page visits without using the array index', () => {
    expect(pageVisitItems(['/store', '/store', '/dashboard'])).toEqual([
      { key: 'page-/store-1', page: '/store' },
      { key: 'page-/store-2', page: '/store' },
      { key: 'page-/dashboard-1', page: '/dashboard' },
    ]);
  });
});
