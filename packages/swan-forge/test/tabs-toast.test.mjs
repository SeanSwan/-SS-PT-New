/** @swan/forge — Tabs + Toast core tests (Phase 2b, hardened in panel round 6). node:test, zero deps. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTabsState, getTabListAttrs, getTabAttrs, getTabPanelAttrs, handleTabKey, selectTab } from '../core/tabs.mjs';
import { createToast, enqueue, dismiss, dismissWithFocus, setPaused, tick, getToastAttrs, getToastRegionAttrs, handleToastKey } from '../core/toast.mjs';

const T = () => getTabsState({ id: 'demo', tabs: ['a', 'b', 'c'], selected: 'b' });

test('tabs: roving tabindex — only the selected tab is in the tab order; panels hide from a11y tree', () => {
  const s = T();
  assert.equal(getTabAttrs(s, 'b').tabindex, '0');
  assert.equal(getTabAttrs(s, 'a').tabindex, '-1');
  assert.equal(getTabAttrs(s, 'b')['aria-selected'], 'true');
  assert.equal(getTabPanelAttrs(s, 'a').hidden, true);
  assert.equal(getTabPanelAttrs(s, 'b').hidden, undefined);
  assert.equal(getTabPanelAttrs(s, 'b')['aria-labelledby'], getTabAttrs(s, 'b').id);
  assert.equal(getTabAttrs(s, 'b')['aria-controls'], getTabPanelAttrs(s, 'b').id);
  assert.equal(getTabListAttrs(s).role, 'tablist');
});

test('tabs: invalid selected falls back to first; hostile ids/keys sanitized; colliding keys REJECTED (GLM T1)', () => {
  assert.equal(getTabsState({ tabs: ['x', 'y'], selected: 'nope' }).selected, 'x');
  assert.equal(getTabsState({ id: '"><img>', tabs: ['x'] }).id, 'sw-tabs');
  assert.equal(getTabAttrs(getTabsState({ tabs: ['a b/c'] }), 'a b/c').id, 'sw-tabs-tab-a_b_c');
  assert.throws(() => getTabsState({ tabs: ['a b', 'a_b'] }), /collide after id sanitization/);
});

test('tabs: selectTab is the single selection reducer (click + keyboard end here); pill variant via the attr map (GLM T2/T3)', () => {
  const s = T();
  assert.equal(selectTab(s, 'c').selected, 'c');
  assert.equal(selectTab(s, 'zzz').selected, 'b', 'unknown key ignored');
  assert.equal(handleTabKey(s, 'b', { key: 'Enter' }).preventDefault, false, 'Enter is left to the native button click');
  assert.ok(getTabListAttrs(getTabsState({ tabs: ['a'], variant: 'pill' })).class.includes('sw-tabs--pill'));
});

test('tabs: arrow keys wrap, Home/End jump, automatic activation selects on focus', () => {
  const s = T();
  assert.deepEqual(handleTabKey(s, 'c', { key: 'ArrowRight' }), { focus: 'a', select: 'a', preventDefault: true });
  assert.deepEqual(handleTabKey(s, 'a', { key: 'ArrowLeft' }), { focus: 'c', select: 'c', preventDefault: true });
  assert.equal(handleTabKey(s, 'b', { key: 'Home' }).focus, 'a');
  assert.equal(handleTabKey(s, 'b', { key: 'End' }).focus, 'c');
  assert.equal(handleTabKey(s, 'b', { key: 'Tab' }).preventDefault, false, 'Tab leaves the tablist untouched');
});

test('tabs: manual activation focuses without selecting; vertical uses Up/Down', () => {
  const s = getTabsState({ tabs: ['a', 'b'], selected: 'a', activation: 'manual' });
  assert.deepEqual(handleTabKey(s, 'a', { key: 'ArrowRight' }), { focus: 'b', select: null, preventDefault: true });
  const v = getTabsState({ tabs: ['a', 'b'], orientation: 'vertical' });
  assert.equal(handleTabKey(v, 'a', { key: 'ArrowDown' }).focus, 'b');
  assert.equal(handleTabKey(v, 'a', { key: 'ArrowRight' }).focus, null);
  assert.equal(getTabListAttrs(v)['aria-orientation'], 'vertical');
});

test('toast: danger is sticky by default, others expire; paused toasts never tick down', () => {
  const info = createToast({ id: 'i', title: 'Saved' });
  const danger = createToast({ id: 'd', tone: 'danger', title: 'Failed' });
  assert.equal(info.ttl, 6000);
  assert.equal(danger.ttl, 0);
  let q = enqueue(enqueue([], info), danger);
  q = setPaused(q, 'i', true);
  let r = tick(q, 10000);
  assert.deepEqual(r.expired, [], 'paused info + sticky danger survive');
  q = setPaused(r.queue, 'i', false);
  r = tick(q, 6000);
  assert.deepEqual(r.expired, ['i']);
  assert.equal(r.queue.length, 1);
});

test('toast: cap evicts oldest EXPIRING toast; a sticky danger is EVICTION-IMMUNE (GLM T4 / Ox #1)', () => {
  let q = enqueue([], createToast({ id: 'd', tone: 'danger', title: 'unread error' }));
  for (let i = 0; i < 5; i++) q = enqueue(q, createToast({ id: 'i' + i, title: String(i) }), 4);
  assert.ok(q.some((t) => t.id === 'd'), 'sticky danger survives a 5-toast info burst');
  assert.equal(q.length, 4);
  assert.deepEqual(q.map((t) => t.id), ['d', 'i2', 'i3', 'i4']);
  let all = [];
  for (let i = 0; i < 6; i++) all = enqueue(all, createToast({ id: 'e' + i, tone: 'danger', title: 'x' }), 4);
  assert.equal(all.length, 6, 'only-sticky queue exceeds the cap rather than losing an error');
});

test('toast: dedupes by id, dismiss removes, dismissWithFocus names the next focus target (GLM T5)', () => {
  let q = [];
  for (let i = 0; i < 3; i++) q = enqueue(q, createToast({ id: 't' + i, title: String(i) }));
  q = enqueue(q, createToast({ id: 't2', title: 'again' }));
  assert.equal(q.filter((t) => t.id === 't2').length, 1);
  assert.equal(dismiss(q, 't1').length, 2);
  assert.equal(dismissWithFocus(q, 't1').focusNext, 't2', 'next in order');
  assert.equal(dismissWithFocus(q, 't2').focusNext, 't1', 'last → previous');
  assert.equal(dismissWithFocus([q[0]], 't0').focusNext, 'region', 'nothing left → region');
});

test('toast: a11y — danger/warning assertive alerts, info/success polite status; focusable; Escape targets the FOCUSED id', () => {
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'danger', title: 'x' })).role, 'alert');
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'warning', title: 'x' }))['aria-live'], 'assertive');
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'success', title: 'x' })).role, 'status');
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'bogus', title: 'x' })).class.includes('sw-toast--info'), true);
  assert.equal(getToastAttrs(createToast({ id: 'a', title: 'x' })).tabindex, '0', 'keyboard users can pause/dismiss');
  assert.equal(getToastRegionAttrs()['aria-label'], 'Notifications');
  assert.deepEqual(handleToastKey({ key: 'Escape' }, 't9'), { action: 'dismiss', id: 't9' });
  assert.equal(handleToastKey({ key: 'Escape' }, null).action, 'none', 'no focused toast → nothing to dismiss');
});
