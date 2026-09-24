import { expect, test } from '@playwright/test';
import { admin, json, layoutOf, open, REPLY } from './coachWorkspace.fixtures';

const asks = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: "Today's sessions" }).getByRole('button', { name: /ask swan coach about/i });

test('R2: delayed admission keeps the question until the matching target is ready', async ({ page }) => {
  const composer = await open(page, 1440, 900);
  await page.route('**/api/ai-chat/target-access**', async route => {
    if (new URL(route.request().url()).searchParams.get('targetUserId') === '12') {
      await new Promise(resolve => setTimeout(resolve, 9000));
    }
    return route.fallback();
  });
  await asks(page).first().click();
  await expect(page.locator('.ws-status')).toContainText('waiting for client access');
  await expect(composer).toHaveValue('');
  await expect(composer).toHaveValue(/Prep me for today's .* session/, { timeout: 14000 });
  await expect(page.getByRole('combobox', { name: 'Client this chat is about' })).toHaveValue('12');
});

test('R2: denied admission reports a recovery action and never stages a question', async ({ page }) => {
  const composer = await open(page, 1440, 900);
  await page.route('**/api/ai-chat/target-access**', async route => {
    if (new URL(route.request().url()).searchParams.get('targetUserId') === '12') return json(route, { success: false, error: 'denied' }, 403);
    return route.fallback();
  });
  await asks(page).first().click();
  await expect(page.locator('.ws-status')).toContainText("Couldn't prepare");
  await expect(composer).toHaveValue('');
});

test('R3: Ask cannot turn a session-prep question into a saved client note', async ({ page }) => {
  const composer = await open(page, 1440, 900);
  await page.getByRole('combobox', { name: 'Client this chat is about' }).selectOption('12');
  await expect(page.locator('.ws-status')).toContainText('pinned - new client-bound');
  await composer.fill('/note');
  await composer.press('Enter');
  const note = page.getByRole('combobox', { name: 'Client note' });
  await note.fill('Synthetic note draft');
  const notePosts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/notes/')) notePosts.push(request.url()); });
  await asks(page).first().click();
  await expect(page.locator('.ws-status')).toContainText('Leave client-note mode');
  await expect(note).toHaveValue('Synthetic note draft');
  expect(notePosts).toEqual([]);
});

test('R5: slash-menu Tab navigates without completion or execution', async ({ page }) => {
  const composer = await open(page, 1440, 900);
  await composer.fill('/');
  await composer.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Client this chat is about' })).toBeFocused();
  await expect(composer).toHaveValue('/');
});

test('R2: Ask from existing history can clear its own thread when switching client', async ({ page }) => {
  const composer = await open(page, 1440, 900, { history: true });
  await page.getByRole('button', { name: /Leg day review/ }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('threadId')).toBe('777');
  await asks(page).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('threadId')).toBeNull();
  await expect(composer).toHaveValue(/Prep me for today's .* session/);
});

test('R1: failed history shows cached rows and retry; confirmed empty removes them', async ({ page }) => {
  await open(page, 1440, 900, { history: true });
  await expect(page.getByRole('button', { name: /Leg day review/ })).toBeVisible();
  let unavailable = true;
  await page.route('**/api/ai-chat/conversations?**', route => unavailable
    ? json(route, { success: false, error: 'synthetic unavailable' }, 503)
    : json(route, { success: true, conversations: [] }));
  await page.getByRole('combobox', { name: 'Client this chat is about' }).selectOption('12');
  await expect(page.getByText("Couldn't refresh conversations. Showing the last loaded list.")).toBeVisible();
  await expect(page.getByRole('button', { name: /Leg day review/ })).toBeVisible();
  await expect(page.getByText(/No conversations yet/)).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry conversations' }).click();
  await expect(page.getByRole('button', { name: /Leg day review/ })).toHaveCount(0);
  await expect(page.getByText(/No conversations yet/)).toBeVisible();
});

test('R6: 4K monitor keeps the composer inside the workspace without overflow', async ({ page }, info) => {
  await open(page, 3840, 2160);
  const layout = await layoutOf(page);
  expect(layout.overflowX).toBe(0);
  expect(layout.composerInside).toBe(true);
  expect(layout.sidebarVisible && layout.inspectorVisible).toBe(true);
  await page.screenshot({ path: info.outputPath('workspace-4k.png') });
});

test('trainer route admits the authenticated trainer and sends through the v4 surface', async ({ page }) => {
  const trainer = { ...admin, role: 'trainer' };
  const composer = await open(page, 1440, 900, { user: trainer, path: '/dashboard/trainer/coach-assistant' });
  await composer.fill('hello');
  await composer.press('Enter');
  await expect(page.getByTestId('ws-transcript').getByText(REPLY, { exact: false })).toBeVisible();
});
