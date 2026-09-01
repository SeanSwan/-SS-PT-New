import { test, expect } from '@playwright/test';

/**
 * Slice 1 acceptance: the game boots to a real WebGL surface with nothing thrown.
 *
 * Why these three and not "the page loaded": a React app renders an empty <canvas> perfectly well
 * when three.js failed, and a page that is throwing can still look right in a screenshot. So we
 * assert the canvas EXISTS, that it has a live webgl2 CONTEXT (the thing that actually draws), and
 * that the page threw nothing while doing it.
 */
test('boots to a live WebGL2 canvas with no page errors', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  // NOT networkidle. A vite dev server holds an open hot-reload websocket, so the network never
  // goes idle and goto() hangs until the test times out. It passed twice by luck when the socket
  // happened to settle inside the window, then failed repeatedly — classic flake, wrong tool.
  // domcontentloaded + the explicit canvas wait below is the honest way to wait for THIS app.
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 20_000 });

  // A canvas element is not proof of rendering. Ask it for the context three.js needs.
  const hasWebgl2 = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return false;
    // R3F already holds the context; getContext returns the SAME one, so this is a read not a claim.
    return Boolean(c.getContext('webgl2'));
  });
  expect(hasWebgl2, 'canvas has a live webgl2 context').toBe(true);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
