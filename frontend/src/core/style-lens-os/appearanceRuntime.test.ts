import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPEARANCE_PROFILE,
  applyAppearanceAttributes,
  buildAppearanceAttributes,
  createAppearanceTransitionCoordinator,
  resolveEffectiveMotionMode,
  resolveLayoutProfile,
  type AppearanceProfile,
  type ViewTransitionLike,
} from '.';

const profile = (
  styleLensId: string,
  motionMode: AppearanceProfile['motionMode'] = 'auto',
): AppearanceProfile => ({
  ...DEFAULT_APPEARANCE_PROFILE,
  styleLensId,
  motionMode,
  updatedAt: '2026-07-11T20:00:00.000Z',
});

describe('appearance runtime', () => {
  it('resolves layout separately from motion capability', () => {
    expect(resolveLayoutProfile(320)).toBe('mobile-minimal');
    expect(resolveLayoutProfile(767)).toBe('mobile-minimal');
    expect(resolveLayoutProfile(768)).toBe('tablet');
    expect(resolveLayoutProfile(1199)).toBe('tablet');
    expect(resolveLayoutProfile(1200)).toBe('desktop-enhanced');

    expect(resolveEffectiveMotionMode('auto', true, true)).toBe('reduced');
    expect(resolveEffectiveMotionMode('auto', false, false)).toBe('off');
    expect(resolveEffectiveMotionMode('off', false, true)).toBe('off');
  });

  it('applies scoped attributes and restores the exact previous values', () => {
    const root = document.createElement('div');
    root.setAttribute('data-style-lens', 'legacy');
    const restore = applyAppearanceAttributes(
      root,
      buildAppearanceAttributes(profile('quiet-meridian'), 320, true, true),
    );

    expect(root.dataset.styleLens).toBe('quiet-meridian');
    expect(root.dataset.layoutProfile).toBe('mobile-minimal');
    expect(root.dataset.motionMode).toBe('reduced');
    expect(root.dataset.density).toBe('comfortable');

    restore();
    expect(root.dataset.styleLens).toBe('legacy');
    expect(root.hasAttribute('data-layout-profile')).toBe(false);
  });

  it('preserves live DOM state while switching appearance', async () => {
    const root = document.createElement('main');
    root.innerHTML = `
      <form><input aria-label="Workout note" /></form>
      <dialog open>Review workout</dialog>
      <div data-active-query="week-12"></div>
    `;
    document.body.appendChild(root);
    const input = root.querySelector('input') as HTMLInputElement;
    const dialog = root.querySelector('dialog');
    const query = root.querySelector('[data-active-query]');
    input.value = 'Keep this unsaved set note';
    input.focus();
    root.scrollTop = 340;

    const coordinator = createAppearanceTransitionCoordinator({
      root,
      getViewportWidth: () => 1440,
      getSystemReducedMotion: () => true,
      getMotionEnabled: () => true,
    });
    await coordinator.transition(profile('quiet-meridian'));

    expect(root.querySelector('input')).toBe(input);
    expect(input.value).toBe('Keep this unsaved set note');
    expect(document.activeElement).toBe(input);
    expect(root.querySelector('dialog')).toBe(dialog);
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(root.querySelector('[data-active-query]')).toBe(query);
    expect(root.scrollTop).toBe(340);
    root.remove();
  });

  it('coalesces queued switches so the last user intent wins', async () => {
    const root = document.createElement('div');
    const finishers: Array<() => void> = [];
    const startViewTransition = (update: () => void): ViewTransitionLike => {
      update();
      return {
        finished: new Promise<void>((resolve) => finishers.push(resolve)),
      };
    };
    const coordinator = createAppearanceTransitionCoordinator({
      root,
      getViewportWidth: () => 1440,
      getSystemReducedMotion: () => false,
      getMotionEnabled: () => true,
      startViewTransition,
    });

    const first = coordinator.transition(profile('quiet-meridian'));
    const superseded = coordinator.transition(profile('blueprint-fold'));
    const final = coordinator.transition(profile('candy-glass-arcade'));

    expect(root.dataset.styleLens).toBe('quiet-meridian');
    finishers.shift()?.();
    await first;
    await superseded;
    await Promise.resolve();
    expect(root.dataset.styleLens).toBe('candy-glass-arcade');
    finishers.shift()?.();
    await final;
    expect(root.dataset.styleLens).toBe('candy-glass-arcade');
  });
});
