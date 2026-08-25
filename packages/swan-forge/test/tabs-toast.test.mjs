/** @swan/forge — Tabs + Toast core tests (Phase 2b). node:test, zero deps. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTabsState, getTabListAttrs, getTabAttrs, getTabPanelAttrs, handleTabKey } from '../core/tabs.mjs';
import { createToast, enqueue, dismiss, setPaused, tick, getToastAttrs, getToastRegionAttrs, handleToastKey } from '../core/toast.mjs';

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

test('tabs: invalid selected falls back to first; hostile ids/keys sanitized', () => {
  assert.equal(getTabsState({ tabs: ['x', 'y'], selected: 'nope' }).selected, 'x');
  assert.equal(getTabsState({ id: '"><img>', tabs: ['x'] }).id, 'sw-tabs');
  assert.equal(getTabAttrs(getTabsState({ tabs: ['a b/c'] }), 'a b/c').id, 'sw-tabs-tab-a_b_c');
});

test('tabs: arrow keys wrap, Home/End jump, automatic activation selects on focus', () => {
  const s = T();
  assert.deepEqual(handleTabKey(s, 'c', { key: 'ArrowRight' }), { focus: 'a', select: 'a', preventDefault: true });
  assert.deepEqual(handleTabKey(s, 'a', { key: 'ArrowLeft' }), { focus: 'c', select: 'c', preventDefault: true });
  assert.equal(handleTabKey(s, 'b', { key: 'Home' }).focus, 'a');
  assert.equal(handleTabKey(s, 'b', { key: 'End' }).focus, 'c');
  assert.equal(handleTabKey(s, 'b', { key: 'Tab' }).preventDefault, false, 'Tab leaves the tablist untouched');
});

test('tabs: manual activation focuses without selecting; Enter/Space select', () => {
  const s = getTabsState({ tabs: ['a', 'b'], selected: 'a', activation: 'manual' });
  assert.deepEqual(handleTabKey(s, 'a', { key: 'ArrowRight' }), { focus: 'b', select: null, preventDefault: true });
  assert.equal(handleTabKey(s, 'b', { key: 'Enter' }).select, 'b');
  assert.equal(handleTabKey(s, 'b', { key: ' ' }).select, 'b');
});

test('tabs: vertical orientation uses Up/Down and ignores Left/Right', () => {
  const s = getTabsState({ tabs: ['a', 'b'], orientation: 'vertical' });
  assert.equal(handleTabKey(s, 'a', { key: 'ArrowDown' }).focus, 'b');
  assert.equal(handleTabKey(s, 'a', { key: 'ArrowRight' }).focus, null);
  assert.equal(getTabListAttrs(s)['aria-orientation'], 'vertical');
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

test('toast: queue is capped (oldest fall off), dedups by id, dismiss removes', () => {
  let q = [];
  for (let i = 0; i < 6; i++) q = enqueue(q, createToast({ id: 't' + i, title: String(i) }), 4);
  assert.deepEqual(q.map((t) => t.id), ['t2', 't3', 't4', 't5']);
  q = enqueue(q, createToast({ id: 't5', title: 'again' }), 4);
  assert.equal(q.filter((t) => t.id === 't5').length, 1);
  assert.equal(dismiss(q, 't3').length, 3);
});

test('toast: a11y — danger/warning are assertive alerts, info/success polite status; Escape dismisses', () => {
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'danger', title: 'x' })).role, 'alert');
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'warning', title: 'x' }))['aria-live'], 'assertive');
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'success', title: 'x' })).role, 'status');
  assert.equal(getToastAttrs(createToast({ id: 'a', tone: 'bogus', title: 'x' })).class.includes('sw-toast--info'), true);
  assert.equal(getToastRegionAttrs()['aria-label'], 'Notifications');
  assert.equal(handleToastKey({ key: 'Escape' }).action, 'dismiss');
});
