/** @swan/forge — headless core tests (button + modal). Zero deps, node:test. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveVariant, getButtonState, getButtonAttrs, canActivate, LEGACY_VARIANT_MAP,
} from '../core/button.mjs';
import {
  getModalState, getModalAttrs, getScrimAttrs, nextTrapIndex, handleModalKey,
} from '../core/modal.mjs';

test('button: every legacy GlowButton alias resolves to a canonical variant', () => {
  for (const [legacy, canonical] of Object.entries(LEGACY_VARIANT_MAP)) {
    assert.equal(resolveVariant(legacy), canonical, `${legacy} → ${canonical}`);
  }
});

test('button: unknown/absent variants fall back to primary (never throw)', () => {
  assert.equal(resolveVariant(undefined), 'primary');
  assert.equal(resolveVariant('nonsense'), 'primary');
});

test('button: prop aliases (theme, colorScheme, isLoading) are honored — GlowButton parity', () => {
  assert.equal(getButtonState({ theme: 'neonBlue' }).variant, 'accent');
  assert.equal(getButtonState({ colorScheme: 'ruby' }).variant, 'danger');
  assert.equal(getButtonState({ isLoading: true }).loading, true);
});

test('button: loading keeps focus (aria-disabled), disabled uses native attribute', () => {
  const loading = getButtonAttrs(getButtonState({ isLoading: true }));
  assert.equal(loading.disabled, undefined);
  assert.equal(loading['aria-disabled'], 'true');
  assert.equal(loading['aria-busy'], 'true');
  const disabled = getButtonAttrs(getButtonState({ disabled: true }));
  assert.equal(disabled.disabled, true);
});

test('button: activation guard blocks loading and disabled', () => {
  assert.equal(canActivate(getButtonState({})), true);
  assert.equal(canActivate(getButtonState({ disabled: true })), false);
  assert.equal(canActivate(getButtonState({ isLoading: true })), false);
});

test('button: class surface is sw-namespaced (D2/A5 interop spec)', () => {
  const attrs = getButtonAttrs(getButtonState({ variant: 'gilded', size: 'large', fullWidth: true }));
  for (const cls of String(attrs.class).split(' ')) {
    assert.ok(cls.startsWith('sw-') || cls.startsWith('is-'), `class "${cls}" breaks the sw- namespace`);
  }
});

test('modal: aria contract is present and variant never changes it (§11.A1)', () => {
  for (const variant of ['dialog', 'drawer']) {
    const attrs = getModalAttrs(getModalState({ open: true, variant }));
    assert.equal(attrs.role, 'dialog');
    assert.equal(attrs['aria-modal'], 'true');
    assert.ok(attrs['aria-labelledby']);
  }
});

test('modal: scrim is aria-hidden and tracks open state', () => {
  assert.equal(getScrimAttrs(getModalState({ open: true }))['data-state'], 'open');
  assert.equal(getScrimAttrs(getModalState({}))['aria-hidden'], 'true');
});

test('modal: focus trap wraps at both ends and handles empty lists', () => {
  assert.equal(nextTrapIndex(2, 3, false), 0, 'Tab from last wraps to first');
  assert.equal(nextTrapIndex(0, 3, true), 2, 'Shift-Tab from first wraps to last');
  assert.equal(nextTrapIndex(-1, 3, false), 0, 'no focus → first');
  assert.equal(nextTrapIndex(-1, 3, true), 2, 'no focus + shift → last');
  assert.equal(nextTrapIndex(0, 0, false), -1, 'empty list → -1');
});

test('modal: keyboard reducer — Escape closes, Tab traps, closed modal inert', () => {
  const open = getModalState({ open: true });
  assert.equal(handleModalKey(open, { key: 'Escape' }).action, 'close');
  assert.equal(handleModalKey(open, { key: 'Tab' }).action, 'trap');
  assert.equal(handleModalKey(open, { key: 'a' }).action, 'none');
  assert.equal(handleModalKey(getModalState({}), { key: 'Escape' }).action, 'none');
});
