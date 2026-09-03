import { test, expect } from '@playwright/test';
import { admitted, admittedType, immortal } from './helpers.js';

/**
 * Slice 5 acceptance: a round you can lose, and go again.
 *
 * The unit tests prove the round RULES. This proves the loop is wired end to end: damage reaches
 * the HUD, death shows a screen, and restart genuinely resets rather than just hiding the overlay.
 */
test('the round starts with full hp on wave 1', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('hud-wave')).toHaveText('Wave: 1');
  await expect(page.getByTestId('hud-hp')).toHaveText('HP: 3');
  await expect(page.getByTestId('gameover')).toHaveCount(0);
});

test('a round ends when the DIRECTOR is spent — killing everyone on screen is not enough', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await admitted(page);
  await immortal(page);

  // TEST-DELTA (S6b): "kill everything on the board and the wave advances" described the RING
  // spawner, where the board WAS the wave. With windows, most of a round is still queued outside;
  // an empty room mid-round is just a player who is winning. So this now proves the rule that
  // replaced it — one machine: the round ends when the budget is spent AND nothing holds it open.
  const midRound = await page.evaluate(() => {
    const store = window.__swanGameStore;
    store.setState({ enemies: [] });          // an empty ROOM...
    return { wave: store.getState().wave, owed: store.getState().director.budgetLeft };
  });
  expect(midRound.owed, 'the round still owes monsters').toBeGreaterThan(0);
  await page.waitForTimeout(400);
  await expect(page.getByTestId('hud-wave')).toHaveText(`Wave: ${midRound.wave}`, { timeout: 5_000 });

  // ...and now spend the budget too. THAT is a cleared round.
  await page.evaluate(() => {
    const store = window.__swanGameStore;
    store.setState({ enemies: [], director: { ...store.getState().director, budgetLeft: 0 } });
  });
  await expect(page.getByTestId('hud-wave')).toHaveText(`Wave: ${midRound.wave + 1}`, { timeout: 10_000 });

  // And the next round owes MORE than the one before it — the curve is still a curve.
  const owedNext = await page.evaluate(() => window.__swanGameStore.getState().director.budgetLeft);
  expect(owedNext, 'wave 2 owes more than wave 1 did').toBeGreaterThan(midRound.owed);
});

test('losing all hp ends the round, and Go again really resets it', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanRound, null, { timeout: 20_000 });

  // Kill the player by putting an enemy on top of them, repeatedly. The invulnerability window
  // means this takes a moment of real time — which is the point of that window.
  await page.evaluate(() => {
    const store = window.__swanGameStore;
    const player = window.__swanPlayerPos;
    for (const e of store.getState().enemies) { e.x = player.x; e.z = player.z; }
  });

  await expect(page.getByTestId('gameover')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('hud-hp')).toHaveText('HP: 0');

  await page.getByTestId('restart').click();

  await expect(page.getByTestId('gameover')).toHaveCount(0);
  await expect(page.getByTestId('hud-hp')).toHaveText('HP: 3');
  await expect(page.getByTestId('hud-wave')).toHaveText('Wave: 1');
  await expect(page.getByTestId('hud-kills')).toHaveText('Kills: 0');
  // TEST-DELTA (S6b): a restart re-arms the MACHINES rather than conjuring a board. The old
  // assertion ("restart must respawn a wave") guarded against an empty board instantly advancing
  // the wave — a hazard that no longer exists, because a round now ends on the DIRECTOR and an
  // empty board owes its whole budget. So the guarantee is checked where it actually lives.
  const owed = await page.evaluate(() => window.__swanGameStore.getState().director.budgetLeft);
  expect(owed, 'a fresh run owes a full round of monsters').toBeGreaterThan(0);
  // And they really do arrive.
  await admitted(page);

  // The barricades are checked against a DIRECT reset, not the button: between clicking and
  // reading, the director can legitimately release a monster that tears a panel — so a
  // timing-sensitive "panels === 5" was testing the machine's load, not the reset. The button's
  // job (hp, wave, kills, a live round) is asserted above; the state claim is asserted here.
  const whole = await page.evaluate(() => {
    window.__swanGameStore.getState().reset();
    return Object.values(window.__swanGameStore.getState().windows).every((w) => w.panels === 5);
  });
  expect(whole, 'a reset restores every barricade').toBe(true);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
