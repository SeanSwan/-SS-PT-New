/**
 * Unified Swan Coach (Sean, 2026-09-23): Chat · Today · Floor one click apart,
 * against the real mounted route with a mocked admin session + APIs (ids only).
 *  1. Today (the Day Sheet) reads the master schedule and the session's plan;
 *     "Start in Floor mode" pins the client by id and opens Floor.
 *  2. Floor logs a set heard in the composer ("145 for 6") and "End session"
 *     saves ONCE through POST /api/workout-forms — nothing goes to the coach.
 *  3. Today and Floor never overflow sideways, 320 → 2560.
 */
import { expect, test, type Page } from '@playwright/test';
import { json, open } from './coachWorkspace.fixtures';

async function mockPlan(page: Page) {
  await page.route(/\/api\/workouts\/12\/current/, (route) => json(route, {
    success: true, plan: { title: 'Strength block' },
    dayForDate: { basis: 'plan_day', weekNumber: 6, dayNumber: 1, dayLabel: 'Lower A', exercises: [
      { exerciseName: 'Box squat', sets: 4, targetReps: 6 },
      { exerciseName: 'Step-up', sets: 3, targetReps: 10 },
    ] },
  }));
}

test('Today → Floor → one save: the plan seeds Floor, a spoken set logs, nothing reaches the coach', async ({ page }, info) => {
  const composer = await open(page, 1440, 900);
  await mockPlan(page);
  const chat: string[] = [];
  const saves: unknown[] = [];
  await page.route(/\/api\/ai-chat\/conversations\/\d+\/messages$/, (route) => { chat.push('sent'); return route.abort(); });
  await page.route('**/api/workout-forms', (route) => {
    saves.push(route.request().postDataJSON());
    return json(route, { success: true, form: { id: 901, clientId: 12, date: '2026-09-23' } }, 201);
  });

  await page.getByRole('navigation', { name: 'Coach view' }).getByRole('button', { name: 'Today' }).click();
  const day = page.getByRole('region', { name: 'Your day' });
  await expect(day.getByRole('heading', { level: 1 })).toBeVisible();
  await day.getByRole('region', { name: "Today's sessions" }).getByRole('button', { name: /Avery S\./ }).click();
  await expect(day.getByText('Box squat')).toBeVisible(); // the session's planned workout (Plan Reveal read)
  await page.screenshot({ path: info.outputPath('unified-today-1440.png') });
  await day.getByRole('button', { name: /start in floor mode/i }).click();

  const floor = page.getByRole('region', { name: /Floor mode/ });
  await expect(floor.getByRole('heading', { name: 'Box squat' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Coach view' }).getByRole('button', { name: 'Floor' })).toHaveAttribute('aria-pressed', 'true');
  await composer.fill('145 for 6');
  await floor.getByRole('button', { name: 'Use 145 × 6 for set 1' }).click();
  await expect(composer).toHaveValue('');
  await floor.getByRole('button', { name: 'Save set 1' }).click();
  await expect(floor.getByRole('complementary').getByText('145 × 6')).toBeVisible();
  await composer.fill('150 for 5');
  await composer.press('Enter'); // on Floor a bare set fills the dials — it is not a chat message
  await expect(composer).toHaveValue('');
  await floor.getByRole('button', { name: 'Save set 2' }).click();
  await expect(floor.getByRole('complementary').getByText('145 × 6 · 150 × 5')).toBeVisible();
  await page.screenshot({ path: info.outputPath('unified-floor-1440.png') });

  await floor.getByRole('button', { name: /End session · save 2 sets/ }).click();
  await expect(floor.getByRole('status').filter({ hasText: 'workout log and progress charts' })).toBeVisible();
  expect(saves).toHaveLength(1);
  expect(saves[0]).toMatchObject({ clientId: 12, exercises: [{ exerciseName: 'Box squat', sets: [{ setNumber: 1, weight: 145, reps: 6 }, { setNumber: 2, weight: 150, reps: 5 }] }] });
  expect((saves[0] as { exercises: unknown[] }).exercises).toHaveLength(1);
  expect(chat).toEqual([]); // the set, the name, the save — none of it went to Swan Coach
});

for (const vp of [
  { width: 320, height: 640 }, { width: 375, height: 667 }, { width: 414, height: 896 },
  { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 },
]) {
  test(`Today and Floor fit ${vp.width}x${vp.height} with no sideways scroll`, async ({ page }, info) => {
    await open(page, vp.width, vp.height);
    await mockPlan(page);
    await page.getByRole('combobox', { name: 'Client this chat is about' }).selectOption('12'); // Floor with a real session, dials and all
    const views = page.getByRole('navigation', { name: 'Coach view' });
    await views.getByRole('button', { name: 'Today' }).click();
    await expect(page.getByRole('region', { name: 'Your day' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: info.outputPath(`today-${vp.width}.png`) });
    await views.getByRole('button', { name: 'Floor' }).click();
    await expect(page.getByRole('region', { name: /Floor mode/ }).getByRole('heading', { name: 'Box squat' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() => [...document.querySelectorAll('[data-coach-workspace="v4"] button')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); })
      .map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)));
    expect(small, '44px targets').toEqual([]);
    await page.screenshot({ path: info.outputPath(`floor-${vp.width}.png`) });
  });
}
