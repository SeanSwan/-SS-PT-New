/**
 * marketingStats.contract.test.ts
 * =================================
 * Launch charter P1-2 lock: every marketing number lives in
 * content/marketingStats.ts. This suite bans the retired contradictory
 * literals (840+ / 1000+ clients / 25+ years / 98% vs 97% split) from the
 * consumer surfaces and pins the verified exercise-library claim.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MARKETING_STATS, EXERCISE_LIBRARY_CLAIM, YEARS_EXPERIENCE_CLAIM } from './marketingStats';

const SRC = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

/** Live consumers — MUST import the module. */
const MODULE_CONSUMERS = [
  'pages/HomePage/components/shared/HomeData.ts',
  'pages/about/components/shared/AboutData.ts',
  'pages/about/About.V4.tsx',
  'pages/about/components/sections/HeroSection.tsx',
  'pages/gallery/VIPConversionModal.tsx',
  'components/DashBoard/UniversalDashboardLayout.routes.tsx',
  'components/BootcampBuilder/BootcampBuilderChrome.tsx',
  // Store surfaces escaped the P1-2 lock and shipped "25+ Years" live
  // (caught by the 2026-07-28 launch audit): V3 = mounted, V2 = lazy fallback.
  'pages/shop/StoreV3.tsx',
  'pages/shop/StoreV2.tsx',
];

/** Import-free surfaces (fallbacks + string content) — claims must not contradict. */
const FALLBACKS = [
  // V4 stopped importing the module directly (stats flow through child
  // sections/HomeData) — the direct-import assertion had been failing on main;
  // reclassified 2026-07-28. Literal bans below still apply to it.
  'pages/HomePage/components/HomePage.V4.tsx',
  'pages/HomePage/components/HomePage.V3.tsx',
  'pages/about/About.V3.tsx',
  'components/WhySwanStudios/WhySwanStudios.tsx',
  'content/teach-me/index.ts',
];

describe('marketing stats single source of truth', () => {
  it('pins the verified claims', () => {
    // [VERIFIED] prod Exercises count = 908 on 2026-07-07; 900+ is the truthful claim.
    expect(EXERCISE_LIBRARY_CLAIM).toBe('900+');
    expect(YEARS_EXPERIENCE_CLAIM).toBe('26+');
    // Conservative pending Sean's D-F numbers — may only move via this module.
    expect(MARKETING_STATS.clientsTransformed.value).toBeLessThanOrEqual(1000);
    expect(MARKETING_STATS.satisfactionPct.value).toBeLessThanOrEqual(100);
  });

  it.each(MODULE_CONSUMERS)('%s imports the stats module', (rel) => {
    expect(read(rel)).toMatch(/content\/marketingStats/);
  });

  it.each([...MODULE_CONSUMERS, ...FALLBACKS])(
    '%s carries no retired contradictory literals',
    (rel) => {
      const source = read(rel);
      expect(source).not.toMatch(/840\+/);
      expect(source).not.toMatch(/25\+ (years|Years|Yrs)/);
      expect(source).not.toMatch(/numericValue:\s*1000\b/);
      expect(source).not.toMatch(/target:\s*98\b/);
    }
  );
});
