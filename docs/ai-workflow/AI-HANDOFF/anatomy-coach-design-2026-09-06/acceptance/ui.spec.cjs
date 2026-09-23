/** Future local fixture UI acceptance; uses installed frontend Playwright. No real patient accounts. */
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const requireFrontend = createRequire(resolve(__dirname, '../../../../../frontend/package.json'));
const { test, expect } = requireFrontend('@playwright/test');
const base = process.env.SPA_BASE_URL;
if (!base) throw new Error('SETUP BLOCKED: SPA_BASE_URL must identify an isolated synthetic fixture UI.');
const url = new URL(base);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Loopback HTTP fixture required.');
test.beforeEach(async ({ request }) => {
  const response = await request.get(`${url.origin}/__test__/fixture-identity`, { maxRedirects: 0 });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.kind).toBe('swan-pain-atlas-disposable');
  expect(data.productionConnection).toBe(false);
  expect(data.syntheticOnly).toBe(true);
});
for (const [width, height] of [[320,800],[375,812],[414,896],[768,1024],[1024,768],[1280,800],[1920,1080],[2560,1440],[3840,2160]]) {
  test(`T16/T20: Coach composer reachable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`${url.origin}/dashboard/admin/coach-assistant`);
    const input = page.getByRole('textbox', { name: 'Message Swan Coach', exact: true });
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test('T01: region-list report path remains complete', async ({ page }) => {
  await page.goto(`${url.origin}/dashboard/client/body-map`);
  await page.getByRole('button', { name: 'Choose from list', exact: true }).click();
  await page.getByRole('option', { name: 'Left shoulder', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Pain level', exact: true }).fill('4');
  await page.getByRole('button', { name: 'Save report', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Report saved');
  await expect(page.getByText('Left shoulder', { exact: true }).first()).toBeVisible();
});


test('T32: Easy report needs no tissue classification or advanced controls', async ({ page }) => {
  await page.goto(url.origin + '/dashboard/client/body-map');
  await expect(page.getByRole('button', { name: 'Easy pain chart', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Veins', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Choose from list', exact: true }).click();
  await page.getByRole('option', { name: 'Left shoulder', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Pain level', exact: true }).fill('4');
  await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  await page.getByRole('button', { name: 'Easy pain chart', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Pain level', exact: true })).toHaveValue('4');
  await page.getByRole('button', { name: 'Save report', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Report saved');
});
