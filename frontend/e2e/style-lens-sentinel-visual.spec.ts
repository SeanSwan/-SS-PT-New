/** Promoted Style Lens Appearance Studio browser and responsive gate. */
import { createRequire } from "node:module";
import { expect, test, type Page, type Route } from "@playwright/test";
import { PROMOTED_LENSES } from "./style-lens-promoted";
const AXE_PATH = createRequire(import.meta.url).resolve("axe-core/axe.min.js");


const ADMIN = {
  id: 1,
  email: "qa.admin@swanstudios.local",
  username: "qa_admin",
  firstName: "QA",
  lastName: "Admin",
  role: "admin",
  isActive: true,
};

const VIEWPORTS = [
  [320, 780],
  [375, 812],
  [414, 896],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [2560, 1440],
  [3440, 1440],
  [3840, 2160],
] as const;

function jwt() {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    encode({ alg: "none", typ: "JWT" }),
    encode({ iat: 1, exp: 4102444800 }),
    "qa",
  ].join(".");
}

async function json(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function openDashboard(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("tokenTimestamp", Date.now().toString());
      localStorage.setItem("user", JSON.stringify(user));
    },
    { token: jwt(), user: ADMIN },
  );
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me" || path === "/api/profile") {
      return json(route, { success: true, user: ADMIN });
    }
    if (path === "/api/exercises/library") {
      return json(route, { success: true, exercises: [], count: 0 });
    }
    return json(route, { success: true, data: [], notifications: [] });
  });
  await page.goto("/dashboard/admin/workout-design-lab", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: /Worlds × 25 Styles. One session./,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: /Open Appearance Studio/ }),
  ).toBeVisible({ timeout: 20_000 });
}

test("promoted lenses preview, apply, and remain overflow-free", async ({
  page,
}, testInfo) => {
  const writes: string[] = [];
  const errors: string[] = [];
  const studioChunkRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (request.url().includes('AppearanceStudioPanel')) {
      studioChunkRequests.push(request.url());
    }
    if (request.url().includes("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });

  await openDashboard(page);
  expect(studioChunkRequests).toEqual([]);
  await page.getByRole("button", { name: /Open Appearance Studio/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Appearance Studio" }),
  ).toBeVisible();
  expect(studioChunkRequests).toHaveLength(1);

  await page.addScriptTag({ path: AXE_PATH });
  for (const [lensIndex, [name, id]] of PROMOTED_LENSES.entries()) {
    await page.getByRole("button", { name: `${name} style` }).click();
    await expect(page.getByTestId("appearance-preview")).toHaveAttribute(
      "data-preview-lens",
      id,
    );
    const violations = await page.evaluate(async () => {
      type AxeResult = {
        violations: Array<{ id: string; impact: string | null }>;
      };
      const axe = (globalThis as unknown as {
        axe: { run: (scope: Element) => Promise<AxeResult> };
      }).axe;
      const dialog = document.querySelector('[aria-label="Appearance Studio"]');
      if (!dialog) throw new Error("Appearance Studio dialog is missing");
      const result = await axe.run(dialog);
      return result.violations;
    });
    expect(violations, `${name} WCAG violations`).toEqual([]);
    if (lensIndex >= 5) await page.screenshot({ path: testInfo.outputPath(`appearance-studio-${id}.png`) });
  }

  await page.setViewportSize({ width: 414, height: 896 });
  await page.getByRole("button", { name: "Quiet Meridian style" }).click();
  await expect(page.getByTestId("appearance-preview")).toHaveAttribute(
    "data-preview-lens",
    "quiet-meridian",
  );
  const mobileBox = await page.getByRole("dialog", { name: "Appearance Studio" }).boundingBox();
  expect(mobileBox).not.toBeNull();
  expect(mobileBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((mobileBox?.y ?? 0) + (mobileBox?.height ?? 0)).toBeLessThanOrEqual(896);
  await page.screenshot({
    path: testInfo.outputPath("appearance-studio-mobile-414.png"),
    fullPage: false,
  });
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    const metrics = await page.evaluate(() => {
      const dialog = document.querySelector('[aria-label="Appearance Studio"]');
      const controls = Array.from(dialog?.querySelectorAll("button") ?? [])
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
      return {
        viewportOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        dialogOverflow: dialog ? dialog.scrollWidth - dialog.clientWidth : 1,
        controls,
      };
    });
    expect(
      metrics.viewportOverflow,
      `viewport overflow at ${width}px`,
    ).toBeLessThanOrEqual(1);
    expect(
      metrics.dialogOverflow,
      `dialog overflow at ${width}px`,
    ).toBeLessThanOrEqual(1);
    expect(
      metrics.controls.every(
        ({ width: controlWidth, height: controlHeight }) =>
          controlWidth >= 44 && controlHeight >= 44,
      ),
      `44px target failure at ${width}px`,
    ).toBe(true);
    if (width === 320 || width === 3840) {
      await page.screenshot({
        path: testInfo.outputPath(`appearance-studio-${width}x${height}.png`),
        fullPage: false,
      });
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    type PerfScope = typeof globalThis & { __styleLensCls: number; __styleLensObserver: PerformanceObserver };
    const scope = globalThis as PerfScope;
    scope.__styleLensCls = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) scope.__styleLensCls += (entry as PerformanceEntry & { value?: number }).value ?? 0;
      }
    });
    observer.observe({ type: 'layout-shift' });
    scope.__styleLensObserver = observer;
  });
  await page.getByRole("button", { name: "Quiet Meridian style" }).click();
  await page.screenshot({
    path: testInfo.outputPath("appearance-studio-desktop.png"),
    fullPage: true,
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => { (globalThis as typeof globalThis & { __styleLensCls: number }).__styleLensCls = 0; });
  const commitStarted = Date.now();
  await page.getByRole("button", { name: "Apply appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-style-lens",
    "quiet-meridian",
  );

  const transitionMetrics = await page.evaluate(() => {
    const scope = globalThis as typeof globalThis & { __styleLensCls: number; __styleLensObserver: PerformanceObserver };
    scope.__styleLensObserver.disconnect();
    return { cls: scope.__styleLensCls };
  });
  const commitDurationMs = Date.now() - commitStarted;
  console.log(`[style-lens-metrics] commit=${commitDurationMs}ms cls=${transitionMetrics.cls.toFixed(4)}`);
  expect(commitDurationMs).toBeLessThan(1500);
  expect(transitionMetrics.cls).toBeLessThanOrEqual(0.05);

  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test('every promoted lens preserves a static reduced-motion fallback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDashboard(page);

  for (const [name, id] of PROMOTED_LENSES) {
    await page.getByRole('button', { name: /Open Appearance Studio/ }).click();
    await page.getByRole('button', { name: `${name} style` }).click();
    await page.getByRole('button', { name: 'Apply appearance' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-style-lens', id);
    await expect(page.locator('html')).toHaveAttribute('data-motion-mode', 'reduced');
    // v5: scoped preview frames add inner shells — assert on the OUTER
    // dashboard shell (first in DOM order).
    const motion = await page.locator('[data-style-lens-shell]').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationDuration: Number.parseFloat(style.animationDuration),
        transitionDuration: Number.parseFloat(style.transitionDuration),
      };
    });
    expect(motion.animationDuration).toBeLessThanOrEqual(0.01);
    expect(motion.transitionDuration).toBeLessThanOrEqual(0.01);
  }

  expect(errors).toEqual([]);
});

test('promoted lens commits stay responsive under 4x CPU throttle', async ({
  page, context, browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CDP CPU throttling is Chromium-only');
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await openDashboard(page);
  const timings: number[] = [];

  for (const [name, id] of PROMOTED_LENSES) {
    await page.getByRole('button', { name: /Open Appearance Studio/ }).click();
    await page.getByRole('button', { name: `${name} style` }).click();
    const started = Date.now();
    await page.getByRole('button', { name: 'Apply appearance' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-style-lens', id);
    timings.push(Date.now() - started);
  }

  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sorted = [...timings].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  console.log(`[style-lens-4x-cpu] runs=${timings.join(',')} median=${median}ms p95=${p95}ms`);
  expect(median).toBeLessThan(1500);
  expect(p95).toBeLessThan(1500);
});
