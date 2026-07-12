/**
 * Workout Design Lab 25-view browser and responsive sweep.
 * Uses local-only QA identity and API mocks; no request leaves the browser as a write.
 */
import { createRequire } from 'node:module';
import { expect, test, type Page, type Route } from "@playwright/test";

const AXE_PATH = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const ADMIN = {
  id: 1,
  email: "qa.admin@swanstudios.local",
  username: "qa_admin",
  firstName: "QA",
  lastName: "Admin",
  role: "admin",
  isActive: true,
};

const CONCEPTS = [
  ["Alpine Glacier Command", "Stage precision route"],
  ["Evergreen Rainforest Training", "Advance growth trail"],
  ["Underground Ocean City", "Route next destination"],
  ["South Pole Expedition", "Advance expedition"],
  ["Southern California Coast", "Set coastal session"],
  ["New York Training District", "Dispatch training line"],
  ["Canada Boreal Performance", "Lock seasonal block"],
  ["James Webb Nebula Observatory", "Log observation"],
  ["Solar System Mission Control", "Authorize mission stage"],
  ["Comet Velocity Lab", "Launch velocity set"],
  ["Gas Cloud Strength Studio", "Set training pressure"],
  ["Aurora Borealis Recovery", "Stage recovery arc"],
  ["Volcanic Core Training", "Temper core session"],
  ["Desert Observatory", "Record desert set"],
  ["Redwood Titan Studio", "Add growth ring"],
  ["Tropical Storm Performance Deck", "Adapt deck intensity"],
  ["Coral Reef Movement Lab", "Balance movement ecosystem"],
  ["Moonbase Coach Console", "Assemble mission plan"],
  ["Rainy Tokyo Training Night", "Commit night session"],
  ["London Athletic Archive", "File session record"],
  ["Mediterranean Training Villa", "Set villa plan"],
  ["Swiss Precision Lab", "Calibrate working set"],
  ["Caribbean Sunrise Energy", "Start sunrise session"],
  ["Deep-Ocean Trench Observatory", "Confirm pressure data"],
  ["Crystalline Swan World", "Stage Swan signature"],
] as const;

const VIEWPORTS = [
  [320, 780],
  [375, 812],
  [390, 844],
  [414, 896],
  [768, 1024],
  [1024, 768],
  [1280, 900],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [3440, 1440],
  [3840, 2160],
] as const;

const EXERCISES = [
  {
    id: "qa-1",
    name: "Goblet squat",
    exerciseType: "stability",
    bodyPartCategory: "legs",
    primaryMuscles: ["quadriceps"],
    difficulty: 2,
    equipment: ["dumbbell"],
    recommendedSets: 3,
    recommendedReps: 10,
  },
  {
    id: "qa-2",
    name: "Cable lift",
    exerciseType: "core",
    bodyPartCategory: "core",
    primaryMuscles: ["obliques"],
    difficulty: 2,
    equipment: ["cable"],
    recommendedSets: 3,
    recommendedReps: 10,
  },
  {
    id: "qa-3",
    name: "Stability-ball row",
    exerciseType: "stability",
    bodyPartCategory: "back",
    primaryMuscles: ["back"],
    difficulty: 2,
    equipment: ["stability ball"],
    recommendedSets: 3,
    recommendedReps: 12,
  },
];

function jwt() {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    encode({ alg: "none", typ: "JWT" }),
    encode({
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
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

async function openLab(page: Page) {
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
    if (path === "/api/auth/me" || path === "/api/profile")
      return json(route, { success: true, user: ADMIN });
    if (path === "/api/exercises/library")
      return json(route, {
        success: true,
        exercises: EXERCISES,
        count: EXERCISES.length,
      });
    return json(route, { success: true, data: [], notifications: [] });
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard/admin/workout-design-lab", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: /25 Worlds.*25 Styles\. One session\./,
    }),
  ).toBeVisible();
}

test("all 25 worlds render, act, and open the real read-only Rolodex", async ({
  page,
}) => {
  const writes: string[] = [];
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/") && request.method() !== "GET")
      writes.push(`${request.method()} ${request.url()}`);
  });
  await openLab(page);
  await expect(page.getByRole("option")).toHaveCount(25);
  const firstOption = page.getByRole("option", {
    name: "Alpine Glacier Command",
    exact: true,
  });
  await firstOption.click();
  await firstOption.focus();
  await firstOption.press("ArrowRight");
  await expect(
    page.getByRole("region", {
      name: "Evergreen Rainforest Training",
      exact: true,
    }),
  ).toBeVisible();

  for (const [name, action] of CONCEPTS) {
    await page.getByRole("option", { name, exact: true }).click();
    await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(
      page.getByRole("status", { name: "Workout design action receipt" }),
    ).toContainText(name);
  }

  await page
    .getByRole("button", { name: "Open Exercise Rolodex", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Exercise Rolodex", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close Exercise Rolodex", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Exercise Rolodex", exact: true }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("all 25 worlds stay reachable and overflow-free from 320px through 4K", async ({
  page,
}, testInfo) => {
  await openLab(page);

  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    for (const [name] of CONCEPTS) {
      await page.getByRole("option", { name, exact: true }).click();
      const metrics = await page.evaluate(() => {
        const lab = document.querySelector("main");
        const controls = Array.from(
          lab?.querySelectorAll("button, input") ?? [],
        )
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          });
        return {
          overflow: Math.max(
            0,
            document.documentElement.scrollWidth - window.innerWidth,
          ),
          minControlHeight: Math.min(...controls.map(({ height }) => height)),
        };
      });
      expect(
        metrics.overflow,
        `${name} overflow at ${width}x${height}`,
      ).toBeLessThanOrEqual(2);
      expect(
        metrics.minControlHeight,
        `${name} touch target at ${width}x${height}`,
      ).toBeGreaterThanOrEqual(44);
    }

    if ([320, 1440, 3840].includes(width)) {

      await page.screenshot({
        path: testInfo.outputPath(`workout-design-lab-${width}x${height}.png`),
        fullPage: false,
      });
    }
  }
});
test('all 25 world compositions avoid serious WCAG violations at phone width', async ({ page }) => {
  await openLab(page);
  await page.setViewportSize({ width: 320, height: 780 });
  await page.addScriptTag({ path: AXE_PATH });

  for (const [name] of CONCEPTS) {
    await page.getByRole('option', { name, exact: true }).click();
    const violations = await page.evaluate(async () => {
      type AxeResult = { violations: Array<{ id: string; impact: string | null; nodes: Array<{ target: string[] }> }> };
      const axe = (globalThis as unknown as { axe: { run: (scope: Element) => Promise<AxeResult> } }).axe;
      const scope = document.querySelector('[data-composition]');
      if (!scope) throw new Error('Active workout composition is missing');
      const result = await axe.run(scope);
      return result.violations
        .filter(({ impact }) => impact === 'critical' || impact === 'serious')
        .map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target.join(' ')) }));
    });
    expect(violations, `${name} WCAG violations`).toEqual([]);
  }
});
