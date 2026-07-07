/**
 * SeoHead.contract.test.ts — launch charter BP04 §6.4 locks
 * ===========================================================
 * (1) Hero LCP: the home hero <video> carries the committed poster so first
 *     paint is never a blank block waiting on R2 (previously poster-less on
 *     balanced/full tiers). (2) Single meta owner: the hero's duplicate
 *     <Helmet> (which could override the page title with generic copy) is
 *     gone. (3) Per-route OG: SeoHead emits og:/twitter: tags and both
 *     mounted marketing pages use it.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('BP04 6.4 — OG tags + hero LCP', () => {
  it('home hero video has the committed poster and metadata preload on every tier', () => {
    const hero = read('pages/HomePage/components/sections/HeroSection.tsx');
    expect(hero).toMatch(/poster="\/images\/parallax\/hero-swan-bg\.png"/);
    expect(hero).toMatch(/preload="metadata"/);
    // The duplicate meta owner is gone from the hero.
    expect(hero).not.toMatch(/from 'react-helmet-async'/);
  });

  it('SeoHead emits OpenGraph + Twitter tags', () => {
    const seo = read('components/seo/SeoHead.tsx');
    for (const tag of ['og:title', 'og:description', 'og:type', 'og:image', 'twitter:card', 'twitter:title']) {
      expect(seo).toContain(tag);
    }
  });

  it('both mounted marketing pages own their meta through SeoHead', () => {
    expect(read('pages/HomePage/components/HomePage.V4.tsx')).toMatch(/<SeoHead/);
    expect(read('pages/about/About.V4.tsx')).toMatch(/<SeoHead/);
    // No leftover raw Helmet usage on either page (single meta channel).
    expect(read('pages/HomePage/components/HomePage.V4.tsx')).not.toMatch(/<Helmet>/);
    expect(read('pages/about/About.V4.tsx')).not.toMatch(/<Helmet>/);
  });
});
