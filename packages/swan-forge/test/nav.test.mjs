/** @swan/forge — Nav core tests (Phase 2c). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNavState, getNavAttrs, getNavToggleAttrs, getNavMenuAttrs, getNavLinkAttrs, reduceNav } from '../core/nav.mjs';

const items = [{ key: 'home', label: 'Home', href: '/' }, { key: 'progress', label: 'Progress', href: '/progress' }];

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

test('nav: aria-expanded tracks open; landmark label is required and defaults to Primary', () => {
  const closed = getNavState({ items });
  assert.equal(getNavToggleAttrs(closed)['aria-expanded'], 'false');
  assert.equal(getNavToggleAttrs({ ...closed, open: true })['aria-expanded'], 'true');
  assert.equal(getNavAttrs(closed)['aria-label'], 'Primary');
  assert.equal(getNavAttrs(closed, 'Account')['aria-label'], 'Account');
});

test('nav: reducer — toggle flips, select closes, Escape closes AND restores focus only when open', () => {
  const s = getNavState({ items, open: true });
  assert.deepEqual(reduceNav(s, { type: 'toggle' }), { open: false, restoreFocus: false });
  assert.deepEqual(reduceNav(s, { type: 'select' }), { open: false, restoreFocus: false });
  assert.deepEqual(reduceNav(s, { type: 'key', key: 'Escape' }), { open: false, restoreFocus: true });
  assert.deepEqual(reduceNav({ ...s, open: false }, { type: 'key', key: 'Escape' }), { open: false, restoreFocus: false });
  assert.deepEqual(reduceNav(s, { type: 'key', key: 'a' }), { open: true, restoreFocus: false });
});

test('nav: hostile input — bad items dropped, id sanitized, unknown variant → top', () => {
  const s = getNavState({ id: '<x>', variant: 'weird', items: [{ key: 'ok', href: '/ok' }, { nope: true }, null] });
  assert.equal(s.id, 'sw-nav');
  assert.equal(s.variant, 'top');
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].label, 'ok');
});
