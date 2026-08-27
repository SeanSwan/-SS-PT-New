/** @swan/forge — Nav core tests (Phase 2c, hardened in panel round 6). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNavState, getNavAttrs, getNavToggleAttrs, getNavMenuAttrs, getNavLinkAttrs, reduceNav, currentItem } from '../core/nav.mjs';

const items = [{ key: 'home', label: 'Home', href: '/' }, { key: 'progress', label: 'Progress', href: '/progress' }, { key: 'week', label: 'Week', href: '/progress/week' }];

test('nav: variants share one core — same toggle/menu/link contract, different class only', () => {
  for (const variant of ['top', 'side']) {
    const s = getNavState({ id: 'main', variant, items, current: '/progress' });
    assert.equal(getNavAttrs(s).class.includes(`sw-nav--${variant}`), true);
    assert.equal(getNavToggleAttrs(s)['aria-controls'], 'main-menu');
    assert.equal(getNavMenuAttrs(s).id, 'main-menu');
    assert.equal(getNavLinkAttrs(s, items[1])['aria-current'], 'page');
    assert.equal(getNavLinkAttrs(s, items[0])['aria-current'], undefined);
  }
});

test('nav: exactly ONE aria-current — duplicate hrefs and exact-vs-prefix never double-mark (Ox §1)', () => {
  const dupes = [{ key: 'logo', label: 'Swan', href: '/' }, { key: 'home', label: 'Home', href: '/' }];
  const s = getNavState({ items: dupes, current: '/' });
  const marked = dupes.filter((i) => getNavLinkAttrs(s, i)['aria-current'] === 'page');
  assert.equal(marked.length, 1);
  assert.equal(marked[0].key, 'logo', 'first match wins');
});

test('nav: subroutes mark the longest matching parent; root never prefix-matches (GLM N1)', () => {
  const s = getNavState({ items, current: '/progress/week/2' });
  assert.equal(currentItem(s)?.key, 'week', 'longest prefix wins');
  assert.equal(currentItem(getNavState({ items, current: '/progress/other' }))?.key, 'progress');
  assert.equal(currentItem(getNavState({ items, current: '/settings' })), null, 'root "/" does not claim /settings');
  assert.equal(currentItem(getNavState({ items, current: '/progress/other', matchPrefix: false })), null, 'opt-out is exact-only');
});

test('nav: landmark labels default PER VARIANT so a shell never ships two identical landmarks (GLM N2)', () => {
  assert.equal(getNavAttrs(getNavState({ variant: 'top' }))['aria-label'], 'Primary');
  assert.equal(getNavAttrs(getNavState({ variant: 'side' }))['aria-label'], 'Sidebar');
  assert.equal(getNavAttrs(getNavState({}), 'Account')['aria-label'], 'Account');
  assert.equal(getNavToggleAttrs(getNavState({ open: true }))['aria-expanded'], 'true');
});

test('nav: reducer — toggle flips, select closes, Escape closes AND restores focus only when open', () => {
  const s = getNavState({ items, open: true });
  assert.deepEqual(reduceNav(s, { type: 'toggle' }), { open: false, restoreFocus: false });
  assert.deepEqual(reduceNav(s, { type: 'select' }), { open: false, restoreFocus: false });
  assert.deepEqual(reduceNav(s, { type: 'key', key: 'Escape' }), { open: false, restoreFocus: true });
  assert.deepEqual(reduceNav({ ...s, open: false }, { type: 'key', key: 'Escape' }), { open: false, restoreFocus: false });
});

test('nav: item schema carries optional icon/group (UDL grouped rails); hostile input dropped; unknown variant → top', () => {
  const s = getNavState({ id: '<x>', variant: 'weird', items: [{ key: 'ok', href: '/ok', icon: 'star', group: 'Coach' }, { nope: true }, null] });
  assert.equal(s.id, 'sw-nav');
  assert.equal(s.variant, 'top');
  assert.deepEqual(s.items, [{ key: 'ok', label: 'ok', href: '/ok', icon: 'star', group: 'Coach' }]);
});
