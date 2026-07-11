import React from 'react';
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_PROFILE,
  DEFAULT_STYLE_LENS_ID,
  DEFAULT_STYLE_LENS_MANIFEST,
  LAYOUT_PROFILE_IDS,
  STYLE_LENS_SLOTS,
  StyleLensProvider,
  createStyleLensRegistry,
  useStyleLensAppearance,
  type AppearanceProfile,
  type StorageLike,
  type StyleLensManifest,
} from '.';

const quietManifest: StyleLensManifest = {
  ...DEFAULT_STYLE_LENS_MANIFEST,
  id: 'quiet-meridian',
  name: 'Quiet Meridian',
  description: 'Restrained focus-first composition.',
  layoutSignature: 'quiet-meridian',
  fallbackLensId: DEFAULT_STYLE_LENS_ID,
  componentRecipes: Object.fromEntries(
    STYLE_LENS_SLOTS.map((slot) => [slot, 'default-recipe']),
  ) as StyleLensManifest['componentRecipes'],
  layoutProfiles: Object.fromEntries(
    LAYOUT_PROFILE_IDS.map((id) => [
      id,
      { id, slotOrder: [...STYLE_LENS_SLOTS] },
    ]),
  ) as StyleLensManifest['layoutProfiles'],
};

const createStorage = (): StorageLike & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
};

const Probe = () => {
  const appearance = useStyleLensAppearance();
  const target: AppearanceProfile = {
    ...DEFAULT_APPEARANCE_PROFILE,
    styleLensId: 'quiet-meridian',
    updatedAt: '2026-07-11T20:00:00.000Z',
  };
  return (
    <>
      <output data-testid="committed">{appearance.state.committed.styleLensId}</output>
      <output data-testid="preview">{appearance.state.preview?.styleLensId ?? 'none'}</output>
      <button type="button" onClick={() => appearance.beginPreview(target)}>
        Preview
      </button>
      <button type="button" onClick={() => void appearance.commitPreview()}>
        Apply
      </button>
      <button type="button" onClick={appearance.cancelPreview}>
        Cancel
      </button>
      <button
        type="button"
        onClick={() => appearance.setPersistenceSuppressed(true)}
      >
        Suppress
      </button>
    </>
  );
};

describe('StyleLensProvider', () => {
  it('keeps preview isolated until Apply and persists the committed profile', async () => {
    const root = document.createElement('div');
    const storage = createStorage();
    render(
      <StyleLensProvider
        root={root}
        storage={storage}
        sourceId="tab-a"
        registry={createStyleLensRegistry([
          DEFAULT_STYLE_LENS_MANIFEST,
          quietManifest,
        ])}
      >
        <Probe />
      </StyleLensProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByTestId('preview')).toHaveTextContent('quiet-meridian');
    expect(screen.getByTestId('committed')).toHaveTextContent('default-safety');
    expect(root.dataset.styleLens).toBe('default-safety');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    });
    expect(screen.getByTestId('committed')).toHaveTextContent('quiet-meridian');
    expect(root.dataset.styleLens).toBe('quiet-meridian');
    expect(storage.getItem(APPEARANCE_STORAGE_KEY)).toContain('quiet-meridian');
  });

  it('does not persist commits while suppression is active', async () => {
    const storage = createStorage();
    render(
      <StyleLensProvider
        root={document.createElement('div')}
        storage={storage}
        sourceId="tab-a"
        registry={createStyleLensRegistry([
          DEFAULT_STYLE_LENS_MANIFEST,
          quietManifest,
        ])}
      >
        <Probe />
      </StyleLensProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suppress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    });

    expect(screen.getByTestId('committed')).toHaveTextContent('quiet-meridian');
    expect(storage.values.size).toBe(0);
  });
});
