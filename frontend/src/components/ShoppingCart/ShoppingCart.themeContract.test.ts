/**
 * FILE: ShoppingCart.themeContract.test.ts
 * PURPOSE: Guard the canonical header-mounted cart modal against retired-theme,
 *          raw-color, motion-accessibility, and touch-target regressions.
 * LAST VALIDATED: 2026-07-03 during the purchase-surface Crystalline retheme.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

const shell = read('./ShoppingCart.tsx');
const chromeStyles = read('./ShoppingCart.styles.ts');
const summaryStyles = read('./ShoppingCart.summaryStyles.ts');
const itemStyles = read('./ShoppingCartItem.styles.ts');
const itemCard = read('./ShoppingCartItem.tsx');
const footer = read('./ShoppingCartFooter.tsx');
const motionFactory = read('./ShoppingCart.motion.ts');

const styleSources = [chromeStyles, summaryStyles, itemStyles];
const componentSources = [shell, itemCard, footer];

describe('ShoppingCart theme contract', () => {
  it('keeps the component files free of raw colors and inline style chunks', () => {
    expect(shell).toContain("from './ShoppingCart.styles'");
    expect(shell).toContain("from './ShoppingCart.motion'");
    for (const source of componentSources) {
      expect(source).not.toContain('keyframes');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
      expect(source).not.toMatch(/style=\{\{/);
    }
  });

  it('keeps every hex in the style files inside a var(--token, fallback)', () => {
    for (const source of styleSources) {
      const rawHexes = source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      const tokenFallbacks = source.match(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(rawHexes.length).toBeGreaterThan(0);
      expect(tokenFallbacks.length).toBe(rawHexes.length);
    }
  });

  it('bans off-palette and retired Galaxy colors', () => {
    for (const source of [...componentSources, ...styleSources]) {
      expect(source).not.toMatch(/#1e1e3f|#00e6e6|#00FFFF|#7851A9|#0a0a1a/i);
    }
  });

  it('gates CSS motion behind prefers-reduced-motion', () => {
    expect(chromeStyles).toMatch(/prefers-reduced-motion/);
    expect(itemStyles).toMatch(/prefers-reduced-motion/);
    expect(summaryStyles).toMatch(/prefers-reduced-motion/);
  });

  it('collapses framer-motion choreography to fades under reduced motion', () => {
    expect(shell).toContain('useReducedMotion');
    expect(motionFactory).toContain('reduceMotion');
    expect(motionFactory).toMatch(/fadeOnly/);
  });

  it('holds the 44px interactive floor on cart controls', () => {
    expect(chromeStyles).toMatch(/ModalCloseButton[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
    expect(itemStyles).toMatch(/QuantityButton = styled\.button`[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
    expect(itemStyles).toMatch(/RemoveButton = styled\.button`[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
  });

  it('uses lucide icons instead of emoji design elements', () => {
    for (const source of [shell, itemCard]) {
      expect(source).not.toMatch(/🛒|💪/);
    }
    expect(shell).toContain('ShoppingBag');
    expect(itemCard).toContain('Dumbbell');
  });

  it('routes the empty-cart CTA to the storefront', () => {
    expect(shell).toMatch(/handleExplorePackages[\s\S]*?navigate\('\/store'\)/);
  });

  it('keeps the checkout handoff intact', () => {
    expect(shell).toMatch(/navigate\('\/checkout'\)/);
    expect(shell).toMatch(/navigate\('\/login'\)/);
  });
});
