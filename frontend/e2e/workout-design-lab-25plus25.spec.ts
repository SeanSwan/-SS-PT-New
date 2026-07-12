/**
 * Workout Design Lab 25+25 browser gate.
 * Verifies real Style Lens application, bounded comparison, and responsive mode ergonomics.
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { PROMOTED_LENSES } from "./style-lens-promoted";

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
  [414, 896],
  [768, 1024],
  [1440, 900],
  [2560, 1440],
  [3840, 2160],
] as const;

const jwt = () => {
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
};

const json = async (route: Route, body: unknown) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const openLab = async (page: Page) => {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.clear();
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard/admin/workout-design-lab", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: /25 Worlds.*25 Styles\. One session\./,
    }),
  ).toBeVisible();
};

test("Style and Compare modes expose 25+25 without multiplying pages", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  await openLab(page);

  await page.getByRole("tab", { name: "Style", exact: true }).click();
  const stylePicker = page.getByRole("listbox", { name: "Choose a Style Lens" });
  await expect(stylePicker.getByRole("option")).toHaveCount(25);
  for (const [name] of PROMOTED_LENSES) {
    await expect(
      stylePicker.getByRole("option", {
        name: `${name} style lens`,
        exact: true,
      }),
    ).toBeAttached();
  }

  await stylePicker
    .getByRole("option", { name: "Blueprint Fold style lens", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply Blueprint Fold", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-style-lens",
    "blueprint-fold",
  );

  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  const comparison = page.getByRole("region", {
    name: "World and Style comparison",
  });
  await expect(comparison.getByTestId("comparison-panel")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Compare workout world" })
    .selectOption("swiss-precision-lab");
  await expect(
    page.getByRole("region", { name: "Swiss Precision Lab", exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

test("all three modes stay overflow-free with 44px controls from 320px to 4K", async ({
  page,
}, testInfo) => {
  await openLab(page);
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    for (const mode of ["World", "Style", "Compare"] as const) {
      await page.getByRole("tab", { name: mode, exact: true }).click();
      const metrics = await page.evaluate(() => {
        const controls = Array.from(
          document.querySelectorAll("main button, main input, main select"),
        )
          .map((element) => element.getBoundingClientRect())
          .filter(({ width: controlWidth, height: controlHeight }) =>
            controlWidth > 0 && controlHeight > 0,
          );
        return {
          overflow: Math.max(
            0,
            document.documentElement.scrollWidth - window.innerWidth,
          ),
          minControlHeight: Math.min(...controls.map(({ height: controlHeight }) => controlHeight)),
        };
      });
      expect(metrics.overflow, `${mode} overflow at ${width}x${height}`).toBeLessThanOrEqual(2);
      expect(metrics.minControlHeight, `${mode} target at ${width}x${height}`).toBeGreaterThanOrEqual(44);
    }
    if ([320, 1440, 3840].includes(width)) {
      await page.screenshot({
        path: testInfo.outputPath(`workout-design-lab-25plus25-compare-${width}x${height}.png`),
        fullPage: false,
      });
      await page.getByRole("tab", { name: "Style", exact: true }).click();
      await page.screenshot({
        path: testInfo.outputPath(`workout-design-lab-25plus25-style-${width}x${height}.png`),
        fullPage: false,
      });
    }
  }
});
