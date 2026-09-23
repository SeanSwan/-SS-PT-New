/**
 * v4 Coach Workspace — CLIENT mode (brain-v4 hostile review #13: the v4 surface
 * had no client-mode proof). A signed-in client gets the same one-and-only
 * surface, without staff controls, sends through the unbound chat lane, and sees
 * only their own session from the Universal Master Schedule.
 */
import { expect, test } from '@playwright/test';
import { admin, open, REPLY } from './coachWorkspace.fixtures';

const client = { ...admin, id: 12, email: 'qa.client@swanstudios.local', username: 'qa_client', firstName: 'Avery', lastName: 'QA', role: 'client' };

test('client mode: no staff controls, a send replies, and only their own session shows', async ({ page }) => {
  const composer = await open(page, 414, 896, { user: client, path: '/dashboard/client/coach-assistant' });
  await expect(composer).toHaveAttribute('placeholder', 'Ask your coach…');
  await expect(page.getByRole('combobox', { name: 'Client this chat is about' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Review/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'More coach tools' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'What are we training today?' })).toBeVisible();

  await composer.fill('hello');
  await composer.press('Enter');
  await expect(page.getByTestId('ws-transcript').getByText(REPLY, { exact: false })).toBeVisible();
  await expect(page.getByTestId('ws-transcript').getByText('message not sent')).toHaveCount(0);

  await page.getByRole('button', { name: 'Context and schedule' }).click();
  const today = page.getByRole('list', { name: "Today's sessions" });
  await expect(today.locator('li'), 'a client sees their own session, not the studio').toHaveCount(1);
});
