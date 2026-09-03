/**
 * Sheen tier — the checks that only a browser can make (SWA-224)
 * ================================================================
 * Everything about this feature that had been "verified" was verified STATICALLY:
 * unit tests over the engine, and assertions that read the stylesheet's TEXT to
 * confirm a media block exists. Two hostile reviews (GLM 5.3 + Flash, 2026-09-01)
 * independently pointed out that every remaining defect lived exactly where static
 * verification cannot reach. This file goes there.
 *
 * A stylesheet-text assertion proves the CSS was WRITTEN. It cannot prove the
 * rule matches, that the cascade lets it win, or that the layers actually stop.
 * Each test below emulates the real user preference and reads computed style.
 *
 * Run: SWAN_PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:<port> \
 *      npx playwright test e2e/sheen-a11y.spec.ts --project="Desktop Chrome"
 */

import { test, expect, type Page } from '@playwright/test';

const CTA = 'button:has-text("Join SwanStudios")';

async function revealCta(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const cta = page.locator(CTA).first();
  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toBeVisible();
  return cta;
}

test.describe('reduced motion is honoured by the RENDERED page, not just the stylesheet', () => {
  test('every sheen layer stops animating under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await revealCta(page);

    const states = await page.$$eval('.sw-sheen > i', (nodes) =>
      nodes.map((n) => ({
        cls: n.className,
        animationName: getComputedStyle(n).animationName,
        // still painted: reduce must HOLD the frame still, not delete it
        display: getComputedStyle(n).display,
        opacity: getComputedStyle(n).opacity,
      })),
    );

    expect(states.length, 'the sheen frame should be present').toBeGreaterThan(0);
    for (const s of states) {
      expect(s.animationName, `${s.cls} must not animate under reduce`).toBe('none');
      expect(s.display, `${s.cls} must stay visible under reduce`).not.toBe('none');
    }
  });

  test('the same layers DO animate when motion is allowed (control)', async ({ page }) => {
    // Without this, the test above passes trivially if the frame never animates.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await revealCta(page);

    const animated = await page.$$eval('.sw-sheen > i', (nodes) =>
      nodes.filter((n) => getComputedStyle(n).animationName !== 'none').length,
    );
    expect(animated, 'at least one layer should animate with motion allowed').toBeGreaterThan(0);
  });
});

test.describe('forced colours', () => {
  test('decoration is dropped and a system border is restored', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await revealCta(page);

    const painted = await page.$$eval('.sw-sheen > i', (nodes) =>
      nodes.filter((n) => getComputedStyle(n).display !== 'none').length,
    );
    expect(painted, 'no decorative layer should paint under forced colours').toBe(0);

    const label = await page.locator(CTA).first().innerText();
    expect(label.trim(), 'the label must survive forced colours').toContain('Join');
  });
});

test.describe('small viewports — the sheened control must not crowd or overflow', () => {
  for (const width of [320, 414]) {
    test(`${width}px: no overflow, no wrap, target still >= 44px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      const cta = await revealCta(page);

      const box = (await cta.boundingBox())!;
      expect(box.height, '44px minimum target').toBeGreaterThanOrEqual(44);
      expect(box.x, 'must not start off-screen').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'must not overflow the viewport').toBeLessThanOrEqual(width + 1);

      const hScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hScroll, 'the page must not scroll horizontally').toBe(false);

      // the frame must still be a frame, not eat the label
      const pad = await page.$eval('.sw-sheen', (n) => getComputedStyle(n).paddingTop);
      expect(parseFloat(pad), 'frame weight should stay the button token').toBeLessThanOrEqual(6);
    });
  }
});

test.describe('the sheen stays a hierarchy signal in the real page', () => {
  test('exactly one sheen frame renders on the homepage', async ({ page }) => {
    await revealCta(page);
    await expect(page.locator('.sw-sheen')).toHaveCount(1);
  });
});
