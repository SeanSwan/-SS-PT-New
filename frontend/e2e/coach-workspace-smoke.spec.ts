/**
 * v4 Coach Workspace smoke (brain-v4 acceptance gate).
 *
 * Against the real mounted route with a mocked admin session + APIs, proves:
 *  1. typed "hello" → a real coach reply renders in the transcript (C2 stays fixed);
 *  2. the conversation owns the phone viewport (≥ 55% transcript), composer inside it;
 *  3. no horizontal overflow at 375 / 414 / 768 / 1440 / 2560;
 *  4. the header Swan Style Lens changes the layout (data-ws-layout + docking);
 *  5. the header theme changer repaints the workspace (theme var → computed colour);
 *  6. today's sessions from the Universal Master Schedule render in the inspector.
 */
import { expect, test } from '@playwright/test';
import { layoutOf, open, REPLY } from './coachWorkspace.fixtures';

for (const vp of [
  { name: 'se', width: 375, height: 667, minShare: 0.5 },
  { name: 'xr', width: 414, height: 896, minShare: 0.55 },
  { name: 'tablet', width: 768, height: 1024, minShare: 0.5 },
  { name: 'desktop', width: 1440, height: 900, minShare: 0.45 },
  { name: 'qhd', width: 2560, height: 1440, minShare: 0.5 },
]) {
  test(`v4 workspace sends and owns the ${vp.name} viewport (${vp.width}x${vp.height})`, async ({ page }, info) => {
    const composer = await open(page, vp.width, vp.height);
    const before = await layoutOf(page);
    console.log(`[ws-layout ${vp.name}]`, JSON.stringify(before));
    expect(before.layout).toBe('operator-grid');
    expect(before.overflowX, 'no horizontal overflow').toBe(0);
    expect(before.composerInside, 'composer fully inside the viewport').toBe(true);
    expect(before.transcriptShare, `transcript ≥ ${vp.minShare * 100}% of viewport`).toBeGreaterThanOrEqual(vp.minShare);
    expect(before.sidebarVisible).toBe(vp.width >= 768);
    expect(before.inspectorVisible).toBe(vp.width >= 1200);
    expect(before.headerControls, 'header stays quiet (≤ 5 buttons)').toBeLessThanOrEqual(5);

    await composer.fill('hello');
    await composer.press('Enter');
    await expect(page.getByTestId('ws-transcript').getByText(REPLY, { exact: false })).toBeVisible();
    await expect(page.getByTestId('ws-transcript').getByText('message not sent')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`ws-${vp.name}.png`) });
  });
}

test('Universal Master Schedule: today renders in the inspector, open slots excluded', async ({ page }) => {
  await open(page, 1440, 900);
  const today = page.getByRole('list', { name: "Today's sessions" });
  await expect(today.getByText('Avery S.')).toBeVisible();
  await expect(today.getByText('Jordan L.')).toBeVisible();
  await expect(today.locator('li')).toHaveCount(2);
  await today.getByRole('button', { name: /ask swan coach about the/i }).first().click();
  // Avery (id 12) is in the pin list: the chat is scoped to her, then the prompt lands (it used to be wiped).
  await expect(page.getByRole('combobox', { name: 'Client this chat is about' })).toHaveValue('12');
  await expect(page.getByRole('combobox', { name: /message swan coach/i })).toHaveValue(/Prep me for today's .* session/);
  await expect(page.getByRole('combobox', { name: /message swan coach/i })).not.toHaveValue(/Avery|Stone/);
});

test('"No client (general)" really unpins a staff chat (the stale pin was restored into the URL)', async ({ page }) => {
  await open(page, 1440, 900);
  const scope = page.getByRole('combobox', { name: 'Client this chat is about' });
  await scope.selectOption('12');
  await expect.poll(() => new URL(page.url()).searchParams.get('clientId')).toBe('12');
  await scope.selectOption('');
  await expect.poll(() => new URL(page.url()).searchParams.get('clientId')).toBeNull();
  await expect(scope).toHaveValue('');
});

test('Ask on a slot whose client is not pinnable never preps inside another client\'s chat (review #8)', async ({ page }) => {
  const composer = await open(page, 1440, 900);
  const scope = page.getByRole('combobox', { name: 'Client this chat is about' });
  await scope.selectOption('12');
  const today = page.getByRole('list', { name: "Today's sessions" });
  await today.getByRole('button', { name: /ask swan coach about the/i }).nth(1).click(); // Jordan (14): not in the pin list
  await expect(scope).toHaveValue('');
  await expect(composer).toHaveValue(/Prep me for today's .* session/);
  await expect(composer).not.toHaveValue(/Jordan|Lee/);
});

for (const lens of [
  { id: 'quiet-meridian', layout: 'editorial-column', sidebar: false, inspector: false },
  { id: 'split-horizon', layout: 'atrium-split', sidebar: false, inspector: true },
  { id: 'glass-rail', layout: 'playfield-stack', sidebar: false, inspector: false },
  { id: 'aurora-console', layout: 'operator-grid', sidebar: true, inspector: true },
]) {
  test(`Style Lens ${lens.id} → ${lens.layout}`, async ({ page }, info) => {
    await open(page, 1440, 900, { lens: lens.id });
    await expect(page.locator('[data-coach-workspace="v4"]')).toHaveAttribute('data-ws-layout', lens.layout);
    const state = await layoutOf(page);
    expect(state.overflowX).toBe(0);
    expect(state.sidebarVisible).toBe(lens.sidebar);
    expect(state.inspectorVisible).toBe(lens.inspector);
    await page.screenshot({ path: info.outputPath(`ws-lens-${lens.id}.png`) });
  });
}

test('header theme changer repaints the workspace (no hardcoded colour survives)', async ({ page }) => {
  await open(page, 1440, 900);
  const read = () => page.evaluate(() => getComputedStyle(document.querySelector('.ws-composer-card') as Element).backgroundColor);
  const before = await read();
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = ':root { --bg-elevated: rgb(10, 120, 60) !important; }';
    document.head.appendChild(style);
  });
  await expect.poll(read).toBe('rgb(10, 120, 60)');
  expect(before).not.toBe('rgb(10, 120, 60)');
});

test('the thread list is a sheet on phones and closes with Escape', async ({ page }) => {
  await open(page, 414, 896);
  // exact: the sheet's own "Close conversations" is a real, exposed control now (review #1).
  const toggle = page.getByRole('button', { name: 'Conversations', exact: true });
  await toggle.click();
  await expect.poll(async () => (await layoutOf(page)).sidebarVisible).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await layoutOf(page)).sidebarVisible).toBe(false);
  await expect(toggle).toBeFocused();
});

test('threads: history on landing, pick a thread, New chat, and a SECOND chat still sends', async ({ page }) => {
  const composer = await open(page, 1440, 900, { history: true });
  const sidebar = page.getByRole('navigation', { name: 'Coach conversations' });
  // Landing with history: the admitted list renders without sending anything first.
  await expect(sidebar.getByRole('button', { name: /Leg day review/ })).toBeVisible();
  // Hostile review #3: staff land on a NEW chat. A highlighted thread whose history
  // the admission refuses to load is a lie; nothing is marked current until picked.
  await page.waitForTimeout(800);
  await expect(sidebar.getByRole('button', { name: /Leg day review/ })).not.toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('heading', { name: /What do you need/ })).toBeVisible();

  await sidebar.getByRole('button', { name: /Leg day review/ }).click();
  const transcript = page.getByTestId('ws-transcript');
  await expect(transcript.getByText('Squat top set moved well', { exact: false })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: /Leg day review/ })).toHaveAttribute('aria-current', 'true');

  await sidebar.getByRole('button', { name: 'New chat' }).click();
  await expect(transcript.getByText('Squat top set moved well', { exact: false })).toHaveCount(0);
  await expect(sidebar.getByRole('button', { name: /Leg day review/ }), 'New chat keeps the history listed').toBeVisible();

  await composer.fill('first');
  await composer.press('Enter');
  await expect(transcript.getByText(`${REPLY} (#501)`)).toBeVisible();

  await sidebar.getByRole('button', { name: 'New chat' }).click();
  await composer.fill('second');
  await composer.press('Enter');
  await expect(transcript.getByText(`${REPLY} (#502)`), 'the second chat is not refused').toBeVisible();
  await expect(transcript.getByText('message not sent')).toHaveCount(0);
});

test('a failed client-note save is visible in the workspace (review #5)', async ({ page }) => {
  const composer = await open(page, 1440, 900);
  await page.getByRole('combobox', { name: 'Client this chat is about' }).selectOption('12');
  await composer.fill('/note');
  await composer.press('Enter');
  const note = page.getByRole('combobox', { name: 'Client note' });
  await expect(note).toBeVisible();
  await note.fill('Left knee felt fine on split squats.');
  await note.press('Enter');
  const status = page.locator('.ws-status');
  await expect(status).toContainText('Client note was not saved');
  await expect(status).toHaveAttribute('data-tone', 'warn');
  await expect(note, 'the draft stays in the composer').toHaveValue('Left knee felt fine on split squats.');
});

test('More coach tools is a real modal: focus stays in, the workspace behind is inert (review #7)', async ({ page }) => {
  await open(page, 1440, 900);
  const more = page.getByRole('button', { name: 'More coach tools' });
  await more.click();
  const dialog = page.getByRole('dialog', { name: 'Coach tools' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => (document.querySelector('[data-coach-workspace="v4"]') as HTMLElement & { inert?: boolean }).inert)).toBe(true);
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"][aria-label="Coach tools"]'))), `focus left the sheet at step ${i}`).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(more).toBeFocused();
  expect(await page.evaluate(() => (document.querySelector('[data-coach-workspace="v4"]') as HTMLElement & { inert?: boolean }).inert)).toBe(false);
});
